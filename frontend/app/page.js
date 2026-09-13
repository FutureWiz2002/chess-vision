"use client";
import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import TextTransition, { presets } from 'react-text-transition';
import { Upload, Crown, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [whoToMove, setWhoToMove] = useState("w");
  const [enPassantTarget, setEnPassantTarget] = useState("-");
  const [resultPath, setResultPath] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [castlingRights, setCastlingRights] = useState({
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true,
  });
  const fileInputRef = useRef(null);

  const options = ['Take a Screenshot', 'Upload Image', 'Generate Link', 'Analyze'];

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            setSelectedImage(blob);
            const reader = new FileReader();
            reader.onload = (event) => {
              setImagePreview(event.target?.result);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const postImage = (e) => {
    e.preventDefault();
    if (!selectedImage) {
      console.warn("[ChessVision FE] Submit ignored: no image selected");
      return;
    }
    
    const stage = process.env.NEXT_PUBLIC_STAGE || "local";
    const apiBaseUrl = stage === "local" ? "http://localhost:8000" : "";
    const api = `${apiBaseUrl}/vision`;
    const data = new FormData();
    data.append('imageFile', selectedImage);
    data.append('whotomove', whoToMove);
    // Add castling rights to the form data
    data.append('castling', JSON.stringify(castlingRights));
    data.append('enpassant', enPassantTarget.trim() || "-");

    console.group("[ChessVision FE] POST /vision");
    console.log("stage:", stage);
    console.log("API URL:", api);
    console.log("Image:", {
      name: selectedImage.name,
      type: selectedImage.type,
      size: selectedImage.size,
    });
    console.log("whoToMove:", whoToMove);
    console.log("castlingRights:", castlingRights);
    console.log("enPassantTarget:", enPassantTarget);
    console.groupEnd();
    
    setIsProcessing(true);
    const config = {
      headers: { 'content-type': 'multipart/form-data' }
    };
    
    axios.post(api, data, config)
      .then((response) => {
        console.group("[ChessVision FE] /vision response");
        console.log("status:", response.status);
        console.log("data:", response.data);
        console.groupEnd();
        setShowResult(true);
        setResultPath(response.data.link);
        setIsProcessing(false);
      }).catch((error) => {
        console.group("[ChessVision FE] /vision error");
        console.error(error);
        console.log("status:", error.response?.status);
        console.log("response data:", error.response?.data);
        console.log("request URL:", api);
        console.groupEnd();
        setIsProcessing(false);
      });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-[#000]">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-10 h-10 text-[#d16800]" />
            <h1 className="bg-gradient-to-r from-[#d16800] to-[#ffc58d] bg-clip-text text-transparent">
              ChessVision
            </h1>
          </div>
          <p className="text-slate-300 max-w-3xl mx-auto mt-8">
            Want to analyze chess positions ♕ but feel too lazy to setup a board online? I have a perfect tool for you! Take a screenshot 📸 of your chessboard and upload it here and my computer vision model will take care of everything!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Left Column - Instructions */}
          <div className="space-y-6">
            <div>
              <h2 className="text-white mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#d16800] to-[#ffc58d] text-white flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Upload Your Chess Board</h3>
                    <p className="text-slate-400">
                      Drag and drop an image, paste from clipboard (Ctrl+V), or click to browse. Any clear photo of a chess position works.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#d16800] to-[#ffc58d] text-white flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Configure Position Details</h3>
                    <p className="text-slate-400">
                      Set who's turn it is to move and adjust castling rights for both players.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#d16800] to-[#ffc58d] text-white flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <h3 className="text-white mb-1">AI Detection & Analysis</h3>
                    <p className="text-slate-400">
                      Our YOLO computer vision model detects all pieces on the board and identifies their positions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#d16800] to-[#ffc58d] text-white flex items-center justify-center">
                    4
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Analyze on Lichess</h3>
                    <p className="text-slate-400">
                      Get a direct link to analyze or play the position on Lichess with the detected board state.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Upload Area */}
          <div className="space-y-6">
            <Card className="overflow-hidden bg-gray-800 border-gray-700">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg transition-colors ${
                  isDragging
                    ? 'border-[#d16800] bg-gray-700'
                    : 'border-gray-600 bg-gray-800'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer p-12 text-center"
                  >
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-white mb-2">Upload Chess Board Image</h3>
                    <p className="text-slate-400 mb-4">
                      Drag and drop, paste (Ctrl+V), or click to browse
                    </p>
                    <p className="text-slate-500">
                      Supports JPG, PNG, WebP
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Chess board"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {selectedImage && (
              <Card className="p-6 space-y-6 bg-gray-800 border-gray-700">
                <div>
                  <h3 className="text-white mb-4">Position Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-3 block text-slate-300">Turn to Move</Label>
                      <RadioGroup
                        value={whoToMove}
                        onValueChange={setWhoToMove}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="w" id="white" />
                          <Label htmlFor="white" className="cursor-pointer text-slate-300">White</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="b" id="black" />
                          <Label htmlFor="black" className="cursor-pointer text-slate-300">Black</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div>
                      <Label className="mb-3 block text-slate-300">Castling Rights</Label>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-slate-400">White</p>
                          <div className="flex gap-4 ml-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="white-kingside"
                                checked={castlingRights.whiteKingside}
                                onCheckedChange={(checked) =>
                                  setCastlingRights({
                                    ...castlingRights,
                                    whiteKingside: checked,
                                  })
                                }
                              />
                              <Label htmlFor="white-kingside" className="cursor-pointer text-slate-300">
                                Kingside
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="white-queenside"
                                checked={castlingRights.whiteQueenside}
                                onCheckedChange={(checked) =>
                                  setCastlingRights({
                                    ...castlingRights,
                                    whiteQueenside: checked,
                                  })
                                }
                              />
                              <Label htmlFor="white-queenside" className="cursor-pointer text-slate-300">
                                Queenside
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-slate-400">Black</p>
                          <div className="flex gap-4 ml-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="black-kingside"
                                checked={castlingRights.blackKingside}
                                onCheckedChange={(checked) =>
                                  setCastlingRights({
                                    ...castlingRights,
                                    blackKingside: checked,
                                  })
                                }
                              />
                              <Label htmlFor="black-kingside" className="cursor-pointer text-slate-300">
                                Kingside
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="black-queenside"
                                checked={castlingRights.blackQueenside}
                                onCheckedChange={(checked) =>
                                  setCastlingRights({
                                    ...castlingRights,
                                    blackQueenside: checked,
                                  })
                                }
                              />
                              <Label htmlFor="black-queenside" className="cursor-pointer text-slate-300">
                                Queenside
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gray-700" />

                    <div>
                      <Label htmlFor="en-passant" className="mb-3 block text-slate-300">
                        En Passant Target
                      </Label>
                      <input
                        id="en-passant"
                        value={enPassantTarget}
                        onChange={(event) => setEnPassantTarget(event.target.value)}
                        placeholder="-"
                        className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-slate-200 outline-none focus:border-[#d16800]"
                      />
                      <p className="mt-2 text-sm text-slate-500">
                        Use "-" for none, or a square like e3 or d6.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={postImage}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-[#d16800] to-[#ff8c00] hover:from-[#ff8c00] hover:to-[#d16800]"
                >
                  {isProcessing ? 'Analyzing...' : 'Analyze Chess Position!!'}
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Results Section */}
        {showResult && resultPath && (
          <Card className="p-8 bg-gray-900 border-gray-700">
            <div className="flex items-start gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-white mb-2">Position Detected Successfully!</h2>
                <p className="text-slate-400">
                  Your chess position has been analyzed. Click the link below to view it on Lichess.
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 mb-2">Lichess Analysis Link:</p>
                  <a 
                    href={`https://${resultPath}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#ffc58d] hover:text-[#d16800] break-all transition-colors"
                  >
                    {resultPath}
                  </a>
                </div>
                <Button
                  onClick={() => window.open(`https://${resultPath}`, '_blank')}
                  className="bg-gradient-to-r from-[#d16800] to-[#ff8c00] hover:from-[#ff8c00] hover:to-[#d16800]"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Lichess
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
