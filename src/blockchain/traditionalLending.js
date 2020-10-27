const axios = require("axios");
const api = require("./blockchainApi");

module.exports.borrowFunds = async (publicId, token, amount, collaterals, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/borrowFunds", {
        PublicId: publicId,
        Token: token,
        Amount: amount,
        Collaterals: collaterals,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.repayFunds = async (publicId, token, amount) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/repayFunds", {
        PublicId: publicId,
        Token: token,
        Amount: amount,
    });
    return blockchainRes.data;
};

module.exports.depositCollateral = async (publicId, token, collaterals) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/depositCollateral", {
        PublicId: publicId,
        Token: token,
        Collaterals: collaterals,
    });
    return blockchainRes.data;
};

module.exports.withdrawCollateral = async (publicId, token, collaterals, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/withdrawCollateral", {
        PublicId: publicId,
        Token: token,
        Collaterals: collaterals,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.payInterests = async (lendingInterest, stakingInterest, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/payInterests", {
        LendingInterest: lendingInterest,
        StakingInterest: stakingInterest,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.checkLiquidation = async (publicId, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/checkLiquidation", {
        PublicId: publicId,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.stakeToken = async (publicId, tokenName, amount) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/stakeToken", {
        PublicId: publicId,
        Token: tokenName,
        Amount: amount
    });
    return blockchainRes.data;
};

module.exports.unstakeToken = async (publicId, tokenName, amount) => {
    let blockchainRes = await axios.post(api.blockchainTraditionalLendingAPI + "/unStakeToken", {
        PublicId: publicId,
        Token: tokenName,
        Amount: amount
    });
    return blockchainRes.data;
};
