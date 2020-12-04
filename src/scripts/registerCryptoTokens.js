// This script should be called each time the blockchain restarts (or we resert firestore) to register all the crypto tokens to the system
// as well as adding this tokens info (type, supply..etc) to firestore

let firebase = require("../firebase/firebase.js");
let coinBalance = require("../blockchain/coinBalance.js");
let collection = require("../firebase/collections.js");

require('dotenv').config();
//const apiKey = process.env.API_KEY;
const apiKey = "PRIVI"; // just for now

const type = "CRYPTO";
const addressId = "PRIVI";
const caller = apiKey;

const tokens = [
    { "Name": "PRIVI Coin", "Symbol": "PRIVI", "Supply": 0 },
    { "Name": "Base Coin", "Symbol": "BC", "Supply": 0 },
    { "Name": "Data Coin", "Symbol": "DC", "Supply": 0 },
    { "Name": "PRIVI Insurance Token", "Symbol": "PI", "Supply": 0 },
    { "Name": "Balancer", "Symbol": "BAL", "Supply": 0 },
    { "Name": "Basic Attention Token", "Symbol": "BAT", "Supply": 0 },
    { "Name": "Compound", "Symbol": "COMP", "Supply": 0 },
    { "Name": "Dai Stablecoin", "Symbol": "DAI", "Supply": 0 },
    { "Name": "Ethereum", "Symbol": "ETH", "Supply": 0 },
    { "Name": "Chainlink", "Symbol": "LINK", "Supply": 0 },
    { "Name": "MakerDAO", "Symbol": "MKR", "Supply": 0 },
    { "Name": "Uniswap", "Symbol": "UNI", "Supply": 0 },
    { "Name": "Tether", "Symbol": "USDT", "Supply": 0 },
    { "Name": "Wrapped Bitcoin", "Symbol": "WBTC", "Supply": 0 },
    { "Name": "Yearn Finance", "Symbol": "YFI", "Supply": 0 },
];

tokens.forEach(async (token) => {
    try {
        const blockchainRes = await coinBalance.registerToken(token.Name, type, token.Symbol, token.Supply, addressId, caller);
        if (blockchainRes.success) {
            const docData = blockchainRes.output.UpdateTokens[token.Symbol];
            firebase.db.collection(collection.tokens).doc(token.Symbol).set(docData);
        }
        else console.log("error registering ", token.Name, " => ", blockchainRes);
    }
    catch (err) {
        console.log(err);
    }
});