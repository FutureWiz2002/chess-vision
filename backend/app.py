# This file is responsible for handling the backend API calls
# build with ❤️ using Flask

from flask import Flask, request, jsonify
from ultralytics import YOLO
import requests
from flask_cors import CORS
import os

# Load the model
app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():
    return "He sacked THE ROOOKKKK!!!!"

@app.route("/vision", methods=["GET", "POST"])
def vision():
    
    model = YOLO("best.pt")
    # Predict and load on board
    # results = model(["/Users/jabirmustahid/Screenshots/Screenshot 2024-09-23 at 11.09.43 PM.png"])
    
    image_file = request.files['imageFile']
    file_path = os.path.join("/tmp", image_file.filename)
    image_file.save(file_path)

    results = model([file_path])
    
    pieceMapTwo = {
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
    whoToPlay = "b"
    board = [ ["-"] * 8 for _ in range(8)]

    def edit_board(objnum, bblist, classes):
        step = 1/8
        for i, item in enumerate(bblist):
            # print((bblist[0]))
            pred_x, pred_y = item[0], item[1]
            cur_x, cur_y = 0,0
            count_x, count_y= 0,0
            while pred_x > count_x:
                count_x += step
                cur_x += 1
            while pred_y > count_y:
                count_y += step
                cur_y += 1
            # print(cur_x, cur_y)
            board[cur_y-1][cur_x-1] = pieceMapTwo[int(classes[i])]
    print(type(results[0].boxes))
    for i in range(len(results[0].boxes)):
        edit_board(results[0].boxes.cls, results[0].boxes.xywhn, results[0].boxes.cls)

    # Convert to text
    def board_to_fen(state):
        '''
        board_to_fen takes in a chess_board and returns the FEN format for analysis
        chess_board -> FEN

        where chess_board is a 8*8 2d matrix and with the peices in their respective positions
        '''
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

        fen_string = fen_string[:-1]  # Remove the trailing slash
        return fen_string

    pgn = board_to_fen(board)
    
    return_data = {
        "link":f"lichess.org/analysis/standard/{pgn} {whoToPlay}"
    }

    return jsonify(return_data)


CORS(app)