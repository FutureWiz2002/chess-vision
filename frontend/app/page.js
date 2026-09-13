"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  HelpCircle,
  Loader2,
  RotateCcw,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const API_STAGE = process.env.NEXT_PUBLIC_STAGE || "local";
const API_BASE_URL = API_STAGE === "local" ? "http://localhost:8000" : "";

const initialCastlingRights = {
  whiteKingside: true,
  whiteQueenside: true,
  blackKingside: true,
  blackQueenside: true,
};

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [whoToMove, setWhoToMove] = useState("w");
  const [enPassantTarget, setEnPassantTarget] = useState("-");
  const [resultPath, setResultPath] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [castlingRights, setCastlingRights] = useState(initialCastlingRights);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [successToastOpen, setSuccessToastOpen] = useState(false);
  const [successToastKey, setSuccessToastKey] = useState(0);
  const fileInputRef = useRef(null);

  const apiUrl = `${API_BASE_URL}/vision`;
  const enPassantValue = enPassantTarget.trim() || "-";
  const enPassantIsValid =
    enPassantValue === "-" || /^[a-h][36]$/i.test(enPassantValue);

  const fileStats = useMemo(() => {
    if (!selectedImage) return null;
    return {
      name: selectedImage.name || "clipboard-image",
      type: selectedImage.type || "image",
      size: `${Math.max(selectedImage.size / 1024, 1).toFixed(0)} KB`,
    };
  }, [selectedImage]);

  const chooseImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setSelectedImage(file);
    setShowResult(false);
    setResultPath("");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let index = 0; index < items.length; index += 1) {
        if (items[index].type.startsWith("image/")) {
          const image = items[index].getAsFile();
          if (image) chooseImage(image);
          return;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const postImage = (event) => {
    event.preventDefault();

    if (!selectedImage) {
      console.warn("[ChessVision FE] Submit ignored: no image selected");
      setErrorMessage("Add a board image before running vision.");
      return;
    }

    if (!enPassantIsValid) {
      setErrorMessage("En passant must be '-' or a square like e3 or d6.");
      return;
    }

    const data = new FormData();
    data.append("imageFile", selectedImage);
    data.append("whotomove", whoToMove);
    data.append("castling", JSON.stringify(castlingRights));
    data.append("enpassant", enPassantValue);

    console.group("[ChessVision FE] POST /vision");
    console.log("stage:", API_STAGE);
    console.log("API URL:", apiUrl);
    console.log("Image:", fileStats);
    console.log("whoToMove:", whoToMove);
    console.log("castlingRights:", castlingRights);
    console.log("enPassantTarget:", enPassantValue);
    console.groupEnd();

    setIsProcessing(true);
    setErrorMessage("");

    axios
      .post(apiUrl, data, {
        headers: { "content-type": "multipart/form-data" },
      })
      .then((response) => {
        console.group("[ChessVision FE] /vision response");
        console.log("status:", response.status);
        console.log("data:", response.data);
        console.groupEnd();

        setShowResult(true);
        setResultPath(response.data.link);
        setSuccessToastKey((current) => current + 1);
        setSuccessToastOpen(true);
        setIsProcessing(false);
      })
      .catch((error) => {
        console.group("[ChessVision FE] /vision error");
        console.error(error);
        console.log("status:", error.response?.status);
        console.log("response data:", error.response?.data);
        console.log("request URL:", apiUrl);
        console.groupEnd();

        setErrorMessage(
          error.response?.data?.detail ||
            "Could not create an analysis link."
        );
        setIsProcessing(false);
      });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    chooseImage(event.dataTransfer.files[0]);
  };

  const handleFileSelect = (event) => {
    chooseImage(event.target.files?.[0]);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setShowResult(false);
    setResultPath("");
    setErrorMessage("");
  };

  const resetPosition = () => {
    setWhoToMove("w");
    setEnPassantTarget("-");
    setCastlingRights(initialCastlingRights);
  };

  const updateCastling = (key, checked) => {
    setCastlingRights((current) => ({
      ...current,
      [key]: Boolean(checked),
    }));
  };

  return (
    <ToastProvider swipeDirection="right">
      <main className="min-h-screen bg-[#f5f5f5] text-[#171717] selection:bg-black selection:text-white lg:h-screen lg:overflow-hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:h-screen lg:min-h-0 lg:px-6 lg:py-3">
          <header className="flex shrink-0 flex-col gap-3 border-b border-[#d4d4d4] pb-4 md:flex-row md:items-center md:justify-between lg:pb-3">
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-black bg-black">
                <ScanLine className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-black lg:text-4xl">
                  ChessVision
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-[#606060]">
                  Turn a board image into a Lichess analysis position.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setTutorialOpen(true)}
              className="w-fit rounded-md border-[#c8c8c8] bg-white text-black hover:bg-[#ededed]"
            >
              <HelpCircle className="h-4 w-4" />
              How it works
            </Button>
          </header>

          <section className="grid flex-1 gap-4 py-4 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-stretch lg:py-3">
          <div className="flex min-h-[320px] flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:min-h-0">
            <Card className="flex flex-1 flex-col overflow-hidden rounded-md border-[#d4d4d4] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-1 items-center justify-center p-4 transition-colors ${
                  isDragging ? "bg-[#e7e7e7]" : "bg-[#fafafa]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="absolute inset-5 rounded-md opacity-40 [background-image:linear-gradient(45deg,#dddddd_25%,transparent_25%),linear-gradient(-45deg,#dddddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#dddddd_75%),linear-gradient(-45deg,transparent_75%,#dddddd_75%)] [background-position:0_0,0_40px,40px_-40px,-40px_0] [background-size:80px_80px]" />

                {selectedImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeImage}
                    className="absolute right-5 top-5 z-20 border border-[#c8c8c8] bg-white/95 text-black hover:bg-[#ededed] hover:text-black"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}

                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative z-10 flex w-full max-w-md flex-col items-center rounded-md border border-dashed border-[#8b8b8b] bg-white/95 px-6 py-8 text-center transition hover:border-black hover:bg-[#f2f2f2] focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-md bg-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="mt-4 text-xl font-semibold tracking-[-0.03em] text-black">
                      Load a board image
                    </span>
                    <span className="mt-2 max-w-sm text-sm leading-5 text-[#606060]">
                      Drop a screenshot here or browse from disk. PNG, JPG, and
                      WebP are supported.
                    </span>
                  </button>
                ) : (
                  <div className="relative z-10 flex h-full w-full items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Uploaded chess board"
                      className="max-h-[60vh] w-auto max-w-full rounded-md border border-[#c8c8c8] bg-white object-contain shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          <aside className="flex min-h-0 flex-col gap-4 lg:contents">
            <Card className="rounded-md border-[#d4d4d4] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.07)] lg:col-start-2 lg:row-start-1">
              <div className="flex items-center justify-between border-b border-[#d4d4d4] px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-black">
                    Position
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetPosition}
                  className="text-[#555555] hover:bg-[#ededed] hover:text-black"
                  aria-label="Reset position"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={postImage} className="space-y-3 p-4">
                <div>
                  <Label className="mb-2 block text-sm font-medium text-[#303030]">
                    Turn
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <TurnButton
                      value="w"
                      label="White"
                      active={whoToMove === "w"}
                      onSelect={setWhoToMove}
                    />
                    <TurnButton
                      value="b"
                      label="Black"
                      active={whoToMove === "b"}
                      onSelect={setWhoToMove}
                    />
                  </div>
                </div>

                <Separator className="bg-[#d4d4d4]" />

                <div>
                  <Label className="mb-2 block text-sm font-medium text-[#303030]">
                    Castling
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <CastlingRow
                      label="White kingside"
                      code="K"
                      checked={castlingRights.whiteKingside}
                      onCheckedChange={(checked) => updateCastling("whiteKingside", checked)}
                    />
                    <CastlingRow
                      label="White queenside"
                      code="Q"
                      checked={castlingRights.whiteQueenside}
                      onCheckedChange={(checked) => updateCastling("whiteQueenside", checked)}
                    />
                    <CastlingRow
                      label="Black kingside"
                      code="k"
                      checked={castlingRights.blackKingside}
                      onCheckedChange={(checked) => updateCastling("blackKingside", checked)}
                    />
                    <CastlingRow
                      label="Black queenside"
                      code="q"
                      checked={castlingRights.blackQueenside}
                      onCheckedChange={(checked) => updateCastling("blackQueenside", checked)}
                    />
                  </div>
                </div>

                <Separator className="bg-[#d4d4d4]" />

                <div>
                  <Label htmlFor="en-passant" className="mb-2 block text-sm font-medium text-[#303030]">
                    En passant
                  </Label>
                  <input
                    id="en-passant"
                    value={enPassantTarget}
                    onChange={(event) => setEnPassantTarget(event.target.value)}
                    placeholder="-"
                    className={`h-10 w-full rounded-md border bg-white px-3 text-black outline-none transition placeholder:text-[#8a8a8a] focus:border-black focus:ring-2 focus:ring-black/15 ${
                      enPassantIsValid ? "border-[#c8c8c8]" : "border-black"
                    }`}
                  />
                  {!enPassantIsValid && (
                    <p className="mt-2 text-xs font-medium leading-5 text-black">
                      Use "-" or a square like e3.
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="rounded-md border border-black bg-[#f0f0f0] px-3 py-3 text-sm leading-5 text-black">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isProcessing || !selectedImage}
                  className="h-10 w-full rounded-md bg-black text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.14)] hover:bg-[#292929]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing board
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4" />
                      Analyze position
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="rounded-md border-[#d4d4d4] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.07)] lg:col-start-2 lg:row-start-2">
              <div className="border-b border-[#d4d4d4] px-4 py-3">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-black">
                  Link
                </h2>
              </div>

              <div className="p-4">
                {showResult && resultPath ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-black">
                      Link is ready
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(`https://${resultPath}`)}
                        variant="outline"
                        className="rounded-md border-[#c8c8c8] bg-white text-black hover:bg-[#ededed]"
                      >
                        <Clipboard className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        onClick={() => window.open(`https://${resultPath}`, "_blank")}
                        className="rounded-md bg-black text-white hover:bg-[#292929]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-[#c8c8c8] bg-[#f7f7f7] px-4 py-5 text-center">
                    <div className="mx-auto grid h-9 w-9 place-items-center rounded-md bg-[#e5e5e5] text-[#555555]">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-black">
                      No link yet
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#666666]">
                      Run the analysis after loading a board image.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </aside>
          </section>
        </div>
        <TutorialDrawer
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
        />
      </main>

      <Toast
        key={successToastKey}
        open={successToastOpen}
        onOpenChange={setSuccessToastOpen}
        duration={4000}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
        <ToastTitle>Position detected</ToastTitle>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

function TurnButton({ value, label, active, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-medium transition ${
        active
          ? "border-black bg-black text-white"
          : "border-[#c8c8c8] bg-white text-[#303030] hover:bg-[#ededed]"
      }`}
      onClick={() => onSelect(value)}
    >
      <span
        className={`h-3 w-3 rounded-full border ${
          active ? "border-white bg-white" : "border-[#777777]"
        }`}
      />
      {label}
    </button>
  );
}

function CastlingRow({ label, code, checked, onCheckedChange }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label} ${code}`}
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-black/20 ${
        checked
          ? "border-black bg-[#eeeeee]"
          : "border-[#c8c8c8] bg-white hover:bg-[#f2f2f2]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span onClick={(event) => event.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
        </span>
        <span className="text-sm text-[#252525]">{label}</span>
      </div>
      <span
        className={`rounded-sm px-2 py-1 font-mono text-xs ${
          checked
            ? "bg-black text-white"
            : "bg-[#e5e5e5] text-[#666666]"
        }`}
      >
        {code}
      </span>
    </div>
  );
}

function TutorialDrawer({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close tutorial"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-[#d4d4d4] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d4d4d4] px-5 py-5">
          <div>
            <h2 id="tutorial-title" className="text-2xl font-semibold tracking-[-0.03em] text-black">
              How it works
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#606060]">
              A quick path from board image to analysis board.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#555555] hover:bg-[#ededed] hover:text-black"
            aria-label="Close tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {[
            ["Add an image", "Drop, paste, or upload a clear screenshot of the chessboard."],
            ["Set the position", "Choose whose turn it is, then adjust castling or en passant only when the position needs it."],
            ["Analyze", "Run the scan and open the generated Lichess board."],
          ].map(([title, body], index) => (
            <div key={title} className="rounded-md border border-[#d4d4d4] bg-[#fafafa] p-4">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-md bg-black text-sm font-bold text-white">
                {index + 1}
              </div>
              <h3 className="text-base font-semibold text-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#606060]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
