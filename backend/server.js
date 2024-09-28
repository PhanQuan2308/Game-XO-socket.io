const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Cho phép kết nối từ ReactJS ở cổng 3000
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Cho phép frontend kết nối
    methods: ["GET", "POST"],
  },
});

let rooms = {}; // Lưu trữ các phòng và người chơi

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join room", ({ roomID, playerName }) => {
    console.log(`Player ${playerName} is trying to join room ${roomID}`);

    if (!rooms[roomID]) {
      rooms[roomID] = {
        board: Array(16 * 16).fill(null), // Bảng Tic-Tac-Toe 16x16
        players: {},
        currentPlayer: "X",
      };
    }

    if (!rooms[roomID].players.player1) {
      rooms[roomID].players.player1 = playerName;
      socket.join(roomID);
      io.to(socket.id).emit("start game", {
        players: rooms[roomID].players,
        symbol: "X",
      });
    } else if (!rooms[roomID].players.player2) {
      rooms[roomID].players.player2 = playerName;
      socket.join(roomID);
      io.to(socket.id).emit("start game", {
        players: rooms[roomID].players,
        symbol: "O",
      });
    }

    if (rooms[roomID].players.player1 && rooms[roomID].players.player2) {
      io.in(roomID).emit("player turn", rooms[roomID].currentPlayer);
      io.in(roomID).emit("update players", rooms[roomID].players);
    }
  });

  socket.on("make move", ({ roomID, index, symbol }) => {
    const room = rooms[roomID];

    if (room && room.board[index] === null && room.currentPlayer === symbol) {
      room.board[index] = symbol; // Đánh dấu ô với X hoặc O
      io.in(roomID).emit("update board", room.board); // Cập nhật bảng cho cả phòng

      // Kiểm tra người chiến thắng
      if (checkWinner(room.board, index, symbol)) {
        io.in(roomID).emit("game over", `${symbol} wins!`);

        // Reset lại trò chơi sau khi có người thắng
        setTimeout(() => {
          room.board = Array(16 * 16).fill(null); // Reset bảng chơi
          room.currentPlayer = "X"; // Reset người chơi đầu tiên
          io.in(roomID).emit("reset board", room.board); // Gửi thông báo reset về client
          io.in(roomID).emit("player turn", room.currentPlayer); // Thông báo lượt mới
        }, 1000); // Đợi 5 giây trước khi reset
      } else {
        room.currentPlayer = room.currentPlayer === "X" ? "O" : "X";
        io.in(roomID).emit("player turn", room.currentPlayer);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

function checkWinner(board, index, symbol) {
  const boardSize = 16;
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;

  return (
    checkDirection(board, row, col, 0, 1, symbol) || // Kiểm tra ngang
    checkDirection(board, row, col, 1, 0, symbol) || // Kiểm tra dọc
    checkDirection(board, row, col, 1, 1, symbol) || // Kiểm tra chéo chính
    checkDirection(board, row, col, 1, -1, symbol) // Kiểm tra chéo phụ
  );
}

function checkDirection(board, row, col, rowDir, colDir, symbol) {
  const boardSize = 16;
  let count = 1;

  // Kiểm tra hướng xuôi
  for (let i = 1; i < 5; i++) {
    const newRow = row + i * rowDir;
    const newCol = col + i * colDir;
    if (
      newRow >= 0 &&
      newRow < boardSize &&
      newCol >= 0 &&
      newCol < boardSize &&
      board[newRow * boardSize + newCol] === symbol
    ) {
      count++;
    } else {
      break;
    }
  }

  // Kiểm tra hướng ngược
  for (let i = 1; i < 5; i++) {
    const newRow = row - i * rowDir;
    const newCol = col - i * colDir;
    if (
      newRow >= 0 &&
      newRow < boardSize &&
      newCol >= 0 &&
      newCol < boardSize &&
      board[newRow * boardSize + newCol] === symbol
    ) {
      count++;
    } else {
      break;
    }
  }

  return count >= 5;
}

// Khởi động server tại cổng 5000
server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
