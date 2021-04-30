const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createExchange = async (address, exchangeToken, initialAmount, offerToken, price, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/createExchange", {
        Data: {
            Address: address,
            ExchangeToken: exchangeToken,
            InitialAmount: initialAmount,
            OfferToken: offerToken,
            Price: price
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.placeBuyingOffer = async (exchangeId, address, amount, price, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/placeBuyingOffer", {
        Data: {
            ExchangeId: exchangeId,
            Address: address,
            Amount: amount,
            Price: price
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.placeSellingOffer = async (exchangeId, address, amount, price, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/placeSellingOffer", {
        Data: {
            ExchangeId: exchangeId,
            Address: address,
            Amount: amount,
            Price: price
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.buyFromOffer = async (exchangeId, offerId, address, amount, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/buyFromOffer", {
        Data: {
            ExchangeId: exchangeId,
            OfferId: offerId,
            Address: address,
            Amount: amount,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.sellFromOffer = async (exchangeId, offerId, address, amount, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/sellFromOffer", {
        Data: {
            ExchangeId: exchangeId,
            OfferId: offerId,
            Address: address,
            Amount: amount,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.cancelBuyingOffer = async (exchangeId, offerId, address, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/cancelBuyingOffer", {
        Data: {
            ExchangeId: exchangeId,
            OfferId: offerId,
            Address: address,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.cancelSellingOffer = async (exchangeId, offerId, address, caller) => {
    const blockchainRes = await axios.post(api.blockchainExchangeAPI + "/cancelSellingOffer", {
        Data: {
            ExchangeId: exchangeId,
            OfferId: offerId,
            Address: address,
        },
        Caller: caller,
    });
    return blockchainRes.data;
};