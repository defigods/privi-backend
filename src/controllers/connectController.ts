import Web3 from 'web3';
import express from 'express';
import cron from 'node-cron';
import { db } from "../firebase/firebase";
import collections from "../firebase/collections";
import { mint as swapFab, burn as withdrawFab } from '../blockchain/coinBalance';
import { updateFirebase } from '../functions/functions';
import { ETH_PRIVI_ADDRESS, ETH_PRIVI_KEY, ETH_INFURA_KEY, ETH_SWAP_MANAGER_ADDRESS } from '../constants/configuration';
import SwapManagerContract from '../contracts/SwapManager.json';
import ERC20Balance from '../contracts/ERC20Balance.json';
import { CONTRACT } from '../constants/ethContracts';
const fs = require('fs');
require('dotenv').config();

// TODO: this should be the preferred method to get the private key!
// Get private key for API calls
//const apiKey = process.env.API_KEY;

// Websocket settings
const webSocketServer = require('websocket').server;
const http = require('http');
const https = require('https')
const WS_PORT = 8000;
let wsServer: any;

// Transaction management (Queue system): 
// This avoids to reprocess a transaction that is being handled
let txQueue = [''];

// Websocket management
const users = new Map();
let connection: any;
let runOnce = false;

// Web3 settings
let web3: any;
web3 = new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${ETH_INFURA_KEY}`))
//web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));  // Local Ganache
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let CHAIN_ID = 'NA';
const TX_LISTENING_CYCLE = 15; // listen for new transactions in ethereum every 15 seconds

// Action types
const Action = {
    SWAP_TRANSFER_ETH: 'SWAP_TRANSFER_ETH',
    SWAP_TRANSFER_ERC20: 'SWAP_TRANSFER_ERC20',
    SWAP_APPROVE_ERC20: 'SWAP_APPROVE_ERC20',
    WITHDRAW_ETH: 'WITHDRAW_ETH',
    WITHDRAW_ERC20: 'WITHDRAW_ERC20',
};

// Promise return type for ethereum transactions
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
            console.log('Error in connectController.ts->getChainId(): ', err)
        });
};
getChainId();

/**
 * @notice Start http & websocket servers to interact with the front-end
 */
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
 * @notice Generic function to execute Ethereum transactions with signature
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

/**
 * @notice Retrieves the balance of ethers from the User's Ethereum address 
 * @return balance if the contract call is successful / 0 otherwise
 */
const callBalance = (contractAddress: string, fromAddress: any) => {
    return new Promise<number>(async (resolve) => {
        if (contractAddress !== ZERO_ADDRESS) {
            let contract = new web3.eth.Contract(ERC20Balance.abi, contractAddress);
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
 * @notice Retrieves the balance of all ERC20 token contracts from the User's Ethereum address 
 * @return {success: boolean, balance: number}
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
 * @notice Receives a transaction from the front-end and:
 *  - If swap: call function to store TX in the database (to be processed by a chron afterwards)
 *  - If withdraw: call withdraw function
 */
const send = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    if (typeof body.action === 'string') {
        if (body.action === Action.WITHDRAW_ERC20 || body.action === Action.WITHDRAW_ETH) {
            withdraw(body)
        } else {
            await saveTx(body);
        };
        res.send('OK');
    } else {
        res.send('KO');
    };
};

/**
 * @notice Stores a transaction in the database
 * @param params Relevant transaction fields to be stored
 */
const saveTx = async (params: any) => {

    // Build object with fields to be stored in Firestore
    const data = {
        txHash: params.txHash,
        from: params.from,
        to: params.to,
        random: params.random,
        publicId: params.publicId,
        chainId: params.chainId,
        action: params.action,
        description: params.description,
        amount: params.amount,
        token: params.token,
        status: params.status,
        lastUpdate: params.lastUpdate,
    };

    // Insert data into Firestore
    const res = await db
        .collection(collections.ethTransactions)
        .add(data);
};

/**
 * @notice Updates the status of a transaction in the database
 * @param txHash Transaction hash
 * @param newStatus New transaction status
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
 * @notice Sends status of the transaction back to the front-end
 * @param txHash  Transaction hash
 * @param publicId User ID
 * @param action Action performed (relevant in the front-end in case of 'SWAP_APPROVE_ERC20')
 * @param random Random generated from the front-end as identifier for a withdraw request
 * @param status Transaction status (pending, failed)
 */
const sendTxBack = async (txHash: string, publicId: string, action: string, random: string, status: string) => {

    // Update TX status in Firestore
    (action === Action.WITHDRAW_ERC20 || action === Action.WITHDRAW_ETH)
        ? await updateTx(random, (status === 'OK') ? 'confirmed' : 'failed')
        : await updateTx(txHash, (status === 'OK') ? 'confirmed' : 'failed');

    // Remove TX from Queue
    (action === Action.WITHDRAW_ERC20 || action === Action.WITHDRAW_ETH)
        ? txQueue = txQueue.filter(elem => elem != random)
        : txQueue = txQueue.filter(elem => elem != txHash);

    // Send TX confirmation back to user through websocket
    if (users.get(publicId)) {
        users.get(publicId).sendUTF(JSON.stringify({
            txHash: txHash,
            random: random,
            status: status,
            action: action,
        }));
    };
};

/**
 * @notice Check number of confirmations of a transaction in Ethereum
 * @param txHash  Transaction hash
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

/**
 * @notice Opens a websocket to listen connections from the front-ends. When a User opens
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
 * @notice Cron that checks every X seconds if there is any transaction stored in the
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
                    if (doc.action === Action.SWAP_APPROVE_ERC20 ||
                        doc.action === Action.WITHDRAW_ETH ||
                        doc.action === Action.WITHDRAW_ERC20) {
                        sendTxBack(doc.txHash, doc.publicId, doc.action, doc.random, 'OK');
                    } else {
                        console.log('publicID:', doc.publicId)
                        swap(doc.publicId, doc.from, doc.amount, doc.token, doc.txHash, doc.random, doc.action)
                    };
                };
            };
        };
    };
});

/**
 * @notice Swap ETH or ERC20 tokens between Ethereum and Fabric's User account
 * @param publicId User ID
 * @param from origin address
 * @param amount Amount to be swapped
 * @param token Ether (ETH) or coin type (DAI, UNI..)
 * @param txHash Transaction hash
 * @param random Random generated from the front-end as identifier for a withdraw request
 * @param action Action to be performed (swap ETH or swap ERC20 token)
 */
const swap = async (
    publicId: string,
    from: string,
    amount: string,
    token: string,
    txHash: string,
    random: string,
    action: string) => {

    try {
        console.log('--> Swap: TX confirmed in Ethereum');
console.log({
    From: from,
    To: publicId,
    Type: action,
    Token: token,
    Amount: amount,
    Date: new Date(),
    Id: txHash,
    Caller: 'PRIVI'
})
        const response = await swapFab(
            action,
            from,
            publicId,
            amount,
            token,
            new Date(),
            txHash,
            'PRIVI'
        );

        if (response && response.success) {
            console.log('--> Swap: TX confirmed in Fabric: ', response);

            // Update balances in Firestore
            const respUpdateBalance = await updateFirebase(response);
            console.log('--> Swap: Update Balance in Fabric: ', respUpdateBalance);

            // Update TX
            await sendTxBack(txHash, publicId, action, random, 'OK');
        } else {
            console.log('Error in connectController.ts -> swap(): Swap call in Fabric not successful', response);
            await sendTxBack(txHash, publicId, action, random, 'KO');
        };
    } catch (err) {
        console.log('Error in connectController.ts->swap(): <probably connection to Fabric is not available', err);
    };
};

/**
 * @notice Withdraw ETH or ERC20 tokens between Fabric's and Ethereum's User account
 * @param publicId User ID
 * @param from origin address
 * @param amount Amount to be swapped
 * @param token Ether (ETH) or coin type (DAI, UNI..)
 * @param txHash Transaction hash
 * @param random Random generated from the front-end as identifier for a withdraw request
 * @param action Action to be performed (swap ETH or swap ERC20 token)
 */
const withdraw = async (params: any) => {

    // Withdraw in Fabric
    const response = await withdrawFab(
        params.action,
        params.publicId,
        params.to,
        params.amount,
        params.token,
        new Date(),
        params.random,
        'PRIVI'
    );

    if (response && response.success) {

        console.log('--> Withdraw: TX confirmed in Fabric');

        // Update balances in Firestore
        // Go ahead with Ethereum even the update of balances fails (no response.success required)
        await updateFirebase(response);

        // Convert value into wei
        const amountWei = web3.utils.toWei(String(params.amount));

        // Get SwapManager contract code
        const contract = new web3.eth.Contract(SwapManagerContract.abi, ETH_SWAP_MANAGER_ADDRESS);

        // Choose method from SwapManager to be called
        const method = (params.action === Action.WITHDRAW_ETH)
            ? contract.methods.withdrawEther(params.to, amountWei).encodeABI()
            : contract.methods.withdrawERC20Token(params.token, params.to, amountWei).encodeABI();

        // Transaction parameters
        const paramsTX = {
            chainId: params.chainId,
            fromAddress: ETH_PRIVI_ADDRESS,
            fromAddressKey: ETH_PRIVI_KEY,
            encodedABI: method,
            toAddress: ETH_SWAP_MANAGER_ADDRESS,
        };

        // Execute transaction to withdraw in Ethereum
        const { success, data } = await executeTX(paramsTX);
        const paramsTx = {
            txHash: 0,
            random: params.random,
            publicId: params.publicId,
            chainId: params.chainId,
            action: params.action,
            description: params.description,
            amount: params.amount,
            token: params.token,
            status: 'pending',
            lastUpdate: params.lastUpdate,
        };

        // Send back transaction result to front-end
        if (success) {
            console.log('--> Withdraw: TX confirmed in Ethereum');
            paramsTx.txHash = data.transactionHash,
                await saveTx(paramsTx);
        } else {
            console.log('--> Withdraw: TX failed in Ethereum');
            await sendTxBack('0', params.publicId, params.action, params.random, 'KO');
        };
    } else {
        console.log('--> Withdraw: TX failed in Fabric');
        await sendTxBack('0', params.publicId, params.action, params.random, 'KO');
    }
};

module.exports = {
    getERC20Balance,
    send,
    checkTx,
};
