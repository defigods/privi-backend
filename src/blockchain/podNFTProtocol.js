const axios = require("axios");
const { supplyHisotry } = require("../firebase/collections");
const api = require("./blockchainApi");

module.exports.initiatePodNFT = async (creatorId, podAddress, tokenSymbol, tokenName, supply, royalty, date, dateExpiration, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/initiatePodNFT", {
        Creator: creatorId,
        PodAddress: podAddress,
        TokenSymbol: tokenSymbol,
        TokenName: tokenName,
        Supply: supply,
        Royalty: royalty,
        Date: date,
        DateExpiration: dateExpiration,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newBuyOrder = async (orderId, amount, price, token, podAddress, bAddress, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newBuyOrder", {
        Offer: {
            OrderId: orderId,
            Amount: amount,
            Price: price,
            Token: token,
            PodAddress: podAddress,
            BAddress: bAddress
        },
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newSellOrder = async (orderId, amount, price, token, podAddress, sAddress, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newSellOrder", {
        Offer: {
            OrderId: orderId,
            Amount: amount,
            Price: price,
            Token: token,
            PodAddress: podAddress,
            SAddress: sAddress
        },
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.deleteBuyOrder = async (orderId, requesterAddress, podAddress, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteBuyOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        PodAddress: podAddress,
        Date: date,
        TxnId: txnId,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.deleteSellOrder = async (orderId, requesterAddress, podAddress, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteSellOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        PodAddress: podAddress,
        Date: date,
        TxnId: txnId,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.buyPodNFT = async (podAddress, sAddress, orderId, amount, buyerAddress, txnId, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/buyPodNFT", {
        PodAddress: podAddress,
        SAddress: sAddress,
        OrderId: orderId,
        Amount: amount,
        BuyerAddress: buyerAddress,
        TxnId: txnId,
        Date: date,
        Caller: caller

    });
    return blockchainRes.data;
};

module.exports.sellPodNFT = async (podAddress, bAddress, orderId, amount, sellerAddress, txnId, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/sellPodNFT", {
        PodAddress: podAddress,
        BAddress: bAddress,
        OrderId: orderId,
        Amount: amount,
        sellerAddres: sellerAddress,
        TxnId: txnId,
        Date: date,
        Caller: caller

    });
    return blockchainRes.data;
};