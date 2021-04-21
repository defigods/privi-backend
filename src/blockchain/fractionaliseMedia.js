const axios = require("axios");
const api = require("./blockchainApi");

module.exports.fractionalise = async (tokenSymbol, ownerAddress, fraction, buyBackPrice, initialPrice,
    fundingToken, interestRate, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/Fractionalise", {
        TokenSymbol: tokenSymbol,
        OwnerAddress: ownerAddress,
        Fraction: fraction,
        BuyBackPrice: buyBackPrice,
        InitialPrice: initialPrice,
        FundingToken: fundingToken,
        InterestRate: interestRate,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newBuyOrder = async (amount, price, token, tokenSymbol, bAddress, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/newBuyOrder", {
        Offer: {
            Amount: amount,
            Price: price,
            Token: token,
            TokenSymbol: tokenSymbol,
            BAddress: bAddress
        },
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.newSellOrder = async (amount, price, token, tokenSymbol, sAddress, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/newSellOrder", {
        Offer: {
            Amount: amount,
            Price: price,
            Token: token,
            TokenSymbol: tokenSymbol,
            SAddress: sAddress
        },
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.deleteBuyOrder = async (orderId, requesterAddress, tokenSymbol, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/deleteBuyOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        TokenSymbol: tokenSymbol,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.deleteSellOrder = async (orderId, requesterAddress, tokenSymbol, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/deleteSellOrder", {
        OrderId: orderId,
        RequesterAddress: requesterAddress,
        TokenSymbol: tokenSymbol,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyFraction = async (tokenSymbol, sAddress, orderId, amount, buyerAddress, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/buyFraction", {
        TokenSymbol: tokenSymbol,
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

module.exports.sellFraction = async (tokenSymbol, bAddress, orderId, amount, sellerAddress, hash, signature, caller) => {
    const blockchainRes = await axios.post(api.blockchainFractionaliseMediaAPI + "/sellFraction", {
        TokenSymbol: tokenSymbol,
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