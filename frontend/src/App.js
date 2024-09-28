import { Button, Input, Modal } from "antd";
import "antd/dist/reset.css"; // Reset Ant Design styles
import confetti from "canvas-confetti";
import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";

// Kết nối tới server Socket.IO
const socket = io("http://localhost:5000");

const App = () => {
  const [board, setBoard] = useState(Array(16 * 16).fill(null));
  const [roomID, setRoomID] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState({});
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [mySymbol, setMySymbol] = useState("");
  const [status, setStatus] = useState("Đang tìm người chơi thứ 2...");
  const [showPopup, setShowPopup] = useState(true);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);

  // Hiển thị pháo hoa và tắt Modal sau 5 giây
  useEffect(() => {
    if (showWinnerPopup) {
      // Bắt đầu bắn pháo hoa khi người chơi thắng
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Tự động đóng popup sau 5 giây
      setTimeout(() => {
        setShowWinnerPopup(false);
      }, 5000);
    }
  }, [showWinnerPopup]);

  // Lắng nghe sự kiện từ Socket.IO
  useEffect(() => {
    socket.on("update board", (newBoard) => {
      setBoard(newBoard);
    });

    socket.on("game over", (message) => {
      setStatus(message); // message chứa tên người thắng
      setShowWinnerPopup(true); // Hiển thị popup khi có người thắng
    });

    socket.on("start game", ({ players, symbol }) => {
      setPlayers(players);
      setMySymbol(symbol);
      setStatus("New game started! You are " + symbol); // Đặt thông báo New game lên trên
    });

    socket.on("player turn", (currentPlayer) => {
      setCurrentPlayer(currentPlayer);
    });

    socket.on("update players", (players) => {
      setPlayers(players);

      // Khi đã có đủ 2 người chơi, trò chơi bắt đầu và ẩn thông báo tìm người chơi thứ 2
      if (players.player1 && players.player2) {
        setStatus("Game started!");
      }
    });

    socket.on("player left", (playerName) => {
      setStatus(`${playerName} has left the room.`);
      setPlayers({});
      setShowPopup(true);
      setRoomID(""); // Reset roomID
    });

    socket.on("reset board", (newBoard) => {
      setBoard(newBoard);
      setShowWinnerPopup(false);
      setStatus("New game started!"); // Hiển thị New game started trên đầu
    });

    return () => {
      socket.off("update board");
      socket.off("game over");
      socket.off("start game");
      socket.off("player turn");
      socket.off("update players");
      socket.off("reset board");
      socket.off("player left");
    };
  }, []);

  // Xử lý sự kiện tham gia phòng
  const handleJoinRoom = () => {
    if (playerName && roomID) {
      socket.emit("join room", { roomID, playerName });
      setShowPopup(false);
    }
  };

  // Xử lý sự kiện click trên bàn cờ
  const handleClick = (index) => {
    if (currentPlayer === mySymbol && !board[index]) {
      socket.emit("make move", { roomID, index, symbol: mySymbol });
    }
  };

  // Đóng Modal người chiến thắng và reset game
  const handleClosePopup = () => {
    setShowWinnerPopup(false);
    socket.emit("reset board", roomID); // Reset lại board để tiếp tục chơi
  };

  return (
    <div>
      <h1>Tic-Tac-Toe</h1>

      {/* Hiển thị thông báo trạng thái trên đầu */}
      <h2>{status}</h2>
      {roomID && <h2>Room ID: {roomID}</h2>}

      {/* Popup nhập tên người chơi và Room ID */}
      <Modal
        title="Enter your name and room"
        visible={showPopup}
        footer={[
          <Button key="submit" type="primary" onClick={handleJoinRoom}>
            Join Room
          </Button>,
        ]}
        closable={false}
        centered
      >
        <Input
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <Input
          placeholder="Room ID"
          value={roomID}
          onChange={(e) => setRoomID(e.target.value)}
        />
      </Modal>

      {/* Hiển thị tên người chơi */}
      {players.player1 && players.player2 && (
        <div className="player-info">
          {players.player1.playerName} vs {players.player2.playerName}
        </div>
      )}

      {/* Hiển thị popup chiến thắng từ Ant Design */}
      <Modal
        visible={showWinnerPopup}
        onCancel={handleClosePopup}
        footer={null}
        centered
      >
        <h3>{status}</h3> {/* Hiển thị tên người chiến thắng */}
      </Modal>

      {/* Bàn chơi */}
      <div className="board">
        {board.map((cell, index) => (
          <div key={index} className="cell" onClick={() => handleClick(index)}>
            {cell} {/* Hiển thị trực tiếp X hoặc O */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
