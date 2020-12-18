const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createCommunity = async (creator, communityAddress, ammAddress, amm, targetSupply, targetPrice, spreadDividend, fundingToken, tokenSymbol, tokenName, frequency, initialSupply, date, dateLockUpDate, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/createCommunity", {
        Creator: creator,
        CommunityAddress: communityAddress,
        AMMAddress: ammAddress,
        AMM: amm,
        TargetSupply: targetSupply,
        TargetPrice: TargetPrice,
        SpreadDividend: spreadDividend,
        FundingToken: fundingToken,
        TokenSymbol: tokenSymbol,
        TokenName: tokenName,
        Frequency: frequency,
        InitialSupply: initialSupply,

        TxnId: txnId,
        Date: date,
        DateLockUpDate: dateLockUpDate,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.sellCommunityToken = async (investor, communityAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/sellCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyCommunityToken = async (investor, communityAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/buyCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.stakeCommunityFunds = async (lpAddress, communityAddress, amount, stakingToken, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/stakeCommunityFunds", {
        LPAddress: lpAddress,
        CommunityAddress: communityAddress,
        Amount: amount,
        StakingToken: stakingToken,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.payCommunityDividends = async (communityAddress, rateOfChange, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/payCommunityDividends", {
        CommunityAddress: communityAddress,
        RateChange: rateOfChange,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};