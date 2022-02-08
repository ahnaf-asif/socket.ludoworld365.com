const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*"} });


require('./socket/tic-tac-toe-random.js')(io);


httpServer.listen(3069);

// http://localhost:3069