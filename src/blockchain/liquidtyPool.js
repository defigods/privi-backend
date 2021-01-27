const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createLiquidityPool = async (poolToken, minFee, maxFee, riskParameter, regimePoint, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/createLiquidityPool", {
        PoolToken: poolToken,
        MinFee: minFee,
        MaxFee: maxFee,
        RiskParameter: riskParameter,
        RegimePoint: regimePoint,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.depositLiquidity = async (liquidityProviderAddress, poolToken, amount, depositId, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/depositLiquidity", {
        LiquidityProviderAddress: liquidityProviderAddress,
        PoolToken: poolToken,
        Amount: amount,
        DepositId: depositId,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.swapCryptoTokens = async (traderAddress, tokenFrom, tokenTo, amountFrom, rate, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainLiquidityPoolAPI + "/swapCryptoTokens", {
        TraderAddress: traderAddress,
        TokenFrom: tokenFrom,
        TokenTo: tokenTo,
        AmountFrom: amountFrom,
        Rate: rate,
        Hash: hash,
        Signature: signature,
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

module.exports.getSwapPrice = async (tokenFrom, tokenTo, amountFrom, rate, caller) => {
    const config = {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
        url: api.blockchainLiquidityPoolAPI + "/getSwapPrice",
        data: JSON.stringify({
            TokenFrom: tokenFrom,
            TokenTo: tokenTo,
            AmountFrom: amountFrom,
            Rate: rate,
            Caller: caller
        })
    }
    console.log({
        TokenFrom: tokenFrom,
        TokenTo: tokenTo,
        AmountFrom: amountFrom,
        Rate: rate,
        Caller: caller
    });
    const blockchainRes = await axios(config);
    return blockchainRes.data;
};