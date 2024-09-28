import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import './App.css';

// Kết nối tới server Socket.IO
const socket = io("http://localhost:5000");

const App = () => {
  const [board, setBoard] = useState(Array(16 * 16).fill(null));
  const [roomID, setRoomID] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState({});
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [mySymbol, setMySymbol] = useState("");
  const [status, setStatus] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false); // Popup chiến thắng

  useEffect(() => {
    socket.on("update board", (newBoard) => {
      setBoard(newBoard);
    });

    socket.on("game over", (message) => {
      setStatus(message);
      setShowWinnerPopup(true); // Hiển thị popup khi có người thắng
    });

    socket.on("start game", ({ players, symbol }) => {
      setPlayers(players);
      setMySymbol(symbol);
      setStatus("Game started! You are " + symbol);
    });

    socket.on("player turn", (currentPlayer) => {
      setCurrentPlayer(currentPlayer);
    });

    socket.on("update players", (players) => {
      setPlayers(players);
    });

    // Lắng nghe sự kiện reset bảng
    socket.on("reset board", (newBoard) => {
      setBoard(newBoard);
      setShowWinnerPopup(false); // Đóng popup chiến thắng khi trò chơi bắt đầu lại
      setStatus("New game started!");
    });

    return () => {
      socket.off("update board");
      socket.off("game over");
      socket.off("start game");
      socket.off("player turn");
      socket.off("update players");
      socket.off("reset board");
    };
  }, []);

  const handleJoinRoom = () => {
    if (playerName && roomID) {
      socket.emit("join room", { roomID, playerName });
      setShowPopup(false);
    }
  };

  const handleClick = (index) => {
    if (currentPlayer === mySymbol && !board[index]) {
      socket.emit("make move", { roomID, index, symbol: mySymbol });
    }
  };

  const handleClosePopup = () => {
    setShowWinnerPopup(false); // Đóng popup khi người chơi bấm nút
  };

  return (
    <div>
      <h1>Tic-Tac-Toe</h1>

      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <h3>Enter your name and room</h3>
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
        </div>
      )}

      {/* Hiển thị tên người chơi */}
      {players.player1 && players.player2 && (
        <div className="player-info">
          {players.player1} vs {players.player2}
        </div>
      )}

      <div className="board">
        {board.map((cell, index) => (
          <div key={index} className="cell" onClick={() => handleClick(index)}>
            {cell}
          </div>
        ))}
      </div>

      <h2>{status}</h2>

      {showWinnerPopup && (
        <div className="popup">
          <div className="popup-content">
            <h3>{status}</h3>
            <button onClick={handleClosePopup}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
