const axios = require('axios').default;
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';
axios.defaults.headers.post['Content-Type'] = 'application/json';

const Player = require('./playerClass');
const Game = require('./twoPlayerGameClass');

lobby = [];
runningGames = [];
tiCtaCtoeWinConditions = [ 
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9],
    [3, 5, 7],
    [1, 5, 9]
];

function userExists(username){
    for(let i = 0; i < lobby.length;i++){ 
        if(lobby[i].username === username){
            return true;
        }
    }
    return false;
}

function makeGame(id, username, betAmount){
    for(let i = 0; i < lobby.length;i++){
        if(lobby[i].getBetAmount() === betAmount && lobby[i].getStatus() === 'waiting'){
            // we can make a game 
            // console.log('user found here ...... ');
            lobby[i].changeStatus('playing');
            let player2 = new Player(id, username, betAmount, 'playing');
            
            lobby.push(player2);

            game = new Game(lobby[i], player2);
            return game;
        }
    }

    // returning null if not found any game...
    return new Game(null, null);
}

function gameWin(board){
    for(let i = 0; i < tiCtaCtoeWinConditions.length;i++){
        let a = tiCtaCtoeWinConditions[i][0];
        let b = tiCtaCtoeWinConditions[i][1];
        let c = tiCtaCtoeWinConditions[i][2];

        if(board[a] === board[b] && board[a] == board[c] && (board[a] === 'X' || board[a] === 'O') ){
            return true;
        }
    }
    return false;
}
function gameDraw(board){
    // game is not win - already checked
    let cnt = 0;
    for(let i = 1; i < board.length;i++){
        if(board[i] === 'X' || board[i] === 'O')cnt++;
    }
    if(cnt === 9)return true;
    return false;
}


function endRunningGame(id){
    for(let i = 0; i < runningGames.length;i++){
        if(runningGames[i].getPlayer1().id === id || runningGames[i].getPlayer2().id === id){
            runningGames[i].changeStatus('ended');
        }
    }
}

module.exports = function(io){
    io.on("connection", (socket) => {
    
        socket.on('tic-tac-toe-random', (username, betAmount, callback) => {
            if(userExists(username)){
                // don't let him enter the lobby
                callback({
                    status: 'rejected',
                    game: null,
                    message: 'You are already connected from a different device or tab'
                });
            }
            else{ 

                //pushing user to the lobby first
                
                let game = makeGame(socket.id, username, betAmount);
                if(game.isCreated()){
                    axios({
                        method: 'post',
                        url: '/tictactoe/create/game',
                        data: JSON.stringify({
                            player1: game.getPlayer1().username,
                            player2: game.getPlayer2().username,
                            betAmount: game.betAmount
                        })
                    }).then(function(res){
                        
                        // console.log(res.data)
                        game.setId(res.data.id);
                        runningGames.push(game);

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
                    // push the user to the lobby and let him wait...
                    let player = new Player(socket.id, username, betAmount, 'waiting');
                    lobby.push(player);

                    callback({ 
                        status: 'waiting',
                        game: null,
                        message: 'Please wait for an opponent to join'
                    });
                }
            }
            
        });

        socket.on('player-move', (game, board, indx, callback)=>{
            if(gameWin(board)){
                
                game.winnerId = socket.id;
                endRunningGame(game.winnerId);
                game.status = 'ended';
                let winner = '';
                if(game.player1.id === game.winnerId)winner = game.player1.username;
                else winner = game.player2.username;
                axios({
                    method: 'post',
                    url: `/tictactoe/update/game/${game.id}`,
                    data: JSON.stringify({
                        status: 'ended',
                        result: 'win-loss',
                        winner: winner
                    })
                }).then(function(res){

                    // console.log(res);
                    let response = {
                        status: 'ended',
                        indx: indx,
                        game: game,
                        message: 'Game Ended'
                    };  
    
                    if(game.player1.id === socket.id){
                        io.to(game.player2.id).emit('game-ended', response);
                    }else{
                        io.to(game.player1.id).emit('game-ended', response);
                    }
    
                    callback(response);

                }).catch(function (err){
                    console.log(err);
                })

            
            }else if(gameDraw(board)){
                
                game.winnerId = null;
                game.status = 'drawn';
                endRunningGame(game.player1.id);
                axios({
                    method: 'post',
                    url: `/tictactoe/update/game/${game.id}`,
                    data: JSON.stringify({
                        status: 'ended',
                        result: 'draw',
                        winner: null,
                    })
                }).then(function(res){
                    let response = {
                        status: 'drawn',
                        indx: indx,
                        game: game,
                        message: 'Game Drawn'
                    };
    
                    if(game.player1.id === socket.id){
                        io.to(game.player2.id).emit('game-drawn', response);
                    }else{
                        io.to(game.player1.id).emit('game-drawn', response);
                    }
    
                    callback(response);

                }).catch(function(err){
                    console.log(err);
                })
            }
            else {

                // altering move
                if(game.moveId === game.player1.id){
                    game.moveId = game.player2.id;
                }else {
                    game.moveId = game.player1.id;
                }

                let response = {
                    status: 'playing',
                    indx: indx,
                    game : game,
                    message: 'opponent moved'
                };
                if(game.player1.id === socket.id){
                    io.to(game.player2.id).emit('opponent-move', response);
                }else{
                    io.to(game.player1.id).emit('opponent-move', response);
                }
                callback(response);
            }
        });

        socket.on('time-over', (game, callback)=>{
            // game over hoye jabe. playerId lost arki
            game.winnerId = game.player1.id;
            endRunningGame(game.winnerId);
            if(socket.id === game.winnerId){
                game.winnerId = game.player2.id; // basically the other player is the winner
            }
            game.status = 'ended';
            let winner = '';
            if(game.player1.id === game.winnerId)winner = game.player1.username;
            else winner = game.player2.username;
            axios({
                method: 'post',
                url: `/tictactoe/update/game/${game.id}`,
                data: JSON.stringify({
                    status: 'ended',
                    result: 'win-loss',
                    winner: winner
                })
            }).then(function(res){

                // console.log(res);
                let response = {
                    status: 'ended',
                    indx: null,
                    game: game,
                    message: 'Opponent time out'
                };  

                if(game.player1.id === socket.id){
                    io.to(game.player2.id).emit('game-ended', response);
                }else{
                    io.to(game.player1.id).emit('game-ended', response);
                }

                callback(response);

            }).catch(function (err){
                console.log(err);
            });
        });
        
        socket.on('disconnect', ()=>{
            

            for(let i = 0; i < runningGames.length;i++){
                if(runningGames[i].status === 'ended' || runningGames[i].status === 'drawn'){
                    runningGames.splice(i, 1);
                    break;
                }
                if(runningGames[i].getPlayer1().id === socket.id){
                    let winner = runningGames[i].getPlayer2().id;
                    let winnerUsername = runningGames[i].getPlayer2().username;

                    runningGames[i].setWinnerId(winner);
                    runningGames[i].changeStatus('ended');
                    axios({
                        method: 'post',
                        url: `/tictactoe/update/game/${runningGames[i].id}`,
                        data: JSON.stringify({
                            status: 'ended',
                            result: 'win-loss',
                            winner: winnerUsername
                        })
                    }).then(function(res){
                        let response = {
                            status: 'ended',
                            game: runningGames[i],
                            message: 'Opponent Disconnected'
                        };
                        io.to(winner).emit('game-ended', response);
                        runningGames.splice(i, 1);
                    }).catch(function(err){
                        console.log(err);
                    })
                    break;

                }else if(runningGames[i].getPlayer2().id === socket.id){
                    let winner = runningGames[i].getPlayer1().id;
                    let winnerUsername = runningGames[i].getPlayer1().username;

                    runningGames[i].setWinnerId(winner);
                    runningGames[i].changeStatus('ended');

                    axios({
                        method: 'post',
                        url: `/tictactoe/update/game/${runningGames[i].id}`,
                        data: JSON.stringify({
                            status: 'ended',
                            result: 'win-loss',
                            winner: winnerUsername
                        })
                    }).then(function(res){
                        let response = {
                            status: 'ended',
                            game: runningGames[i],
                            message: 'Opponent Disconnected'
                        };
                        io.to(winner).emit('game-ended', response);
                        runningGames.splice(i, 1);
                    }).catch(function(err){
                        console.log(err);
                    })
                    break;
                }
            }

            for(let i = 0; i < lobby.length;i++){
                if(lobby[i].id === socket.id){
                    lobby.splice(i, 1);
                    break;
                }
            }
        });
    });
}