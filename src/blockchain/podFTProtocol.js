const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePOD = async (podInfo, rateChange, hash, signature, caller) => {
    // console.log('calling fabric',podInfo, rateChange, hash, signiture, caller)
    let obj = {
        PodInfo: {	
            "Creator": podInfo.Creator,
            "AMM": podInfo.AMM,
            "SpreadTarget": podInfo.SpreadTarget,
            "SpreadExchange": podInfo.SpreadExchange,
            "TokenSymbol": podInfo.TokenSymbol,
            "TokenName": podInfo.TokenName,
            "FundingToken": podInfo.FundingToken,
            "Principal": podInfo.Principal,
    
            "DateExpiration": podInfo.DateExpiration,
            "Frequency": podInfo.Frequency,
            "Interest": podInfo.Interest,
            "LiquidationCCR": podInfo.LiquidationCCR,
            "Collaterals": {...podInfo.Collaterals}
        },
        RateChange: {...rateChange},
        Hash: hash,
        Signature: signature,
        Caller: caller
        
    }
    console.log('sending Obj to fabric:', obj)
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/initiatePOD", obj);
    return blockchainRes.data;
};

module.exports.deletePod = async (publicId, podId, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/deletePOD", {
        Creator: publicId,
        PodAddress: podId,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.investPOD = async (investorId, podId, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/investPOD", {
        Investor: investorId,
        PodAddress: podId,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.sellPOD = async (investorId, podId, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/sellPodToken", {
        Investor: investorId,
        PodAddress: podId,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.interestPOD = async (podId, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/interestPOD", {
        PodId: podId,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};

module.exports.checkPODLiquidation = async (podId, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/checkPODLiquidation", {
        PodId: podId,
        RateChange: rateOfChange
    });
    return blockchainRes.data;
};






module.exports.swapPOD = async (investorId, liquidityPoolId, podId, amount, rateOfChange) => {
    let blockchainRes = await axios.post(api.blockchainPodAPI + "/swapPOD", {
        InvestorId: investorId,
        LiqPoolId: liquidityPoolId,
        PodId: podId,
        Amount: amount,
        RateChange: rateOfChange,
        Type: "CRYPTO"
    });
    return blockchainRes.data;
};

