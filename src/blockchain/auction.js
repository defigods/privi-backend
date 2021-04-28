const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createAuction = async (mediaSymbol, tokenSymbol, owner, bidIncrement,  startTime, endTime, ipfHash, caller) => {
    let blockchainRes = await axios.post(api.blockchainAuctionsAPI + "/createAuction", {
        Data: {
            MediaSymbol: mediaSymbol,
            TokenSymbol: tokenSymbol,
            Owner: owner,
            BidIncrement: bidIncrement,
            StartTime: startTime,
            EndTime: endTime,
            IpfHash: ipfHash,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.placeBid = async (mediaSymbol, tokenSymbol, owner, address,  amount, caller) => {
    let blockchainRes = await axios.post(api.blockchainAuctionsAPI + "/placeBid", {
        Data: {
            MediaSymbol: mediaSymbol,
            TokenSymbol: tokenSymbol,
            Owner: owner,
            Address: address,
            Amount: amount,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.cancelAuction = async (mediaSymbol, tokenSymbol, owner, caller) => {
    let blockchainRes = await axios.post(api.blockchainAuctionsAPI + "/cancelAuction", {
        Data: {
            MediaSymbol: mediaSymbol,
            TokenSymbol: tokenSymbol,
            Owner: owner,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.withdrawAuction = async (mediaSymbol, tokenSymbol, owner, caller) => {
    let blockchainRes = await axios.post(api.blockchainAuctionsAPI + "/withdrawAuction", {
        Data: {
            MediaSymbol: mediaSymbol,
            TokenSymbol: tokenSymbol,
            Owner: owner,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};