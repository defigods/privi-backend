const axios = require("axios");
const api = require("./blockchainApi");

module.exports.stakeToken = async (userAddress, token, amount, txnId, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/stakeFunds", {
        UserAddress: userAddress,
        Token: token,
        Amount: amount,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.unstakeToken = async (userAddress, token, amount, txnId, date, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviGovernanceAPI + "/unstakeFunds", {
        UserAddress: userAddress,
        Token: token,
        Amount: amount,
        TxnId: txnId,
        Date: date,
        Caller: caller
    });
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
