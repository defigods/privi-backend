const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePOD = async (creatorId, token, duration, payments, principal, interest, p_liquidation, initialSupply, collaterals, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/initiatePOD", {
        PodInfo: {
            Creator: creatorId,
            Token: token,
            Duration: duration,
            Payments: payments,
            Principal: principal,
            Interest: interest,
            P_liquidation: p_liquidation,
            InitialSupply: initialSupply
        },
        Collaterals: collaterals,
        RateChange: rateOfChange
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

module.exports.investPOD = async (investorId, podId, amount, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/investPOD", {
        InvestorId: investorId,
        PodId: podId,
        Amount: amount,
        RateChange: rateOfChange
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
