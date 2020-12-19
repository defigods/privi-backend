const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createCommunity = async (creator, communityAddress, ammAddress, votationAddress, stakingAddress, amm, targetSupply, targetPrice, spreadDividend, fundingToken, tokenSymbol, tokenName, frequency, initialSupply, date, dateLockUpDate, txnId, caller) => {
    console.log("calling blockchain with", {
        Creator: creator,
        CommunityAddress: communityAddress,
        AMMAddress: ammAddress,
        VotationAddress: votationAddress,
        StakingAddress: stakingAddress,
        AMM: amm,
        TargetSupply: targetSupply,
        TargetPrice: targetPrice,
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
    })

    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/createCommunity", {
        Creator: creator,
        CommunityAddress: communityAddress,
        AMMAddress: ammAddress,
        VotationAddress: votationAddress,
        StakingAddress: stakingAddress,
        AMM: amm,
        TargetSupply: targetSupply,
        TargetPrice: targetPrice,
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

module.exports.createVotation = async (creatorAddress, votationId, votationAddress, votingToken, quorumRequiered, startingDate, endingDate, caller) => {
    let blockchainRes = await axios.post(api.blockchainVotationAPI + "/payCommunityDividends", {
        CreatorAddress: creatorAddress,
        VotationId: votationId,
        VotationAddress: votationAddress,
        VotingToken: votingToken,
        QuorumRequiered: quorumRequiered,
        StartingDate: startingDate,
        EndingDate: endingDate,
        Caller: caller,
    });
    return blockchainRes.data;
};