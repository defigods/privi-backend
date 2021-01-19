const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createBadge = async (creator, name, symbol, type, totalSupply, royalty, lockUpDate, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainBadgesAPI + "/createBadge", {
        Creator: creator,
        Name: name,
        Symbol: symbol,
        Type: type,
        TotalSupply: totalSupply,
        Royalty: royalty,
        LockUpDate: lockUpDate,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
};