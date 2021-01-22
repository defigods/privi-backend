const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createSocialToken = async (creator, amm, spreadDividend, fundingToken, tokenSymbol, tokenName, dividendFreq, initialSupply, targetSupply, targetPrice, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainSocialAPI + "/createSocialToken", {
        Creator: creator,
        AMM: amm,
        SpreadDividend: spreadDividend,
        FundingToken: fundingToken,
        TokenSymbol: tokenSymbol,
        TokenName: tokenName,
        DividendFreq: dividendFreq,
        InitialSupply: initialSupply,
        TargetSupply: targetSupply,
        TargetPrice: targetPrice,

        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.sellSocialToken = async (investor, poolAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainSocialAPI + "/sellSocialToken", {
        Investor: investor,
        PoolAddress: poolAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
};

module.exports.buySocialToken = async (investor, poolAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainSocialAPI + "/buySocialToken", {
        Investor: investor,
        PoolAddress: poolAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller,
    });
    return blockchainRes.data;
};



module.exports.getSocialTokenPrice = async (poolAddress, caller) => {
    const config = {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
        url: api.blockchainCoinBalanceAPI + "/getSocialTokenPrice",
        data: JSON.stringify({
            PoolAddress: poolAddress,
            Caller: caller,
        })
    }
    let blockchainRes = await axios(config);
    return blockchainRes.data;
};