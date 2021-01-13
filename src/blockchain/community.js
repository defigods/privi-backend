const axios = require("axios");
const api = require("./blockchainApi");

module.exports.createCommunity = async (creator, amm, targetSupply, targetPrice, spreadDividend, fundingToken, tokenSymbol, tokenName, frequency, initialSupply, dateLockUpDate, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/createCommunity", {
        Creator: creator,
        AMM: amm,
        TargetSupply: targetSupply,
        TargetPrice: targetPrice,
        SpreadDividend: spreadDividend,
        FundingToken: fundingToken,
        TokenSymbol: tokenSymbol,
        TokenName: tokenName,
        Frequency: frequency,
        InitialSupply: initialSupply,
        DateLockUpDate: dateLockUpDate,

        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.sellCommunityToken = async (investor, communityAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/sellCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyCommunityToken = async (investor, communityAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/buyCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.stakeCommunityFunds = async (lpAddress, communityAddress, amount, stakingToken, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/stakeCommunityFunds", {
        LPAddress: lpAddress,
        CommunityAddress: communityAddress,
        Amount: amount,
        StakingToken: stakingToken,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.payCommunityDividends = async (communityAddress, rateOfChange, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/payCommunityDividends", {
        CommunityAddress: communityAddress,
        RateChange: rateOfChange,
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

module.exports.endVotation = async (votationId, votationAddress, date, TxnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainVotationAPI + "/payCommunityDividends", {
        VotationId: votationId,
        VotationAddress: votationAddress,
        Date: date,
        TxnId: TxnId,
        Caller: caller,
    });
    return blockchainRes.data;
};