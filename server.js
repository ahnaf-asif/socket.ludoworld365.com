require('dotenv').config()

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: "*" });


require('./socket/tictactoe/tic-tac-toe-random.js')(io);
require('./socket/ludo/ludo-random.js')(io);

// app.listen(3068);
httpServer.listen(3000);