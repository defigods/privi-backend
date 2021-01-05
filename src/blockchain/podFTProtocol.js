const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePOD = async (creatorId, address, amm, spreadTarget, spreadExchange, tokenSymbol, tokenName, fundingToken, duration, frequency, principal, interest, liquidationCCR, date, dateExpiration,
    collaterals, rateOfChange, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/initiatePOD", {
        PodInfo: {
            Creator: creatorId,

            PodAddress: address,
            AMM: amm,
            SpreadTarget: spreadTarget,
            SpreadExchange: spreadExchange,
            TokenSymbol: tokenSymbol,
            TokenName: tokenName,
            FundingToken: fundingToken,

            Duration: duration,
            Frequency: frequency,
            Principal: principal,
            Interest: interest,
            LiquidationCCR: liquidationCCR,
            Date: date,
            DateExpiration: dateExpiration,

            Collaterals: collaterals,
        },
        RateChange: rateOfChange,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.deletePod = async (publicId, podId) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/deletePOD", {
        PublicId: publicId,
        PodId: podId
    });
    return blockchainRes.data;
};

module.exports.investPOD = async (investorId, podId, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/investPOD", {
        Investor: investorId,
        PodAddress: podId,
        Amount: amount,
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.sellPOD = async (investorId, podId, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/sellPodToken", {
        Investor: investorId,
        PodAddress: podId,
        Amount: amount,
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.interestPOD = async (podId, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/interestPOD", {
        PodId: podId,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.checkPODLiquidation = async (podId, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/checkPODLiquidation", {
        PodId: podId,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};






module.exports.swapPOD = async (investorId, liquidityPoolId, podId, amount, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/swapPOD", {
        InvestorId: investorId,
        LiqPoolId: liquidityPoolId,
        PodId: podId,
        Amount: amount,
        RateChange: rateOfChange,
        Type: "CRYPTO"
    });
    return blockchainRes.data;
};

