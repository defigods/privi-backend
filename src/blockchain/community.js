const axios = require("axios");
const api = require("./blockchainApi");

module.exports.getCommunityState = async (communityAddress, caller) => {
    const config = {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
        url: api.blockchainCommunityAPI + "/getCommunityState",
        data: JSON.stringify({
            CommunityAddress: communityAddress,
            Caller: caller,
        })
    }
    let blockchainRes = await axios(config);
    return blockchainRes.data;
};

module.exports.allocateFunds = async (userAddress, communityAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/allocateFunds", {
        UserAddress: userAddress,
        CommunityAddress: communityAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.setVestingConditions = async (communityAddress, vestingTime, immediateAllocationPct, vestedAllocationPct, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/setVestingConditions", {
        CommunityAddress: communityAddress,
        VestingTime: vestingTime,
        ImmediateAllocationPct: immediateAllocationPct,
        VestedAllocationPct: vestedAllocationPct,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getCommunityTokenPrice = async (communityAddress, caller) => {
    const config = {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
        url: api.blockchainCommunityAPI + "/getCommunityTokenPrice",
        data: JSON.stringify({
            CommunityAddress: communityAddress,
            Caller: caller,
        })
    }
    let blockchainRes = await axios(config);
    return blockchainRes.data;
};

module.exports.createCommunity = async (creator, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/createCommunity", {
        Creator: creator,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.createCommunityToken = async (data) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/createCommunityToken", data);
    return blockchainRes.data;
}

module.exports.sellCommunityToken = async (investor, communityAddress, amount, price, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/sellCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        ExternalPrice: price,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.buyCommunityToken = async (investor, communityAddress, amount, price, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainCommunityAPI + "/buyCommunityToken", {
        Investor: investor,
        CommunityAddress: communityAddress,
        Amount: amount,
        ExternalPrice: price,
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