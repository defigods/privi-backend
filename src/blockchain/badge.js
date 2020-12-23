const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createBadge = async (creator, name, symbol, totalSupply, royalty, date, lockUpDate, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainBadgesAPI + "/createBadge", {
        Creator: creator,
        Name: name,
        Symbol: symbol,
        TotalSupply: totalSupply,
        Royalty: royalty,
        Date: date,
        LockUpDate: lockUpDate,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};