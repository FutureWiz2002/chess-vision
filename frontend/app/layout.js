import localFont from "next/font/local";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
export const metadata = {
  title: "ChessVision",
  description: "Convert chess images to pgn",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body
        className={`${geistSans.variable} font-display antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
