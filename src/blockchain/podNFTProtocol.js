const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePodNFT = async (creatorId, tokenSymbol, tokenName, supply, royalty, dateExpiration, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/initiatePOD", {
        Creator: creatorId,
        TokenSymbol: tokenSymbol,
        TokenName: tokenName,
        Supply: supply,
        Royalty: royalty,
        DateExpiration: dateExpiration,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newBuyOrder = async (orderId, amount, price, token, podAddress, bAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newBuyOrder", {
        Offer: {
            OrderId: orderId,
            Amount: amount,
            Price: price,
            Token: token,
            PodAddress: podAddress,
            BAddress: bAddress
        },
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newSellOrder = async (orderId, amount, price, token, podAddress, sAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newSellOrder", {
        Offer: {
            OrderId: orderId,
            Amount: amount,
            Price: price,
            Token: token,
            PodAddress: podAddress,
            SAddress: sAddress
        },
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.deleteBuyOrder = async (orderId, requesterAddress, podAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteBuyOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        PodAddress: podAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.deleteSellOrder = async (orderId, requesterAddress, podAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteSellOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        PodAddress: podAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.buyPodTokens = async (podAddress, sAddress, orderId, amount, buyerAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/buyPodTokens", {
        PodAddress: podAddress,
        SAddress: sAddress,
        OrderId: orderId,
        Amount: amount,
        BuyerAddress: buyerAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.sellPodTokens = async (podAddress, bAddress, orderId, amount, sellerAddress, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/sellPodTokens", {
        PodAddress: podAddress,
        BAddress: bAddress,
        OrderId: orderId,
        Amount: amount,
        SellerAddress: sellerAddress,
        Hash: hash,
        Signature: signature,
        Caller: caller

    });
    return blockchainRes.data;
};