const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiateInsurancePool = async (guarantorAddress, podAddress, insuranceAddress, frequency, feeInscription, feeMembership, minCoverage, initialDeposit, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/initiateInsurancePool", {
        GuarantorAddress: guarantorAddress,
        PodAddress: podAddress,
        InsuranceAddres: insuranceAddress,
        Frequency: frequency,
        FeeInscription: feeInscription,
        FeeMembership: feeMembership,
        MinCoverage: minCoverage,

        InitialDeposit: initialDeposit,

        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.investInsurancePool = async (investorAddress, insuranceAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/investInsurancePool", {
        InvestorAddress: investorAddress,
        InsuranceAddres: insuranceAddress,
        Amount: amount,
        Caller: caller,
        Hash: hash,
        Signature: signature
    });
    return blockchainRes.data;
};

module.exports.subscribeInsurancePool = async (clientAddress, insuranceAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/subscribeInsurancePool", {
        ClientAddress: clientAddress,
        InsuranceAddres: insuranceAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.unsubscribeInsurancePool = async (clientAddress, insuranceAddress, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/unsubscribeInsurancePool", {
        ClientAddress: clientAddress,
        InsuranceAddres: insuranceAddress,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getInsuranceState = async (insuranceAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/getInsuranceState", {
        InsuranceAddres: insuranceAddress,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getInsuranceInfo = async (insuranceAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/getInsuranceInfo", {
        InsuranceAddres: insuranceAddress,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.getInsuranceInvestorByPool = async (insuranceAddress, investorAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/getInsuranceInvestorByPool", {
        InsuranceAddres: insuranceAddress,
        InvestorAddress: investorAddress,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.initiateInsurancePoolNFT = async (data) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceNFTAPI + "/initiateInsurancePool", data);
    return blockchainRes.data;
}

module.exports.subscribeInsurancePoolNFT = async (data) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceNFTAPI + "/subscribeInsurancePool", data);
    return blockchainRes.data;
}

module.exports.unsubscribeInsurancePoolNFT = async (data) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceNFTAPI + "/unsubscribeInsurancePool", data);
    return blockchainRes.data;
}

module.exports.investInsurancePoolNFT = async (data) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceNFTAPI + "/investInsurancePool", data);
    return blockchainRes.data;
}