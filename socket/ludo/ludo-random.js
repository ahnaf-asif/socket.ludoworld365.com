require('dotenv').config()

const axios = require('axios').default;
axios.defaults.baseURL = process.env.BACKEND_API_URL;
axios.defaults.headers.post['Content-Type'] = 'application/json';

const Player = require('../playerClass');
const Game = require('../twoPlayerGameClass');

// const ludoDetails = require('./path');

// console.log(ludoDetails.redPath[57], ludoDetails.bluePath.length);
  
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
            // ludoRunningGames[i].changeStatus('ended');
            ludoRunningGames.splice(i, 1);
            return;
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
function gameFinished(piecePositions){
    let cnt = 0;
    for(let i = 0; i < 4;i++){
        if(piecePositions[i] >= 57)cnt++;
    }
    return cnt === 4;
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
                    
                    axios({
                        method: 'post',
                        url: '/ludo/create/game',
                        data: JSON.stringify({
                            player1: game.getPlayer1().username,
                            player2: game.getPlayer2().username,
                            betAmount: game.betAmount
                        })
                    }).then(function(res){
                        game.setId(res.data.id);
                        ludoRunningGames.push(game);

                        let response = {
                            status: 'playing',
                            game: game,
                            message: 'Game Running !!'
                        };   

                        io.to(game.getPlayer1().id).emit('game-started', response);

                        callback(response);
                    }).catch(function(err){
                        console.log(err);
                    });                 
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
        socket.on('ludo-cube-spinned', (game, playerPiecePositions, num, callback)=>{
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
        socket.on('ludo-piece-moved', (game, index, lastMove, callback)=>{
            // index is the index of piece
            callback('got it');
            if(game.player1.id === socket.id){
                io.to(game.player2.id).emit('opponent-piece-moved', index, lastMove);
            }else{
                io.to(game.player1.id).emit('opponent-piece-moved', index, lastMove);
            }
        });
        socket.on('ludo-piece-captured', (game, captureColor, captureId, callback)=>{
            callback('got it');
            if(game.player1.id === socket.id){
                io.to(game.player2.id).emit('piece-captured', captureColor, captureId);
            }else{
                io.to(game.player1.id).emit('piece-captured', captureColor, captureId);
            }
        });
        socket.on('ludo-piece-move-done', (game, piecePositions, callback)=>{
            let res = {};
            // console.log(callback, typeof callback);
            if(gameFinished(piecePositions)){
                
                game.moveId = null;
                game.status = 'ended';
                game.winnerId = socket.id;
                endRunningGame(game.winnerId);
                let winner = '';
                if(game.player1.id === game.winnerId)winner = game.player1.username;
                else winner = game.player2.username;

                axios({
                    method: 'post',
                    url: `/ludo/update/game/${game.id}`,
                    data: JSON.stringify({
                        status: 'ended',
                        result: 'win-loss',
                        winner: winner
                    })
                }).then(function(result){

                    res = {
                        status: 'ended',
                        game: game
                    };
                    if(socket.id === game.player1.id){
                        io.to(game.player2.id).emit('game-lost', res);
                    }else{
                        io.to(game.player1.id).emit('game-lost', res);
                    }
                    callback(res);
                }).catch(function (err){
                    console.log(err);
                });

            }else{
                game.moveId = game.moveId === game.player1.id ? game.player2.id: game.player1.id;
                res = {
                    status: 'continue',
                    game: game
                };
                // console.log('game not finished yet');
                if(socket.id === game.player1.id){
                    io.to(game.player2.id).emit('opponent-move-done', res);
                }else{
                    io.to(game.player1.id).emit('opponent-move-done', res);
                }
                callback(res);
            }
            

            
                
            
        });
 
        socket.on('ludo-time-over', (game, callback)=>{
            
            endRunningGame(game.winnerId);

            game.winnerId = game.player1.id;
            if(socket.id === game.winnerId){
                game.winnerId = game.player2.id; // basically the other player is the winner
            }
            game.status = 'ended';
            let winner = '';
            if(game.player1.id === game.winnerId)winner = game.player1.username;
            else winner = game.player2.username;

            axios({
                method: 'post',
                url: `/ludo/update/game/${game.id}`,
                data: JSON.stringify({
                    status: 'ended',
                    result: 'win-loss', 
                    winner: winner
                })
            }).then(function(result){
                let res = {
                    status: 'ended',
                    game: game
                };

                if(socket.id === game.player1.id){
                    io.to(game.player2.id).emit('opponent-timeout', res);
                }else{
                    io.to(game.player1.id).emit('opponent-timeout', res);
                }
                callback(res);

            }).catch(function (err){
                console.log(err);
            });

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
                    axios({
                        method: 'post',
                        url: `/ludo/update/game/${ludoRunningGames[i].id}`,
                        data: JSON.stringify({
                            status: 'ended',
                            result: 'win-loss',
                            winner: winnerUsername
                        })
                    }).then(function(res){
                        let response = {
                            status: 'ended',
                            game: ludoRunningGames[i],
                            message: 'Opponent Disconnected'
                        };
                        io.to(winner).emit('opponent-disconnected', response);
                        ludoRunningGames.splice(i, 1);
                    }).catch(function(err){
                        console.log(err);
                    })
                    break;

                }else if(ludoRunningGames[i].getPlayer2().id === socket.id){
                    let winner = ludoRunningGames[i].getPlayer1().id;
                    let winnerUsername = ludoRunningGames[i].getPlayer1().username;

                    ludoRunningGames[i].setWinnerId(winner);
                    ludoRunningGames[i].changeStatus('ended');
                    axios({
                        method: 'post',
                        url: `/ludo/update/game/${ludoRunningGames[i].id}`,
                        data: JSON.stringify({
                            status: 'ended',
                            result: 'win-loss',
                            winner: winnerUsername
                        })
                    }).then(function(res){
                        let response = {
                            status: 'ended',
                            game: ludoRunningGames[i],
                            message: 'Opponent Disconnected'
                        };
                        io.to(winner).emit('opponent-disconnected', response);
                        ludoRunningGames.splice(i, 1);
                    }).catch(function(err){
                        console.log(err);
                    })
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
        // console.log(`${socket.id} disconnected `, ludoLobby, ludoRunningGames);
    });
}