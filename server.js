// require('dotenv').config()

// const express = require("express");
// const { createServer } = require("http");
// const { Server } = require("socket.io");

// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, { cors: "*" });




// httpServer.listen(3000);


'use strict';

require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server, { cors: "*" });

require('./socket/tictactoe/tic-tac-toe-random.js')(io);
require('./socket/ludo/ludo-random.js')(io);