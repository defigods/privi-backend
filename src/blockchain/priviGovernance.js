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
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/unstakeFunds", {
        UserAddress: userAddress,
        Token: token,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getUserStakings = async (userAddress, token, caller) => {
    const config = {
        method: 'get',
        headers: { 'Content-Type': 'application/json' },
        url: api.blockchainPriviGovernanceAPI + "/getUserStakings",
        data: {
            UserAddress: userAddress,
            Token: token,
            Caller: caller
        }
    }
    let blockchainRes = await axios(config);
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

module.exports.payStakingReward = async (token, caller) => {
    // console.log('payStakingReward call', token, caller)
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/payStakingReward", {
        Token: token,
        Caller: caller
    });
    // console.log('payStakingReward blockchainRes', blockchainRes.data)
    return blockchainRes.data;
};
