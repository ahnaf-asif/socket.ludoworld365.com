class Game{
    constructor(player1, player2){

        if(player1 === null || player2 === null){
            this.player1 = null;
            this.player2 = null;
            this.created = false;
        }else{
            this.id = null;
            this.player1 = player1;
            this.player2 = player2;
            this.betAmount = player1.getBetAmount();
            this.created = true;
            this.moveId = player1.id;
            this.winnerId = null;
            this.status = 'running'; // running or ended
        }
    }
    getPlayers(){
        return [this.player1, this.player2];
    }
    getPlayer1(){
        return this.player1;
    }
    getPlayer2(){
        return this.player2;
    }
    getStatus(){
        return this.status;
    }
    changeStatus(status){
        this.status = status;
    }
    isCreated(){
        return this.created;
    }
    alterMove(){
        // altering the move
        if(this.moveId === this.player1.id){
            this.moveId = this.player2.id;
        }else {
            this.moveId = this.player1.id;
        }
    }
    setWinnerId(id){
        this.winnerId = id;
    }
    setId(id){
        this.id = id;
    }
}

module.exports = Game;