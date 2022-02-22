require('dotenv').config()

const axios = require('axios').default;
axios.defaults.baseURL = process.env.BACKEND_API_URL;
axios.defaults.headers.post['Content-Type'] = 'application/json';

const Player = require('../playerClass');
const Game = require('../twoPlayerGameClass');

const ludoDetails = require('./path');

console.log(ludoDetails.redPath[57], ludoDetails.bluePath.length);
  
ludoLobby = [];
ludoRunningGames = [];

function userExists(username){
    for(let i = 0; i < ludoLobby.length;i++){ 
        if(ludoLobby[i].username === username){
            return true;
        }
    }
    return false;   
}
 
function makeGame(id, username, betAmount){
    for(let i = 0; i < ludoLobby.length;i++){
        if(ludoLobby[i].getBetAmount() === betAmount && ludoLobby[i].getStatus() === 'waiting'){
            // we can make a game 
            // console.log('user found here ...... ');
            ludoLobby[i].changeStatus('playing');
            let player2 = new Player(id, username, betAmount, 'playing');
            
            ludoLobby.push(player2);

            game = new Game(ludoLobby[i], player2);
            return game;
        }
    } 
    return new Game(null, null);
}


function endRunningGame(id){
    for(let i = 0; i < ludoRunningGames.length;i++){
        if(ludoRunningGames[i].getPlayer1().id === id || ludoRunningGames[i].getPlayer2().id === id){
            ludoRunningGames[i].changeStatus('ended');
        }
    }
}

function findMoveablePieces(piecePositions, num){
    let moveablePieces = [];
    for(let i = 0; i < 4;i++){
        if(piecePositions[i] === 0 && num != 6){}
        else if(piecePositions[i]+num <= 57){
            moveablePieces.push(i);
        }
    } 
    
    return moveablePieces;
     
} 

module.exports = function(io){ 
    io.on("connection", (socket) => {
    
        socket.on('ludo-random', (username, betAmount, callback)=>{
            if(userExists(username)){
                // don't let him enter the ludoLobby
                callback({
                    status: 'rejected',
                    game: null,
                    message: 'You are already connected from a different device or tab'
                });
            }
            else{ 
                //pushing user to the ludoLobby first
                
                let game = makeGame(socket.id, username, betAmount);
                if(game.isCreated()){
                   
                    game.setId(69);
                    ludoRunningGames.push(game);

                    let response = {
                        status: 'playing',
                        game: game,
                        message: 'Game Running !!'
                    };   

                    io.to(game.getPlayer1().id).emit('game-started', response);

                    callback(response);                  
                }
                else{
                    // push the user to the ludoLobby and let him wait...
                    let player = new Player(socket.id, username, betAmount, 'waiting');
                    ludoLobby.push(player);

                    callback({ 
                        status: 'waiting',
                        game: null,
                        message: 'Please wait for an opponent to join'
                    });
                }
            }
        });
        // player1 is always blue and player2 is green
        socket.on('cube-spinned', (game, playerPiecePositions, num, callback)=>{
            // console.log('dice number: ', num); 
            let moveablePieces = findMoveablePieces(playerPiecePositions, num);
            res = { 
                moveablePieces: moveablePieces 
            };
            callback(res);  

            if(game.player1.id === socket.id){
                io.to(game.player2.id).emit('opponent-cube-spinned', num);
            }else{
                io.to(game.player1.id).emit('opponent-cube-spinned', num);
            }
        }); 
        socket.on('piece-moved', (game, index, lastMove, callback)=>{
            // index is the index of piece
            callback('got it');
            if(game.player1.id === socket.id){
                io.to(game.player2.id).emit('opponent-piece-moved', index, lastMove);
            }else{
                io.to(game.player1.id).emit('opponent-piece-moved', index, lastMove);
            }
        });
        socket.on('piece-captured', (game, captureColor, captureId, callback)=>{
            callback('got it');
            if(game.player1.id === socket.id){
                io.to(game.player2.id).emit('piece-captured', captureColor, captureId);
            }else{
                io.to(game.player1.id).emit('piece-captured', captureColor, captureId);
            }
        });
        socket.on('piece-move-done', (game, callback)=>{
            game.moveId = game.moveId === game.player1.id ? game.player2.id: game.player1.id;
            let res = {game: game};
            if(socket.id === game.player1.id){
                io.to(game.player2.id).emit('opponent-move-done', res);
            }else{
                io.to(game.player1.id).emit('opponent-move-done', res);
            }
            callback(res);

        });
 
        socket.on('time-over', (game, callback)=>{
            
        }); 
        
        socket.on('disconnect', ()=>{
            for(let i = 0; i < ludoRunningGames.length;i++){
                if(ludoRunningGames[i].status === 'ended' || ludoRunningGames[i].status === 'drawn'){
                    ludoRunningGames.splice(i, 1);
                    break;
                }
                if(ludoRunningGames[i].getPlayer1().id === socket.id){
                    let winner = ludoRunningGames[i].getPlayer2().id;
                    let winnerUsername = ludoRunningGames[i].getPlayer2().username;

                    ludoRunningGames[i].setWinnerId(winner);
                    ludoRunningGames[i].changeStatus('ended');
                    
                    let response = {
                        status: 'ended',
                        game: ludoRunningGames[i],
                        message: 'Opponent Disconnected'
                    };
                    io.to(winner).emit('game-ended', response);
                    ludoRunningGames.splice(i, 1);
                    
                    break;

                }else if(ludoRunningGames[i].getPlayer2().id === socket.id){
                    let winner = ludoRunningGames[i].getPlayer1().id;
                    let winnerUsername = ludoRunningGames[i].getPlayer1().username;

                    ludoRunningGames[i].setWinnerId(winner);
                    ludoRunningGames[i].changeStatus('ended');
                    
                    let response = {
                        status: 'ended',
                        game: ludoRunningGames[i],
                        message: 'Opponent Disconnected'
                    };
                    io.to(winner).emit('game-ended', response);
                    ludoRunningGames.splice(i, 1);
                    
                    break;
                }
            }

            for(let i = 0; i < ludoLobby.length;i++){
                if(ludoLobby[i].id === socket.id){
                    ludoLobby.splice(i, 1);
                    break;
                }
            }
        });
    });
}