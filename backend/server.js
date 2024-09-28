const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Kết nối từ ReactJS ở cổng 3000
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

    // Nếu phòng chưa tồn tại, tạo phòng mới
    if (!rooms[roomID]) {
      rooms[roomID] = {
        board: Array(16 * 16).fill(null), // Bảng Tic-Tac-Toe 16x16
        players: {},
        currentPlayer: "X",
      };
    }

    // Thêm người chơi vào phòng
    if (!rooms[roomID].players.player1) {
      rooms[roomID].players.player1 = { playerName, socketID: socket.id };
      socket.join(roomID);
      io.to(socket.id).emit("start game", {
        players: rooms[roomID].players,
        symbol: "X",
      });
    } else if (!rooms[roomID].players.player2) {
      rooms[roomID].players.player2 = { playerName, socketID: socket.id };
      socket.join(roomID);
      io.to(socket.id).emit("start game", {
        players: rooms[roomID].players,
        symbol: "O",
      });
    }

    // Bắt đầu trò chơi nếu cả hai người chơi đã tham gia
    if (rooms[roomID].players.player1 && rooms[roomID].players.player2) {
      io.in(roomID).emit("player turn", rooms[roomID].currentPlayer);
      io.in(roomID).emit("update players", rooms[roomID].players);
    }
  });

  socket.on("make move", ({ roomID, index, symbol }) => {
    const room = rooms[roomID];

    if (room && room.board[index] === null && room.currentPlayer === symbol) {
      room.board[index] = symbol;
      io.in(roomID).emit("update board", room.board);

      if (checkWinner(room.board, index, symbol)) {
        const winnerName =
          symbol === "X"
            ? rooms[roomID].players.player1.playerName
            : rooms[roomID].players.player2.playerName;
        io.in(roomID).emit("game over", `${winnerName} wins!`);

        setTimeout(() => {
          room.board = Array(16 * 16).fill(null);
          room.currentPlayer = "X";
          io.in(roomID).emit("reset board", room.board);
          io.in(roomID).emit("player turn", room.currentPlayer);
        }, 1000);
      } else {
        room.currentPlayer = room.currentPlayer === "X" ? "O" : "X";
        io.in(roomID).emit("player turn", room.currentPlayer);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    let roomID;
    let disconnectedPlayer;

    // Tìm phòng mà người chơi đã tham gia
    for (const room in rooms) {
      const players = rooms[room].players;
      if (players.player1 && players.player1.socketID === socket.id) {
        roomID = room;
        disconnectedPlayer = "player1";
        break;
      } else if (players.player2 && players.player2.socketID === socket.id) {
        roomID = room;
        disconnectedPlayer = "player2";
        break;
      }
    }

    // Xử lý khi người chơi rời khỏi phòng
    if (roomID) {
      const playerName = rooms[roomID].players[disconnectedPlayer].playerName;

      // Thông báo cho người chơi còn lại rằng một người đã rời khỏi phòng và xóa phòng
      io.in(roomID).emit(
        "player left",
        `${playerName} has left the room. The room will be closed.`
      );

      // Đóng toàn bộ socket trong phòng
      io.in(roomID).socketsLeave(roomID);

      // Xóa phòng sau khi thông báo
      delete rooms[roomID];
      console.log(`Room ${roomID} has been deleted.`);
    }
  });
  socket.on("reset board", (roomID) => {
    const room = rooms[roomID];
    if (room) {
      room.board = Array(16 * 16).fill(null);
      room.currentPlayer = "X";
      io.in(roomID).emit("reset board", room.board);
      io.in(roomID).emit("player turn", room.currentPlayer);
    }
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
