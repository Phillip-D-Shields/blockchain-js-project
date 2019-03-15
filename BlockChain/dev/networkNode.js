const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const port = process.argv[2];
const rp = require('request-promise');

const nodeAddress = uuid().split('-').join('');

const coin = new Blockchain();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));


app.get('/blockchain', function (req, res) {
    res.send(coin);
});


app.post('/transaction', function (req, res) {
    const newTransaction = req.body;
    const blockIndex = coin.addTransactionToPendingTransactions(newTransaction);

    res.json({
        note: 'Transaction will be added in block ' + blockIndex
    });
});

app.post('/transaction/broadcast', function (req, res) {
    const newTransaction = coin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    coin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            url: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(data => {
            res.json({
                note: 'transaction created and broadcast successfully'
            });
        });
});

app.get('/mine', function (req, res) {
    const previousBlock = coin.getLastBlock();
    const previousBlockHash = previousBlock['hash'];
    const currentBlockData = {
        transactions: coin.pendingTransactions,
        index: previousBlock['index'] + 1
    };
    const nonce = coin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = coin.hashBlock(previousBlockHash, currentBlockData, nonce);

    coin.createNewTransaction(3.14, "Pi", nodeAddress);
    const newBlock = coin.createNewBlock(nonce, previousBlockHash, blockHash);

    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            url: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: {
                newBlock: newBlock
            },
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(data => {
            const requestOptions = {
                url: coin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 3.14,
                    sender: "Pi",
                    recipient: nodeAddress
                },
                json: true
            };

            return rp(requestOptions);
        })
        .then(data => {
            res.json({
                note: "new block mined  and broadcast successfully",
                block: newBlock
            });
        });
});


app.post('/receive-new-block', function(req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = coin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    if (correctHash && correctIndex) {
        coin.chain.push(newBlock);
        coin.pendingTransactions = [];
        res.json({
            note: 'New block received and accepted',
            newBlock: newBlock
        });
    } else {
        res.json({
            note: 'New block rejected',
            newBlock: newBlock
        });
    }
});

// register and broadcast node
app.post('/register-and-broadcast-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (coin.networkNodes.indexOf(newNodeUrl) == -1) coin.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            url: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {
                newNodeUrl: newNodeUrl
            },
            json: true
        };

        regNodesPromises.push(rp(requestOptions));
    });

    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOptions = {
                url: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: {
                    allNetworkNodes: [...coin.networkNodes, coin.currentNodeUrl]
                },
                json: true
            };

            return rp(bulkRegisterOptions);
        })
        .then(data => {
            res.json({
                note: 'new node registered successfully with network.'
            });
        })
});

// register node with newtwork
app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = coin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = coin.currentNodeUrl !== newNodeUrl;

    if (nodeNotAlreadyPresent && notCurrentNode) coin.networkNodes.push(newNodeUrl);
    res.json({
        note: 'new node registered successfully'
    });
});

// register multiple nodes
app.post('/register-nodes-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = coin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = coin.currentNodeUrl !== networkNodeUrl;

        if (nodeNotAlreadyPresent && notCurrentNode) coin.networkNodes.push(networkNodeUrl);
    });

    res.json({
        note: 'bulk registration successful'
    });
});



app.listen(port, function () {
    console.log('listenining on port ' + port);
});