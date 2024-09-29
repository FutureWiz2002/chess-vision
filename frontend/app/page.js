"use client";
import { useState, useEffect } from "react";
import axios from 'axios';
import TextTransition, { presets } from 'react-text-transition';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [whoToMove, setWhoToMove] = useState("w")
  const [resultPath, setResultPath] = useState("")
  const [showResult, setShowResult] = useState(false)

  const options = ['Take a Screenshot', 'Upload Image', 'Generate Link', 'Analyze'];

  const Annimate = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
      const intervalId = setInterval(
        () => setIndex((index) => index + 1),
        3000, // every 3 seconds
      );
      return () => clearTimeout(intervalId);
    }, []);

    return (
      <h1 className="text-2xl">
        <TextTransition springConfig={presets.wobbly}>{options[index % options.length]}</TextTransition>
      </h1>
    );
  };


  const postImage = (e) => {
    e.preventDefault()
    console.log(selectedImage)
    const api = "http://127.0.0.1:5000/vision"
    const data = new FormData()
    data.append('imageFile', selectedImage)
    data.append('whotomove', whoToMove)

    const config = {
      headers: { 'content-type': 'multipart/form-data' }
    }
    axios.post(api, data, config)
      .then((response) => {
        console.log(response)
        setShowResult(true)
        setResultPath(response.data.link)
        console.log("This is the finalasd data")
        console.log(response.data.link)
      }).catch((error) => {
        console.log(error)
      });
  };

  const onOptionChange = (e) => {
    console.log(whoToMove)
    setWhoToMove(e.target.value)
  }

  const UploadAndDisplayImage = () => {
    return (
      <div className="items-center justify-items-center p-8 pb-20">
        <div className="flex flex-col items-center justify-center p-8 pb-20">
          <p className="text-center text-2xl">Who to move?</p>
          <div className="flex items-center space-x-4 mt-4">
            <input type="radio" value="w" checked={whoToMove === "w"} onChange={onOptionChange} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label htmlFor="white" className="text-xl">White</label>
            <input type="radio" value="b" checked={whoToMove === "b"} onChange={onOptionChange} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label htmlFor="black" className="text-xl">Black</label>
          </div>
        </div>
        <div>

          {selectedImage && (
            <div className="items-center justify-items-center p-8 pb-20">
              <img
                alt="not found"
                width={"250px"}
                src={URL.createObjectURL(selectedImage)}
              />
              <button type="button" onClick={() => setSelectedImage(null)}>Remove</button>
            </div>
          )}
          <input
            type="file"
            name="myImage"
            onChange={(event) => {
              console.log(event.target.files[0]);
              setSelectedImage(event.target.files[0]);
            }}
          />
        </div>
        <div>
          <button type="button" onClick={postImage}>
            Analyze chess position!!
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="items-center justify-items-center p-8 pb-20 max-w-[80] w-10/12">
      <p className="items-center justfiy-items-center text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-green-500 to-indigo-400 bg-clip-text text-transparent">Chess Vision 👀</p>
      <Annimate />
      <p className="text-2xl p-20 text-center">
        Want to analyze chess positions ♕ but feel too lazy to setup a board online? I have a perfect tool for you! Take a screenshot 📸 of your chessboard and upload them here and my computer vision model will take of everything!
      </p>
      <div className="p-20 text-center m-20 items-center justfiy-items-center">
        <UploadAndDisplayImage />
      </div>
      <div>
        {showResult &&
          <a href={`https://${resultPath}`} target="_blank" rel="noopener noreferrer">{resultPath}</a>
        }
      </div>
    </div>
  );
}
