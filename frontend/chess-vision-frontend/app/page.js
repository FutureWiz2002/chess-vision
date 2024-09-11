import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 ">
      <p className="items-center justfiy-items-center text-3xl">Chess Vision</p>
      <p>Want to analyze positions but feel too lazy to setup a board online? I have a perfect tool for you! Take a screenshot of the chessboard you have and upload them here and my computer vision model will take of everything!</p>
    </div>
  );
}
