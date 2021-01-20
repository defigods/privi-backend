const axios = require("axios");
const api = require("./blockchainApi");

module.exports.stakeToken = async (userAddress, token, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/stakeFunds", {
        UserAddress: userAddress,
        Token: token,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.unstakeToken = async (userAddress, token, amount, hash, signature, caller) => {
    console.log('unstakeToken', userAddress, token, amount, hash, signature, caller)
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/unstakeFunds", {
        UserAddress: userAddress,
        Token: token,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    console.log('unstakeToken response', blockchainRes.data)
    return blockchainRes.data;
};

module.exports.getUserStakings = async (userAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/getUserStakings", {
        UserAddress: userAddress,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getTokenStakings = async (token, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/getTokenStakings", {
        Token: token,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.updateProtocolParameters = async (token, mintingPct, releaseFrequency, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/updateProtocolParameters", {
        Token: token,
        MintingPct: mintingPct,
        ReleaseFrequency: releaseFrequency,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.payStakingReward = async (token, txnId, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/payStakingReward", {
        Token: token,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};
