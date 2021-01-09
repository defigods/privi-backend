const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createBadge = async (creator, name, symbol, totalSupply, royalty, classification, date, lockUpDate, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainBadgesAPI + "/createBadge", {
        Creator: creator,
        Name: name,
        Symbol: symbol,
        TotalSupply: totalSupply,
        Royalty: royalty,
        Class: classification,
        Date: date,
        LockUpDate: lockUpDate,
        TxnId: txnId,
        Caller: "PRIVI"
    });
    return blockchainRes.data;
};