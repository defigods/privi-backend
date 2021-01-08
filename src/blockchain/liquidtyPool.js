const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createLiquidityPool = async (poolAddress, poolToken, minFee, maxFee, riskParameter, regimePoint, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/createLiquidityPool", {
        PoolAddress: poolAddress,
        PoolToken: poolToken,
        MinFee: minFee,
        MaxFee: maxFee,
        RiskParameter: riskParameter,
        RegimePoint: regimePoint,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.depositLiquidity = async (liquidityProviderAddress, poolToken, amount, depositId, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/depositLiquidity", {
        LiquidityProviderAddress: liquidityProviderAddress,
        PoolToken: poolToken,
        Amount: amount,
        DepositId: depositId,
        TxnId: txnId,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.swapCrytoTokens = async (traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/swapCrytoTokens", {
        TraderAddress: traderAddress,
        TokenFrom: tokenFrom,
        TokenTo: tokenTo,
        AmountFrom: amountFrom,
        Rate: rate,
        Date: date,
        TxnId: txnId,
        Caller: caller,
    });
    return blockchainRes.data;
};


module.exports.listLiquidityPool = async (poolToken, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/listLiquidityPool", {
        PoolToken: poolToken,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.protectLiquidityPool = async (poolToken, poolSpread, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/protectLiquidityPool", {
        PoolToken: poolToken,
        PoolSpread: poolSpread,
        Date: date,
        Caller: caller,
    });
    return blockchainRes.data;
};