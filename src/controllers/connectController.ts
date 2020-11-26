import Web3 from 'web3';
import express from 'express';
import cron from 'node-cron';
import { db } from "../firebase/firebase";
import collections from "../firebase/collections";
import { swap as swapFab, withdraw as withdrawFab } from '../blockchain/coinBalance';
import { updateFirebase } from '../functions/functions';
import { ETH_PRIVI_ADDRESS, ETH_PRIVI_KEY, ETH_INFURA_KEY, ETH_SWAP_MANAGER_ADDRESS } from '../constants/configuration';
import { CONTRACT } from '../constants/ethContracts';
const fs = require('fs');

// Websocket settings
const webSocketServer = require('websocket').server;
const http = require('http');
const https = require('https')
const WS_PORT = 8000;
let wsServer: any;

// Web3 settings
let web3: any;
web3 = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${ETH_INFURA_KEY}`))
//web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));  // Local Ganache
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let CHAIN_ID = 'NA';
const TX_LISTENING_CYCLE = 15; // listen for new transactions in ethereum every X seconds


type PromiseResponse = {
    success: boolean,
    error: string,
    data: any
};

// Retrieve current Ethereum chain id
const getChainId = () => {
    web3.eth.getChainId()
        .then((res) => {
            CHAIN_ID = '0x' + res;
        })
        .catch((err) => {
            console.log('Error in connectController.ts->getChainId: ', err)
        });
};
getChainId();

// Start http & websocket servers
const startWS = () => {
    try {
        // Determine environment (http or https)
        const env: string = process.argv[2];
        let server: any;
        if (env === 'dev') {
            server = http.createServer();
        } else if (env === 'devssl') {
            const credentials = {
                key: fs.readFileSync('server.key'),
                cert: fs.readFileSync('server.cert'),
            };
            server = https.createServer(credentials);
        } else if (env === 'prod') {
            const privateKey = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/privkey.pem', 'utf8');
            const certificate = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/cert.pem', 'utf8');
            const ca = fs.readFileSync('/etc/letsencrypt/live/priviweb.tech/chain.pem', 'utf8');
            const credentials = {
                key: privateKey,
                cert: certificate,
                ca: ca
            };
            server = https.createServer(credentials);
        } else {
            console.log(`Warning in connectController.ts: websocket can't be started`);
            return false;
        };
        // Start WS server
        server.listen(WS_PORT);
        wsServer = new webSocketServer({ httpServer: server });
        if (env === 'devssl' || env === 'prod') {
            console.log(`Websocket (SSL) running on port ${WS_PORT}`);
        } else {
            console.log(`Websocket (non SSL) running on port ${WS_PORT}`);
        };
        return true;
    } catch (err) {
        console.log('Error in connectController->startWS(): ', err);
    };
};




/**
 * @dev The minimum ABI to get ERC20 Token balance
 */
const miniABI = [
    // balanceOf
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    // decimals
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    }
];

/**
 * @dev Generic function to execute Ethereum transactions with signature
 * @return @result: true if transaction was executed successfuly, or false otherwise
 * @return @error: error description if transaction failed
 * @return @res: transaction response  
 * @param params.fromAddress        From account
 * @param params.fromAddressKey     From private key   
 * @param params.encodedABI         Contract data 
 * @param params.contractAddress    Contract address
 */
const executeTX = (params: any) => {
    return new Promise<PromiseResponse>(async (resolve) => {

        // Prepare transaction
        // remark: added 'pending' to avoid 'Known Transaction' error
        const nonce = await web3.eth.getTransactionCount(params.fromAddress, 'pending');
        const tx = {
            gas: 1500000,
            gasPrice: '30000000000',
            from: params.fromAddress,
            data: params.encodedABI,
            chainId: params.chainId,
            to: params.toAddress,
            nonce: nonce,
        };

        // Sign transaction
        web3.eth.accounts.signTransaction(tx, params.fromAddressKey)
            .then((signed: any) => {
                // Send transaction
                web3.eth.sendSignedTransaction(signed.rawTransaction)
                    .then(async (res: any) => {
                        console.log('Response: ', res)
                        resolve({ success: true, error: '', data: res });
                    })
                    .catch((err: string) => {
                        console.log('Error in ethUtils.js (A) -> executeTX(): ', err);
                        resolve({ success: false, error: err, data: null });
                    });
            })
            .catch((err: string) => {
                console.log('Error in ethUtils.js (B) -> executeTX(): ', err);
                resolve({ success: false, error: err, data: null });
            });
    });
};


const callBalance = (contractAddress: string, fromAddress: any) => {
    return new Promise<number>(async (resolve) => {
        if (contractAddress !== ZERO_ADDRESS) {
            let contract = new web3.eth.Contract(miniABI, contractAddress);
            await contract.methods.balanceOf(fromAddress).call()
                .then(result => {
                    resolve(web3.utils.fromWei((result), 'ether'));
                })
                .catch(err => {
                    console.log('Error in connectController.ts -> getERC20Balance(): [call]', err);
                    resolve(0);
                })
        } else {
            resolve(0);
        };
    });
};

/**
 * @dev Retrieves the balance of an ERC20 token contract for a given User
 * @returns {success: boolean, balance: number}
 *          success: 'true' if balance was found / 'false' otherwise
 *          balance: balance amount
 * @param token Target ERC20 token (e.g.: DAI, UNI, BAT)
 * @param fromAddress User account to retrieve the balance
 */
const getERC20Balance = async (req: express.Request, res: express.Response) => {
    const { fromAddress, chainId } = req.query;

    if (chainId === '3') { // Ropsten
        const amountDAI = await callBalance(CONTRACT.Ropsten.DAI, fromAddress);
        const amountUNI = await callBalance(CONTRACT.Ropsten.UNI, fromAddress);
        const amountWETH = await callBalance(CONTRACT.Ropsten.WETH, fromAddress);
        const result = {
            DAI: amountDAI,
            UNI: amountUNI,
            WETH: amountWETH,
        };
        res.send({
            success: true,
            amount: result,
        });
    } else { // Unknown network
        const result = {
            DAI: 0,
            UNI: 0,
            WETH: 0,
        };
        res.send({
            success: true,
            amount: result,
        });
    };
};

/**
 * @dev Stores a transaction in the database, to be processed afterwards
 * @param params Relevant transaction fields
 */
const saveTx = async (params: any) => {

    const data = {
        txHash: params.txHash,
        publicId: params.publicId,
        chainId: params.chainId,
        action: params.action,
        description: params.description,
        amount: params.amount,
        token: params.token,
        status: params.status,
        lastUpdate: params.lastUpdate,
    };

    // Insert into Firestore
    const res = await db
        .collection(collections.ethTransactions)
        .add(data);
};

/**
 * @dev Receives a transaction from the front-end and stores it in the database
 */
const send = async (req: express.Request, res: express.Response) => {
    const body = req.body;

    if (body.action) {
        await saveTx(body);
        res.send('OK');
    } else {
        res.send('KO');
    }
};

/**
 * @dev Updates the status of a transaction in the database
 * @param txHash Transaction hash
 * @param newStatus Transaction status
 */
const updateTx = async (txHash: string, newStatus: string) => {

    // Retrieve TX doc
    const snapshot = await db
        .collection(collections.ethTransactions)
        .where('txHash', '==', txHash)
        .get();

    // Update TX status
    for (var i in snapshot.docs) {
        const res = await db
            .collection(collections.ethTransactions)
            .doc(snapshot.docs[i].id)
            .set({ status: newStatus }, { merge: true });
    };
};

/**
 * @dev Sends status of the transaction back to the front-end
 * @param txHash  Transaction hash
 * @param publicId User ID
 * @param action Action performed (relevant in the front-end in case of 'SWAP_APPROVE_ERC20')
 */
const sendTxBack = async (txHash: string, publicId: string, action: string) => {
    // Update TX status in Firestore
    await updateTx(txHash, 'confirmed');
    // Remove TX from Queue
    txQueue = txQueue.filter(elem => elem != txHash);
    // Send TX confirmation back to user through websocket
    if (users.get(publicId)) {
        users.get(publicId).sendUTF(JSON.stringify({
            txHash: txHash,
            status: 'OK',
            action: action,
        }));
    };
};

/**
 * @dev Check number of confirmations of a transaction in Ethereum
 * @param txHash  Transaction hash
 * @param publicId User ID
 * @return Number of confirmations (for testing, we set to 1 to get results faster)
 */
const checkTxConfirmations = async (txHash: string) => {
    try {
        // Get transaction details
        const trx = await web3.eth.getTransaction(txHash);

        // Get current block number
        const currentBlock = await web3.eth.getBlockNumber();

        // When transaction is unconfirmed, its block number is null.
        // In this case we return 0 as number of confirmations
        return trx.blockNumber === null ? 0 : currentBlock - trx.blockNumber;
    } catch (err) {
        console.log('Error in ConnectController.ts -> checkTxConfirmations(): ', err);
    };
};

// Transaction management (Queue system): this avoids to reprocess a transaction
// that is being handled
let txQueue = [''];

// Websocket management
const users = new Map();
let connection: any;
let runOnce = false;

/**
 * @dev Opens a websocket to listen connections from the front-ends. When a User opens
 * the swap screen in the front-end, automatically sends his/her publicId: this will 
 * be stored in an array of connections to send back the result of a transaction afterwards
 */
const wsListen = () => {
    try {
        // Start WS server (only once)
        runOnce = true;
        if (startWS()) {
            wsServer.on('request', (request: any) => {
                console.log(`Connection established`);
                // TODO SECURITY: accept only allowed origin
                connection = request.accept(null, request.origin);
                let id: string = '';
                // User sent a ping message (loaded the Swap function)
                connection.on('message', function (msg: any) {
                    if (msg.type === 'utf8') {
                        // Show incoming message
                        const { publicId, action, message } = JSON.parse(msg.utf8Data);
                        id = publicId;
                        // Store connection
                        if (action === 'ping') {
                            users.set(publicId, connection);
                        };
                    };
                });
                // User disconnected: remove connection from array
                connection.on('close', () => {
                    users.delete(id);
                    console.log(`User ${id} disconnected`);
                });
                // TODO IMPROVEMENT: check for each User if connection is still 
                // alive (ping). If not, remove connection from array
            });
        };
    } catch (err) {
        console.log('Error in connectController -> wsListen(): ', err);
    };
};

/**
 * @dev Cron that checks every X seconds if there is any transaction stored in the
 * database to be processed. The field 'action' determines whether executing swap, 
 * approve or withdraw
 */
const checkTx = cron.schedule(`*/${TX_LISTENING_CYCLE} * * * * *`, async () => {

    // Start WS server if not initialized yet
    (!runOnce) ? wsListen() : null;

    //Retrieve all pending TX from Firestore
    const snapshot = await db
        .collection(collections.ethTransactions)
        .where('status', '==', 'pending')
        .where('chainId', '==', CHAIN_ID)
        .get();

    // Process outstanding TX
    if (!snapshot.empty) {
        for (let i in snapshot.docs) {
            const doc = snapshot.docs[i].data();
            const confirmations = await checkTxConfirmations(doc.txHash) || 0;
            if (confirmations > 0) {
                if (!txQueue.includes(doc.txHash)) {
                    txQueue.push(doc.txHash);
                    if (doc.action === 'SWAP_APPROVE_ERC20') {
                        sendTxBack(doc.txHash, doc.publicId, doc.action);
                    } else {
                        transfer(doc.publicId, doc.amount, doc.token, doc.txHash, doc.action)
                    };
                    /*
                    switch (doc.action) {
                        case 'SWAP_TRANSFER_ETH': case 'SWAP_TRANSFER_ERC20':
                            swap(doc.publicId, doc.amount, doc.token, doc.txHash, doc.action);
                            break;
                        case 'SWAP_APPROVE_ERC20':
                            await sendTxBack(doc.txHash, doc.publicId, doc.action);
                            break;
                        case 'WITHDRAW_ERC20': case 'WITHDRAW_ETH':
                            withdraw(doc.publicId, doc.amount, doc.token, doc.txHash, doc.action);
                            break;
                        default:
                            console.log('Warning in connectController.ts->checkTx: Option not recognized');
                            break;
                    };
                    */
                };
            };
        };
    };
});

/**
 * @dev Swap/Withdraw ETH or ERC20 tokens between Ethereum to Fabric's User account
 * @param publicId User ID
 * @param amount Amount to be swapped
 * @param token Ether (ETH) or coin type (DAI, UNI..)
 * @param txHash Transaction hash
 * @param action Action to be performed (swap, approve, withdraw)
 */
const transfer = async (
    publicId: string,
    amount: string,
    token: string,
    txHash: string,
    action: string) => {

    try {
        console.log(`** Transfer in Fabric with user ID: ${publicId}, amount: ${amount}, token: ${token}, action: ${action}`);
        //const response = await swapFab(publicId, amount, token);
        let response: any;
        if (action === 'SWAP_TRANSFER_ETH' || action === 'SWAP_TRANSFER_ERC20') {
            response = await swapFab(publicId, amount, token);
        } else if (action === 'WITHDRAW_ERC20' || action === 'WITHDRAW_ETH') {
            response = await withdrawFab(publicId, amount, token);
        };

        if (response && response.success) {
            // Update balances in Firestore
            await updateFirebase(response);
            // Update TX
            await sendTxBack(txHash, publicId, action);
        } else {
            console.log('Error in connectController.ts -> swap(): Swap call in Fabric not successful');
            if (users.get(publicId)) {
                users.get(publicId).sendUTF(JSON.stringify({
                    txHash: txHash,
                    status: 'KO',
                }));
            };
        };
    } catch (err) {
        console.log('Error in connectController.ts->swap(): <probably connection to Fabric is not available', err);
    };
};


module.exports = {
    getERC20Balance,
    send,
    checkTx,
};


// /**
//  * @dev Withdraw amount from Fabric to Ethereum's User account
//  * @returns c
//  *          e: f
//  * @param token Target ERC20 token (e.g.: DAI, UNI, BAT)
//  * @param fromAddress User account to retrieve the balance
//  */
// const withdrawERC20 = async (req: express.Request, res: express.Response) => {
//     const body = req.body;
//     const { chainId, publicId, amount, token, to } = req.body;
//     console.log('eeoo publicId: ', publicId, ' amount: ', amount, ' token: ', token, ' to: ', to);

//     const Contract = new web3.eth.Contract(SwapManagerContract.abi, ETH_SWAP_MANAGER_ADDRESS);
//     const amountWei = web3.utils.toWei(String(amount));

//     const params = {
//         chainId: chainId,
//         fromAddress: ETH_PRIVI_ADDRESS,
//         fromAddressKey: ETH_PRIVI_KEY,
//         encodedABI: Contract.methods.withdrawEther(to, amountWei).encodeABI(),
//         toAddress: ETH_SWAP_MANAGER_ADDRESS,
//     };

//     const { success, error, data } = await executeTX(params);
//     console.log('Result tx - success:', success, ' error: ', error, ' data: ', data);

//     (success)
//         ? res.send('Yeah!!')
//         : res.send('Shit!');
// };




// /**
//  * @dev Withdraw ETH or ERC20 tokens from Fabric to Ethereum's User account
//  * @return  status of the withdrwaw process:
//  *          0: Fabric Failed / 1: Ethereum failed / 2: Fabric & Ethereum succeded
//  * @param mode 'WITHDRAW_ETH': withdraw ethers / 'WITHDRAW_ERC20': withdraw ERC20 tokens
//  * @param chainId Blockchain network identifier
//  * @param publicId User identifier
//  * @param amount Amount to be withdrawn
//  * @param token Token name
//  * @param to Destination address
//  */
// const withdraw = async (req: express.Request, res: express.Response) => {
//     const body = req.body;
//     const { action, chainId, publicId, amount, token, to } = req.body;
//     let statusCode = '0';

//     console.log('eeoo publicId: ', publicId, ' amount: ', amount, ' token: ', token,
//         ' to: ', to, 'action: ', action);

//     // ** STEP 1: Withdraw from Fabric **
//     const response = await withdrawFab(publicId, amount, token);
//     console.log('** Fab Response: ', response);
//     if (response && response.success) {

//         // Update balances in Firestore
//         await updateFirebase(response);
//         statusCode = '1';

//     } else {
//         console.log('Error in connectController.ts -> withdraw(): Withdraw call in Fabric not successful');
//     };

//     // ** STEP 2: Withdraw from Ethereum **
//     if (response && response.success) {

//         // Convert value into wei
//         const amountWei = web3.utils.toWei(String(amount));

//         // Get SwapManager contract code
//         const contract = new web3.eth.Contract(SwapManagerContract.abi, ETH_SWAP_MANAGER_ADDRESS);

//         // Choose method from SwapManager to be called
//         const method = (action === 'WITHDRAW_ETH')
//             ? contract.methods.withdrawEther(to, amountWei).encodeABI()
//             : contract.methods.withdrawERC20Token(token, to, amountWei).encodeABI();

//         // Transaction parameters
//         const params = {
//             chainId: chainId,
//             fromAddress: ETH_PRIVI_ADDRESS,
//             fromAddressKey: ETH_PRIVI_KEY,
//             encodedABI: method,
//             toAddress: ETH_SWAP_MANAGER_ADDRESS,
//         };

//         // Execute transaction
//         const { success } = await executeTX(params);
//         (success) ? statusCode = '2' : null;
//     };

//     // Send back status code to front-end
//     res.send(statusCode);
// };