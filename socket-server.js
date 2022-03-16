require('dotenv').config()

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_SERVER_URL} });


require('./socket/tictactoe/tic-tac-toe-random.js')(io);
require('./socket/ludo/ludo-random.js')(io);


httpServer.listen(3069);