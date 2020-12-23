const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePodNFT = async (creatorId, token, royalty, offers) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/initiatePodNFT", {
        PodInfo: {
            Creator: creatorId,
            Token: token,
            Royalty: royalty
        },
        Offers: offers
    });
    return blockchainRes.data;
};

module.exports.newBuyOrder = async (podId, trader, amount, price) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newBuyOrder", {
        PodId: podId,
        Trader: trader,
        Amount: amount,
        Price: price
    });
    return blockchainRes.data;
};

module.exports.newSellOrder = async (podId, trader, amount, price) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/newSellOrder", {
        PodId: podId,
        Trader: trader,
        Amount: amount,
        Price: price
    });
    return blockchainRes.data;
};

module.exports.deleteBuyOrder = async (podId, orderId, trader) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteBuyOrder", {
        PodId: podId,
        OrderId: orderId,
        Trader: trader,
    });
    return blockchainRes.data;
};

module.exports.deleteSellOrder = async (podId, orderId, trader) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/deleteSellOrder", {
        PodId: podId,
        OrderId: orderId,
        Trader: trader,
    });
    return blockchainRes.data;
};

module.exports.buyPodNFT = async (podId, trader, orderId, amount) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/buyPodNFT", {
        PodId: podId,
        Trader: trader,
        OrderId: orderId,
        Amount: amount
    });
    return blockchainRes.data;
};

module.exports.sellPodNFT = async (podId, trader, orderId, amount) => {
    let blockchainRes = await axios.post(api.blockchainPodNFTPodAPI + "/sellPodNFT", {
        PodId: podId,
        Trader: trader,
        OrderId: orderId,
        Amount: amount
    });
    return blockchainRes.data;
};