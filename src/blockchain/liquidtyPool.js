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

module.exports.depositLiquidity = async (liquidityProviderAddress, poolToken, amount, depositId, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/depositLiquidity", {
        LiquidityProviderAddress: liquidityProviderAddress,
        PoolToken: poolToken,
        Amount: amount,
        DepositId: depositId,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.swapCryptoTokens = async (traderAddress, tokenFrom, tokenTo, amountFrom, rate, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/swapCryptoTokens", {
        TraderAddress: traderAddress,
        TokenFrom: tokenFrom,
        TokenTo: tokenTo,
        AmountFrom: amountFrom,
        Rate: rate,
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

module.exports.protectLiquidityPool = async (poolToken, poolSpread, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/protectLiquidityPool", {
        PoolToken: poolToken,
        PoolSpread: poolSpread,
        Caller: caller,
    });
    return blockchainRes.data;
};