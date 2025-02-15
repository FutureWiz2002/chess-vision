This is my attempt on a computer vision model that would take in an image of a chess board (a screenshot from chess.com) for example and return a pgn file/text that can be loaded into lichess or chess.com and be used for engine evaluation

# How do use this application?

1. Clone repository using git clone [FutureWiz2002/chess-vision](https://github.com/FutureWiz2002/chess-vision.git)
2. To get the necessary *frontend* dependencies, run `cd frontend` to get into the frontend folder
and run the command `npm`
3. Use `npm run dev` and localhost should start the frontend
4. For backend, go into the `backend` folder and use `pip install requirements.txt` for windows or  use
`pip3 install requirements.txt` for MacOS to install the necessary requirements. With the last update, `app.py` contains the lastest code to generate pgn code and run the computer vision model, so `flask start` should
should start the backend server
5. Annnddd you are done, upload screenshots and see the analysis on licehss.com!!
6. If you have face any issues in any of the steps above, feel free to contact me here! and I will get back to you as soon as possible!

Thank you for using and contributing to ChessVision! 