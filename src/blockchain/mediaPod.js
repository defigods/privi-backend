const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePod = async (podInfo, medias, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaPodAPI + "/initiatePod", {
        PodInfo: podInfo,
        Medias: medias,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.registerMedia = async (requester, podAddress, mediaSymbol, copies, royalty, fundingToken, tokenType, price, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaPodAPI + "/initiatePod", {
        Requester: requester,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Copies: copies,
        Royalty: royalty,
        FundingToken: fundingToken,
        TokenType: tokenType,
        Price: price,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.uploadMedia = async (mediaSymbol, podAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaPodAPI + "/initiatePod", {
        MediaSymbol: mediaSymbol,
        PodAddress: podAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};


module.exports.investPod = async (investor, podAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaPodAPI + "/initiatePod", {
        Investor: investor,
        PodAddress: podAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyMediaToken = async (buyer, podAddress, mediaSymbol, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainMediaPodAPI + "/initiatePod", {
        Buyer: buyer,
        PodAddress: podAddress,
        MediaSymbol: mediaSymbol,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};