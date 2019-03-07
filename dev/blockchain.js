const sha256 = require('sha256');
const currentNodeUrl = process.argv[3]; 
const uuid = require('uuid/v1');

function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    //create genesis block
    this.createNewBlock(13, '0', 'ALPHA');
}

//create new block
Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash ) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash 
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
}

// locate last block
Blockchain.prototype.getLastBlock = function() {
    return this.chain[this.chain.length - 1];
}

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        transactionId: uuid().split('-').join('')
    };

    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
}


//SHA256
Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);

    return hash;
}

//Proof of work
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
    //hashBlock until it finds hash that begins with '0000'
    //increment the nonce each hashBlock to find an accepted hash
    //return the accepted nonce 
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

    while (hash.substring(0,4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        //console.log(hash); for your viewing pleasure
    }

    return nonce;
}


module.exports = Blockchain;