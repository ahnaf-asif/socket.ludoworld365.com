class Player{
    constructor(id, username, betAmount, status){
        this.id = id;
        this.username = username;
        this.betAmount = betAmount;
        this.status = status; // can be waiting or playing
    }
    changeStatus(newStatus){
        this.status = newStatus;
    }
    getId(){return this.id;}
    getUsername(){return this.username;}
    getBetAmount(){return this.betAmount;}
    getStatus(){return this.status;}
}

module.exports = Player;