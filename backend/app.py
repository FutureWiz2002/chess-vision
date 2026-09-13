from io import BytesIO
from dataclasses import dataclass, field
import json
import logging
import os
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image


MODEL_PATH = Path(__file__).with_name("best.onnx")
IMAGE_SIZE = 640
CONFIDENCE_THRESHOLD = 0.25
IOU_THRESHOLD = 0.45

DEFAULT_ALLOWED_ORIGINS = {
    "https://chess-vision-delta.vercel.app",
}
ALLOWED_ORIGINS = sorted(
    DEFAULT_ALLOWED_ORIGINS
    | {
        origin.strip().rstrip("/")
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    }
)

PIECE_MAP = {
    0: "Q",
    1: "K",
    2: "P",
    3: "N",
    4: "B",
    5: "q",
    6: "k",
    7: "p",
    8: "n",
    9: "b",
    10: "R",
    11: "r",
}


@dataclass
class CastlingRights:
    white_kingside: bool = True
    white_queenside: bool = True
    black_kingside: bool = True
    black_queenside: bool = True

    def to_fen(self):
        rights = ""
        if self.white_kingside:
            rights += "K"
        if self.white_queenside:
            rights += "Q"
        if self.black_kingside:
            rights += "k"
        if self.black_queenside:
            rights += "q"
        return rights or "-"


@dataclass
class PositionMetadata:
    who_to_move: str = "w"
    castling_rights: CastlingRights = field(default_factory=CastlingRights)
    en_passant: str = "-"

    def to_fen_suffix(self):
        return f"{self.who_to_move} {self.castling_rights.to_fen()} {self.en_passant} 0 1"


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chess-vision.backend")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Loading ONNX model from %s", MODEL_PATH)
ort_session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
input_name = ort_session.get_inputs()[0].name
output_names = [output.name for output in ort_session.get_outputs()]
logger.info(
    "ONNX Runtime ready. input=%s outputs=%s providers=%s",
    input_name,
    output_names,
    ort_session.get_providers(),
)


@app.get("/")
@app.post("/")
def home():
    return "He sacked THE ROOOKKKK!!!!"


@app.post("/vision")
async def vision(
    imageFile: UploadFile = File(...),
    whotomove: str = Form("w"),
    castling: str = Form("{}"),
    enpassant: str = Form("-"),
):
    try:
        position_metadata = parse_position_metadata(
            whotomove=whotomove,
            castling=castling,
            enpassant=enpassant,
        )
        image_bytes = await imageFile.read()
        logger.info(
            "POST /vision received file name=%s content_type=%s bytes=%s metadata=%s",
            imageFile.filename,
            imageFile.content_type,
            len(image_bytes),
            position_metadata,
        )

        image, scale, pad_x, pad_y, original_width, original_height = preprocess_image(
            image_bytes
        )
        logger.info(
            "Preprocessed image original=%sx%s input_shape=%s scale=%.4f pad=(%.1f, %.1f)",
            original_width,
            original_height,
            image.shape,
            scale,
            pad_x,
            pad_y,
        )

        output = ort_session.run(None, {input_name: image})[0]
        logger.info("ONNX inference complete output_shape=%s", output.shape)

        detections = postprocess_detections(
            output,
            scale=scale,
            pad_x=pad_x,
            pad_y=pad_y,
            original_width=original_width,
            original_height=original_height,
        )
        logger.info("Postprocess complete detections=%s", len(detections))

        board = detections_to_board(detections)
        board_fen = board_to_fen(board)
        full_fen = f"{board_fen} {position_metadata.to_fen_suffix()}"
        link_fen = full_fen.replace(" ", "_")
        link = f"lichess.org/analysis/standard/{link_fen}"
        logger.info("Generated FEN=%s link=%s", full_fen, link)

        return {"link": link}
    except Exception as exc:
        logger.exception("POST /vision failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def parse_position_metadata(whotomove, castling, enpassant):
    who_to_move = whotomove if whotomove in {"w", "b"} else "w"
    en_passant = enpassant if is_valid_en_passant(enpassant) else "-"

    try:
        castling_data = json.loads(castling or "{}")
    except json.JSONDecodeError:
        logger.warning("Invalid castling payload. castling=%s", castling)
        castling_data = {}

    return PositionMetadata(
        who_to_move=who_to_move,
        castling_rights=CastlingRights(
            white_kingside=bool(castling_data.get("whiteKingside", False)),
            white_queenside=bool(castling_data.get("whiteQueenside", False)),
            black_kingside=bool(castling_data.get("blackKingside", False)),
            black_queenside=bool(castling_data.get("blackQueenside", False)),
        ),
        en_passant=en_passant,
    )


def is_valid_en_passant(value):
    if value == "-":
        return True
    if len(value) != 2:
        return False
    return value[0] in "abcdefgh" and value[1] in "36"


def preprocess_image(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    original_width, original_height = image.size

    scale = min(IMAGE_SIZE / original_width, IMAGE_SIZE / original_height)
    resized_width = int(round(original_width * scale))
    resized_height = int(round(original_height * scale))
    resized = image.resize((resized_width, resized_height), Image.Resampling.BILINEAR)

    pad_x = (IMAGE_SIZE - resized_width) / 2
    pad_y = (IMAGE_SIZE - resized_height) / 2

    canvas = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), (114, 114, 114))
    canvas.paste(resized, (int(round(pad_x)), int(round(pad_y))))

    input_array = np.asarray(canvas, dtype=np.float32) / 255.0
    input_array = np.transpose(input_array, (2, 0, 1))
    input_array = np.expand_dims(input_array, axis=0)

    return input_array, scale, pad_x, pad_y, original_width, original_height


def postprocess_detections(
    output,
    scale,
    pad_x,
    pad_y,
    original_width,
    original_height,
):
    predictions = np.squeeze(output)
    if predictions.ndim != 2:
        return []

    if predictions.shape[0] < predictions.shape[1]:
        predictions = predictions.T

    boxes = predictions[:, :4]
    class_scores = predictions[:, 4:]
    classes = np.argmax(class_scores, axis=1)
    confidences = np.max(class_scores, axis=1)

    keep = confidences >= CONFIDENCE_THRESHOLD
    boxes = boxes[keep]
    classes = classes[keep]
    confidences = confidences[keep]

    if len(boxes) == 0:
        return []

    boxes = xywh_to_xyxy(boxes)
    boxes[:, [0, 2]] = (boxes[:, [0, 2]] - pad_x) / scale
    boxes[:, [1, 3]] = (boxes[:, [1, 3]] - pad_y) / scale
    boxes[:, [0, 2]] = np.clip(boxes[:, [0, 2]], 0, original_width)
    boxes[:, [1, 3]] = np.clip(boxes[:, [1, 3]], 0, original_height)

    selected_indices = nms(boxes, confidences, IOU_THRESHOLD)

    detections = []
    for index in selected_indices:
        x1, y1, x2, y2 = boxes[index]
        detections.append(
            {
                "class_id": int(classes[index]),
                "confidence": float(confidences[index]),
                "x_center": ((x1 + x2) / 2) / original_width,
                "y_center": ((y1 + y2) / 2) / original_height,
            }
        )

    return detections


def xywh_to_xyxy(boxes):
    converted = boxes.copy()
    converted[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    converted[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    converted[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    converted[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    return converted


def nms(boxes, scores, iou_threshold):
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]

    areas = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    order = scores.argsort()[::-1]
    keep = []

    while order.size > 0:
        current = order[0]
        keep.append(current)

        xx1 = np.maximum(x1[current], x1[order[1:]])
        yy1 = np.maximum(y1[current], y1[order[1:]])
        xx2 = np.minimum(x2[current], x2[order[1:]])
        yy2 = np.minimum(y2[current], y2[order[1:]])

        intersection_width = np.maximum(0, xx2 - xx1)
        intersection_height = np.maximum(0, yy2 - yy1)
        intersection = intersection_width * intersection_height

        union = areas[current] + areas[order[1:]] - intersection
        iou = np.divide(intersection, union, out=np.zeros_like(intersection), where=union > 0)

        order = order[np.where(iou <= iou_threshold)[0] + 1]

    return keep


def detections_to_board(detections):
    board = [["-"] * 8 for _ in range(8)]

    for detection in detections:
        col = min(7, max(0, int(detection["x_center"] * 8)))
        row = min(7, max(0, int(detection["y_center"] * 8)))
        board[row][col] = PIECE_MAP[detection["class_id"]]

    return board


def board_to_fen(state):
    fen_string = ""
    empty_count = 0

    for row in state:
        for square in row:
            if square != "-":
                if empty_count > 0:
                    fen_string += str(empty_count)
                    empty_count = 0
                fen_string += square
            else:
                empty_count += 1
        if empty_count > 0:
            fen_string += str(empty_count)
            empty_count = 0
        fen_string += "/"

    return fen_string[:-1]
