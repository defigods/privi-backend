import Web3 from 'web3';
import express from 'express';
import cron from 'node-cron';
import { db } from "../firebase/firebase";
import collections from "../firebase/collections";
import { mint as swapFab, burn as withdrawFab } from '../blockchain/coinBalance.js';
import { updateFirebase, updateStatusOneToOneSwap, updateTxOneToOneSwap, updatePriviTxOneToOneSwap, getRecentSwaps as loadRecentSwaps } from '../functions/functions';
import { ETH_PRIVI_ADDRESS, ETH_CONTRACTS_ABI_VERSION, ETH_PRIVI_KEY, ETH_INFURA_KEY, MIN_ETH_CONFIRMATION, SHOULD_HANDLE_SWAP } from '../constants/configuration';
import ERC20Balance from '../contracts/ERC20Balance.json';
import { ethers }              from "ethers";
import { ChainId, Token, WETH, Fetcher, Route } from '@uniswap/sdk';
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const uuid = require('uuid');

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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TX_LISTENING_CYCLE = 15; // listen for new transactions in ethereum every N seconds

// Action types
const Action = {
    SWAP_TRANSFER_ETH: 'SWAP_TRANSFER_ETH',
    SWAP_TRANSFER_ERC20: 'SWAP_TRANSFER_ERC20',
    SWAP_APPROVE_ERC20: 'SWAP_APPROVE_ERC20',
    WITHDRAW_ETH: 'WITHDRAW_ETH',
    WITHDRAW_ERC20: 'WITHDRAW_ERC20',

    SWAP_APPROVE_ERC721: 'SWAP_APPROVE_ERC721',
    SWAP_TRANSFER_ERC721: 'SWAP_TRANSFER_ERC721',
    WITHDRAW_ERC721: 'WITHDRAW_ERC721'
};

// Promise return type for ethereum transactions
type PromiseResponse = {
    success: boolean,
    error: string,
    data: any
};

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
                        }
                    }
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

// get rpc corresponding to chain ID
const getWeb3forChain = (chainId: any): Web3 => {
    if(chainId === '0x3' || chainId === '3' || chainId === 3){
        console.log('getWeb3forChain', chainId)
        return new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${ETH_INFURA_KEY}`))
    } else if (chainId === '0x4' || chainId === '4' || chainId === 4) {
        console.log('getWeb3forChain', chainId)
        return new Web3(new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${ETH_INFURA_KEY}`))
    } else if (chainId === '0x97' || chainId === '97' || chainId === 97) {
        console.log('getWeb3forChain', chainId)
        return new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-1-s1.binance.org:8545`))
    } else {
        return new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${ETH_INFURA_KEY}`))
    }        
}
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
        // get proper chain web3
        const chainId = params.chainId;
        const web3_l = getWeb3forChain((typeof chainId !== 'string') ? chainId.toString() : chainId);
        // console.log('executeTX: web3 ', web3_l)
        
        // Prepare transaction
        // remark: added 'pending' to avoid 'Known Transaction' error
        const nonce = await web3_l.eth.getTransactionCount(params.fromAddress, 'pending');
        const tx = {
            gas: 1500000,
            gasPrice: '30000000000',
            from: params.fromAddress,
            data: params.encodedABI,
            chainId: chainId,
            to: params.toAddress,
            nonce: nonce,
        };
        console.log('executeTX: trying to sign and send:', tx)

        // Sign transaction
        let txHash = '0x'
        web3_l.eth.accounts.signTransaction(tx, params.fromAddressKey)
            .then((signed: any) => {
                // Send transaction
                web3_l.eth.sendSignedTransaction(signed.rawTransaction, 
                    async (err, hash) => {
                        if (err) {
                          console.error("sendSignedTransaction error", err);
                        } else {
                            txHash = hash;
                            console.error("sendSignedTransaction hash", 'hash', hash);
                        }
                      }
                    )
                    // .on('receipt', (recipt) => {
                    //     if (recipt.status) {
                    //         resolve({ success: true, error: '', data: recipt });
                    //     } else {
                    //         resolve({ success: false, error: 'Error in ethUtils.js (A) -> executeTX()', data: recipt });
                    //     }
                    // })
                    .on('confirmation', function(confirmationNumber, receipt) {
                        if (receipt.status) {
                            resolve({ success: true, error: '', data: receipt });
                        } else {
                            resolve({ success: false, error: 'Error in ethUtils.js (A) -> executeTX()', data: receipt });
                        }
                    })
                    .on('error', (err) => {
                        resolve({ success: false, error: err.toString(), data: txHash });
                    });
            })
            .catch((err: any) => {
                console.log('Error in ethUtils.js (B) -> executeTX(): ', err);
                resolve({ success: false, error: err, data: txHash });
            });
    });
};

// get price for uniswap liquidity token that might be imported either as a social token or community token
const getMainNetPrices =  async () => {
    const WBTC = new Token(ChainId.MAINNET, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8)
    const USDC = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6)
    try {
        const provider = new ethers.providers.InfuraProvider('mainnet', ETH_INFURA_KEY);

        // const pair = await Fetcher.fetchPairData(WBTC, WETH[WBTC.chainId], provider)
        // const route = new Route([pair], WETH[WBTC.chainId])
        // // console.log('ETH-wbtc',route.midPrice.toSignificant(6)) // 201.306
        // // console.log('ETH-wbtc inverted',route.midPrice.invert().toSignificant(6)) // 0.00496756
        // const ETH_WBTC_Price = route.midPrice.toSignificant(6);

        const pair2 = await Fetcher.fetchPairData(USDC, WETH[USDC.chainId], provider)
        const route2 = new Route([pair2], WETH[USDC.chainId])
        // console.log('Eth-USDC',route2.midPrice.toSignificant(6)) // 201.306
        // console.log('Eth-USDC inverted',route2.midPrice.invert().toSignificant(6)) // 0.00496756
        const ETH_USD_Price = route2.midPrice.toSignificant(10);

        const pair3 = await Fetcher.fetchPairData(USDC, WBTC, provider)
        const route3 = new Route([pair3], WBTC)
        // console.log('wbtc-USDC',route3.midPrice.toSignificant(6)) // 201.306
        // console.log('wbtc-USDC inverted',route3.midPrice.invert().toSignificant(6)) // 0.00496756
        const WBTC_USD_Price = route3.midPrice.toSignificant(10);

        return {EthInUsd: parseFloat(ETH_USD_Price), BtcInUsd: parseFloat(WBTC_USD_Price)};
    } catch (error) {
        console.log('connectController --> getMainNetPrices error', error)
        return {EthInUsd: 0, BtcInUsd: 0};
    }
};

const getTokenUniSwapPrices =  async (chainId, token0Address, decimals) => {
    const token0 = new Token(chainId, token0Address, decimals);
    // it is more efecient, is to use what coin it is paired with.. however for the lack of time we go with weth
    const token1 = new Token(chainId, chainId === 1 ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : '0xc778417E063141139Fce010982780140Aa0cD5Ab', 18)
    try {
        const netName = chainId === 3 ? 'ropsten' : chainId == 4 ? 'rinkeby' : 'mainnet';
        const provider = new ethers.providers.InfuraProvider(netName, ETH_INFURA_KEY);
        // console.log('-------------------------------------getTokenUniSwapPrices chain id', chainId, token0)
        const pair = await Fetcher.fetchPairData(token0, token1, provider)
        const route = new Route([pair], token0);
        const tokenInEth = parseFloat(route.midPrice.toSignificant(10));
        const mainNetPrices = await getMainNetPrices();
        const tokenInUsd = tokenInEth * mainNetPrices.EthInUsd;
        return {priceInEth: tokenInEth, priceInUsd: tokenInUsd};
    } catch (error) {
        console.log('connectController --> getTokenUniSwapPrices error', error)
        return {priceInEth: 0, priceInUsd: 0};
    }
};

const getUniSwapPrices = async (req: express.Request, res: express.Response) => {
    try {
        const { chainId, token0Address, decimals} = req.query;
        console.log('getUniSwapPrices req:', chainId, token0Address, decimals)
        const _chain: any = chainId?.toString();
        const _chainId: any = _chain.includes('x') ? String(_chain.split('x')[1]) : _chain;
        const _token0Address: any = token0Address?.toString();
        const _decimals: number = parseFloat(decimals ? decimals.toString() : '18');
        
        res.send(await getTokenUniSwapPrices(_chainId, _token0Address, _decimals));
    } catch (error) {
        res.send({priceInEth: 0, priceInUsd: 0});
        console.log('connectController --> getUniSwapPrices error', error)
    }
    
    
}

// const getERC20BalnceOf = (contractAddress: string, address: any, chainId: any) => {
//     return new Promise<number>(async (resolve) => {
//         if (contractAddress !== ZERO_ADDRESS) {
//             const web3_l: Web3 = getWeb3forChain(chainId);
//             const abi: any =  ERC20Balance.abi;
//             let contract = new web3_l.eth.Contract(abi, contractAddress);
//             await contract.methods.balanceOf(address).call()
//                 .then(result => {
//                     resolve(Number(web3_l.utils.fromWei((result), 'ether')));
//                 })
//                 .catch(err => {
//                     console.log('Error in connectController.ts -> callBalance(): [call]', err);
//                     resolve(0);
//                 })
//         } else {
//             resolve(0);
//         };
//     });
// };

// const getEthBalanceOf = async (address: string, chainId: string): Promise<Number> => {
//     const web3_l: Web3 = getWeb3forChain(chainId);
//     const balanceWei = await web3_l.eth.getBalance(address);
//     const balance = Number(web3_l.utils.fromWei(balanceWei, 'ether'));
//     return balance;
// }

// const mintERC20PodToken = async (podAddress:string, toAddress: string, amount: string, chainId: string) => {
//     const web3_l: Web3 = getWeb3forChain(chainId);
//     // get factory
//     let erc20FactoryJsonContract = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/' + ETH_CONTRACTS_ABI_VERSION + '/PRIVIPodERC20Factory.json')));
//     const factoryContract = new web3_l.eth.Contract(erc20FactoryJsonContract.abi, erc20FactoryJsonContract.networks[String(chainId.split('x')[1])]["address"]);
    
//     // mint token amount
//     // Choose method from PRIVIPodERC20Factory to be called
//     const amountWei = web3_l.utils.toWei(amount, 'ether');
//     const method = factoryContract.methods.podMint(podAddress, toAddress, amountWei).encodeABI();
//     // Transaction parameters
//     const paramsTX = {
//         chainId: chainId,
//         fromAddress: ETH_PRIVI_ADDRESS,
//         fromAddressKey: ETH_PRIVI_KEY,
//         encodedABI: method,
//         toAddress: factoryContract.options.address,
//     };
//     // Execute transaction 
//     const { success, data } = await executeTX(paramsTX);
//     // console.log('mintERC20PodToken', success, data)
//     return { success, data };
// }

// const getPodTokenDeployedAddress = async (podAddress:string, chainId: string): Promise<string> => {
//     const web3_l: Web3 = getWeb3forChain(chainId);
//     // get factory
//     let erc20FactoryJsonContract = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/' + ETH_CONTRACTS_ABI_VERSION + '/PRIVIPodERC20Factory.json')));
//     const factoryContract = new web3_l.eth.Contract(erc20FactoryJsonContract.abi, erc20FactoryJsonContract.networks[String(chainId.split('x')[1])]["address"]);

//     // add privi to accoutn
//     await web3_l.eth.accounts.privateKeyToAccount(ETH_PRIVI_KEY);
//     // get deployed address
//     const deployedAddress = await factoryContract.methods.podTokenAddresses(podAddress).call();
//     return deployedAddress;

// }

/**
 * @notice Receives a transaction from the front-end and:
 *  - If swap: call function to store TX in the database (to be processed by a chron afterwards)
 *  - If withdraw: call withdraw function
 */
const send = async (req: express.Request, res: express.Response) => {
    const body = req.body;
    // console.log('body', body)
    if (typeof body.action === 'string') {
        await saveTx(body);
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
    // console.log('saveTx',params)
    // Build object with fields to be stored in Firestore
    const data = {
        txPrivi: '0x',
        txHash: params.txHash,
        from: params.from,
        to: params.to,
        random: params.random,
        publicId: params.publicId,
        address: params.userAddress,
        chainId: params.chainId,
        action: params.action,
        description: params.description,
        amount: params.amount,
        token: params.token,
        status: params.status,
        lastUpdate: params.lastUpdate,
    };

    // Insert data into Firestore
    await db
        .collection(collections.ethTransactions)
        .add(data);
};

/**
 * @notice Updates the status of a transaction in the database
 * @param txHash Transaction hash
 * @param newStatus New transaction status
 */
// const updateTx = async (txHash: string, newStatus: string) => {

//     // Retrieve TX doc
//     const snapshot = await db
//         .collection(collections.ethTransactions)
//         .where('txHash', '==', txHash)
//         .get();

//     // Update TX status
//     for (var i in snapshot.docs) {
//         const res = await db
//             .collection(collections.ethTransactions)
//             .doc(snapshot.docs[i].id)
//             .set({ status: newStatus }, { merge: true });
//     };
// };

/**
 * @notice Check number of confirmations of a transaction in Ethereum
 * @return Number of confirmations (for testing, we set to 1 to get results faster)
 */
const checkTxConfirmations = async (txHash: string, chainId: string) => {
    const web3_l = getWeb3forChain(chainId);
    try {
        // Get transaction details
        const trx = await web3_l.eth.getTransaction(txHash);

        // Get current block number
        const currentBlock = await web3_l.eth.getBlockNumber();

        // When transaction is unconfirmed, its block number is null.
        // In this case we return 0 as number of confirmations
        return trx.blockNumber === null ? 0 : currentBlock - trx.blockNumber;
    } catch (err) {
        console.log('Error in ConnectController.ts -> checkTxConfirmations(): ', err);
    };
};



/**
 * @notice Cron that checks every X seconds if there is any transaction stored in the
 * database to be processed. The field 'action' determines whether executing swap, 
 * approve or withdraw
 */
const checkTx = cron.schedule(`*/${TX_LISTENING_CYCLE} * * * * *`, async () => {
    
    if (SHOULD_HANDLE_SWAP) {

        console.log('********* Swaping ETH <--> PRIVI cron job - STARTED - *********');

        // Start WS server if not initialized yet
        (!runOnce) ? wsListen() : null;

        //Retrieve all pending TX from Firestore
        const snapshot = await db
            .collection(collections.ethTransactions)
            .where('status', '==', 'pending')
            // .where('chainId', '==', CHAIN_ID)
            .get();

        // Process outstanding TX
        if (!snapshot.empty) {
            console.log('should check Tx for swap?', !snapshot.empty);
            for (let i in snapshot.docs) {
                const doc = snapshot.docs[i].data();
                const docId = snapshot.docs[i].id;
                if (/*doc.action === Action.SWAP_APPROVE_ERC20 ||*/
                    doc.action === Action.WITHDRAW_ETH ||
                    doc.action === Action.WITHDRAW_ERC20 || 
                    doc.action === Action.WITHDRAW_ERC721) {
                    console.log('performing withdraw', docId, doc.address, doc.to, doc.amount, doc.action, doc.token, doc.lastUpdate, doc.chainId);
                    withdraw(docId, doc.address, doc.to, doc.amount, doc.action, doc.token, doc.lastUpdate, doc.chainId)
                } else if (doc.action === Action.SWAP_APPROVE_ERC20 || doc.action === Action.SWAP_APPROVE_ERC721) {
                    const confirmations = await checkTxConfirmations(doc.txHash, doc.chainId) || 0;
                    console.log('is confirmation > ', MIN_ETH_CONFIRMATION, 'current confirmations', confirmations, confirmations > MIN_ETH_CONFIRMATION)
                    /* 
                        confirmation should be more 6 confirmation for BTC and 12 for ETH to be fully secure
                    */
                    if (confirmations > MIN_ETH_CONFIRMATION) {
                        console.log('approve should be set to confirmed');
                        updateStatusOneToOneSwap(docId, 'confirmed');
                        return;
                    };
                } else {
                    const confirmations = await checkTxConfirmations(doc.txHash, doc.chainId) || 0;
                    console.log('is confirmation > ', MIN_ETH_CONFIRMATION, 'current confirmations', confirmations, confirmations > MIN_ETH_CONFIRMATION)
                    /* 
                        confirmation should be more 6 confirmation for BTC and 12 for ETH to be fully secure
                    */
                    if (confirmations > MIN_ETH_CONFIRMATION) {
                        console.log('performing swap');
                        swap(docId, doc.publicId, doc.address, doc.from, doc.amount, doc.token, doc.txHash, doc.random, doc.action, doc.lastUpdate, doc.chainId);
                        return;
                    };
                }
            };
        };

        console.log('********* Swaping ETH <--> PRIVI cron job - ENDED - *********');

    }
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
 * @param lastUpdate Date of the swap in Unix timestamp
 */
const swap = async (
    swapDocId: string,
    publicId: string,
    userAddress: string,
    from: string,
    amount: string,
    token: string,
    txHash: string,
    random: string,
    action: string,
    lastUpdate: number,
    chainId: string) => {

    try {
        console.log('--> Swap: TX confirmed in Ethereum', swapDocId, token, amount, 'action', action);

        const response: any = await swapFab(
            action,
            from,
            userAddress,
            action === Action.SWAP_TRANSFER_ERC721 ? 1 : amount,
            token,
            'PRIVI'
        );

        if (response && response.success) {
            console.log('--> Swap: TX confirmed in Fabric: ', response);

            // Update balances in Firestore
            updateFirebase(response);

            // confirm swap: ** this could be moved to updateFireBase
            console.log('should confirm swap doc id', swapDocId)
            updateStatusOneToOneSwap(swapDocId, 'confirmed');
            updatePriviTxOneToOneSwap(swapDocId, response.hash);

        } else {
            console.log('Error in connectController.ts -> swap(): Swap call in Fabric not successful', response);
            // if we leave the status pending the back end will try later to make the swap
        };
    } catch (err) {
        console.log('Error in connectController.ts->swap(): ', err);
    };
};

/**
 * @notice Withdraw ETH or ERC20 tokens between Fabric's and Ethereum's User account
 * @param publicId User ID
 * @param to destination address
 * @param amount Amount to be swapped
 * @param token Ether (ETH) or coin type (DAI, UNI..)
 * @param txHash Transaction hash
 * @param lastUpdate Date of the withdrawal in Unix timestamp
 * @param random Random generated from the front-end as identifier for a withdraw request
 * @param action Action to be performed (swap ETH or swap ERC20 token)
 */

const withdraw = async (
    swapDocId: string,
    fromFabricAddress: string,
    toEthAddress: string,
    amount: any,
    action: string,
    token: string,
    date: string,
    chainId: string
) => {
    console.log('wothdraw called with', swapDocId, fromFabricAddress, toEthAddress, amount, action, token, date, chainId)

    const web3_l = getWeb3forChain(chainId);
    // set swap doc to in progress
    updateStatusOneToOneSwap(swapDocId, 'inProgress');
    // first burn fabric token
    // Withdraw in Fabric
    const response: any = await withdrawFab(
        action,
        fromFabricAddress,
        toEthAddress,
        action === Action.WITHDRAW_ERC721 ? 1 : amount,
        token,
        'PRIVI'
    );

    if (response && response.success) {
        console.log('burn fab', response.success)
        
        // Update balances in Firestore
        updateFirebase(response);
        updatePriviTxOneToOneSwap(swapDocId, response.hash);

        // Convert value into wei
        // const amountWei = web3_l.utils.toWei(String(amount));

        let swapManagerJsonContract = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/' + ETH_CONTRACTS_ABI_VERSION + '/SwapManager.json')));

        // console.log('swapManagerJsonContract.networks', swapManagerJsonContract.networks)
        const _chain: any = chainId?.toString();
        const _chainId: any = _chain.includes('x') ? String(_chain.split('x')[1]) : _chain;
        // Get SwapManager contract code
        const contract = new web3_l.eth.Contract(swapManagerJsonContract.abi, swapManagerJsonContract.networks[_chainId]["address"]);

        // check if contract has balance
        // let contractBalanceWei = web3.eth.getBalance(contract.address);
        console.log('perform withdraw:', 'token', token, 'toEthAddress', toEthAddress, 'amount', amount)

        // Choose method from SwapManager to be called
        const method = 
            (action === Action.WITHDRAW_ETH) ? contract.methods.withdrawEther(toEthAddress, web3_l.utils.toWei(String(amount)) ).encodeABI()
            : (action === Action.WITHDRAW_ERC20) ? contract.methods.withdrawERC20Token(token, toEthAddress, web3_l.utils.toWei(String(amount)) ).encodeABI()
            : contract.methods.withdrawERC721Token(token, toEthAddress, amount === 'NO_ID' ? '999999999' : amount, amount === 'NO_ID' ? true : false, false).encodeABI(); // hopefully this id won't exist, swapmanager needs update to account for minting pods

        // Transaction parameters
        const paramsTX = {
            chainId: chainId,
            fromAddress: ETH_PRIVI_ADDRESS,
            fromAddressKey: ETH_PRIVI_KEY,
            encodedABI: method,
            toAddress: contract.options.address,
        };

        // Execute transaction to withdraw in Ethereum
        const { success, error, data } = await executeTX(paramsTX);

        if (success) {
            console.log('--> Withdraw: TX confirmed in Ethereum', data);
            const txHash = data.transactionHash;
            //     await saveTx(paramsTx);
            updateStatusOneToOneSwap(swapDocId, 'confirmed');
            updateTxOneToOneSwap(swapDocId, txHash);
        } else {
            console.warn('--> Withdraw: TX failed in Ethereum', 'error', error, 'data', data, 'type of data is string?:', typeof data === 'string');
            console.warn('--> Withdraw:if send fail, then mint back fabric coin, and set status of swap to failed')
            const txHash = data.transactionHash;
            updateStatusOneToOneSwap(swapDocId, 'failed');
            updateTxOneToOneSwap(swapDocId, txHash);

            const mintBack = await swapFab(
                action === Action.WITHDRAW_ERC721 ? 'NFTPOD' : 'CRYPTO',
                '0x0000000000000000000000000000000000000000',
                fromFabricAddress,
                action === Action.WITHDRAW_ERC721 ? 1 : amount,
                token,
                'PRIVI'
            );

            if (mintBack.success) {
                console.warn('--> Withdraw: TX failed in Ethereum, mintback result:\n', mintBack);
                updateStatusOneToOneSwap(swapDocId, 'failed with return');
                updateFirebase(mintBack);
                updatePriviTxOneToOneSwap(swapDocId, mintBack.hash);
            } else {
                console.warn('--> Withdraw: TX failed in Ethereum, mintback result:', mintBack.success);
                updateStatusOneToOneSwap(swapDocId, 'failed without return');
            }
        };



    } else {
        console.log('fabric burn fail', response);
        // set back swap doc to pending, so it can be tried later
        updateStatusOneToOneSwap(swapDocId, 'pending');
    }

}

// get recent swaps from db
const getRecentSwaps = async (req: express.Request, res: express.Response) => {
    const { userId, userAddress } = req.query;
    // console.log('getRecentSwaps', userAddress)
    const recentSwaps = await loadRecentSwaps(userAddress);
    // console.log('recentSwaps', recentSwaps)
    if (recentSwaps) {
        res.send({ success: true, data: recentSwaps });
    } else {
        res.send({ success: false });
    }
}

// get registed token from the bridge manager
const getBridgeRegisteredToken = async (req: express.Request, res: express.Response) => {
    const { chainId } = req.query;
    console.log('getBridgeRegisteredToken req:', chainId)
    const _chain: any = chainId?.toString();
    const _chainId: any = _chain.includes('x') ? String(_chain.split('x')[1]) : _chain;
    const web3 = getWeb3forChain(_chainId);

    const bridgeManagerJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/' + ETH_CONTRACTS_ABI_VERSION + '/BridgeManager.json')));
    // Get SwapManager contract code
    const bridgeManagerContract = new web3.eth.Contract(bridgeManagerJson.abi, bridgeManagerJson.networks[_chainId]["address"]);

    const arrayRegisteredToken = await bridgeManagerContract.methods.getAllErc20Registered().call();
    // console.log('getBridgeRegisteredToken bridge array', arrayRegisteredToken)
    let tempArrayOfTokens: any[] = [{ id: 0, name: "Ethereum", symbol: "ETH", amount: 0 }];
    arrayRegisteredToken.forEach((element, index) => {
        tempArrayOfTokens.push({
        id: (index + 1), name: element.name, symbol: element.symbol, amount: 0, address: element.deployedAddress
        });
    });
    console.log('getBridgeRegisteredToken bridge , token list', tempArrayOfTokens)
    
    if (tempArrayOfTokens) {
        res.send({ success: true, data: tempArrayOfTokens });
    } else {
        res.send({ success: false });
    }
}

module.exports = {
    // registerNewERC20TokenOnSwapManager, 
    getUniSwapPrices,
    getBridgeRegisteredToken,
    send,
    checkTx,
    getRecentSwaps
};
