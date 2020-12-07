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

// -------------------- liquidity pool ---------------------

module.exports.createLiquidityPool = async (creatorId, token, minReserveRatio, initialAmount, fee, withdrawalTime, withdrawalFee, minEndorsementScore, minTrustScore) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/createLiquidityPool", {
        Token: token,
        CreatorId: creatorId,
        MinReserveRatio: minReserveRatio,
        InitialAmount: initialAmount,
        Fee: fee,
        WithdrawalTime: withdrawalTime,
        WithdrawalFee: withdrawalFee,
        MinTrustScore: minTrustScore,
        MinEndScore: minEndorsementScore
    });
    return blockchainRes.data;
};


module.exports.depositLiquidity = async (liquidityPoolId, providerId, amount) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/depositLiquidity", {
        LiqPoolId: liquidityPoolId,
        LiqProviderId: providerId,
        Amount: amount
    });
    return blockchainRes.data;
};

module.exports.withdrawLiquidity = async (liquidityPoolId, providerId, amount, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/withdrawLiquidity", {
        LiqPoolId: liquidityPoolId,
        LiqProviderId: providerId,
        Amount: amount,
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
