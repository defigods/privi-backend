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

module.exports.createLiquidityPool = async (poolAddress, poolToken, minFee, maxFee, riskParameter, regimePoint, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/createLiquidityPool", {
        Token: poolAddress,
        PoolToken: poolToken,
        MinFee: minFee,
        MaxFee: maxFee,
        RiskParameter: riskParameter,
        RegimePoint: regimePoint,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.depositLiquidity = async (liquidityProviderAddress, poolToken, amount, depositId, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/depositLiquidity", {
        liquidityProviderAddress: liquidityProviderAddress,
        poolToken: poolToken,
        Amount: amount,
        depositId: depositId,
        txnId: txnId,
        caller: caller,
    });
    return blockchainRes.data;
};

module.exports.swapCrytoTokens = async (traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/swapCrytoTokens", {
        TraderAddress: traderAddress,
        TokenFrom: tokenFrom,
        TokenTo: tokenTo,
        AmountFrom: amountFrom,
        Rate: rate,
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.protectLiquidityPool = async (poolToken, poolSpread, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/protectLiquidityPool", {
        PoolToken: poolToken,
        PoolSpread: poolSpread,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.listLiquidityPool = async (poolToken, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/listLiquidityPool", {
        PoolToken: poolToken,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getLiquidityPoolInfo = async (poolToken) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/getLiquidityPoolInfo", {
        PoolToken: poolToken
    });
    return blockchainRes.data;
};

module.exports.getLiquidityPoolState = async (poolToken) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/getLiquidityPoolState", {
        PoolToken: poolToken
    });
    return blockchainRes.data;
};

module.exports.getLiquidityDeposits = async (address) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/getLiquidityDeposits", {
        Address: address
    });
    return blockchainRes.data;
};

module.exports.getLiquidityProviders = async (poolToken) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/getLiquidityProviders", {
        PoolToken: poolToken
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

