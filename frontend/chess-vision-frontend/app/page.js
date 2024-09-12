"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null);

  const postImage = () => {
    console.log("Well hello there")
    console.log(typeof selectedImage)
  }

  const UploadAndDisplayImage = () => {
    return (
      <div className="items-center justify-items-center p-8 pb-20">
        {selectedImage && (
          <div className="items-center justify-items-center p-8 pb-20">
            <img
              alt="not found"
              width={"250px"}
              src={URL.createObjectURL(selectedImage)}
            />
            <br /> <br />
            <button onClick={() => setSelectedImage(null)}>Remove</button>
          </div>
        )}
  
        <br />
  
        {/* Input element to select an image file */}
        <input
          type="file"
          name="myImage"
          // Event handler to capture file selection and update the state
          onChange={(event) => {
            console.log(event.target.files[0]); // Log the selected file
            setSelectedImage(event.target.files[0]); // Update the state with the selected file
          }}
        />
      </div>
    );
  };
  
  return (
    <div className="items-center justify-items-center p-8 pb-20 ">
      <p className="items-center justfiy-items-center text-5xl">Chess Vision 👀</p>
      <p className="text-2xl p-20 text-center">
        Want to analyze chess positions ♕ but feel too lazy to setup a board online? I have a perfect tool for you! Take a screenshot 📸 of your chessboard and upload them here and my computer vision model will take of everything!
      </p>
      <div className="p-20 text-center m-20 items-center justfiy-items-center">
        <UploadAndDisplayImage/>
      </div>
      <div>
        <button onClick={postImage}>
          Analyze
        </button>
      </div>
    </div>
  );
}
