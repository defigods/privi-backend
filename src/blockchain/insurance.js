const axios = require("axios");
const api = require("./blockchainApi");


module.exports.initiateInsurancePool = async (guarantorAddress, podAddress, insuranceAddress, frequency, feeInscription, feeMembership, minCoverage, initialDeposit, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/initiateInsurancePool", {
        GuarantorAddress: guarantorAddress,
        PodAddress: podAddress,
        InsuranceAddres: insuranceAddress,
        Frequency: frequency,
        FeeInscription: feeInscription,
        FeeMembership: feeMembership,
        MinCoverage: minCoverage,
        Date: date,

        InitialDeposit: initialDeposit,
        TxnId: txnId,

        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.investInsurancePool = async (investorAddress, insuranceAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/investInsurancePool", {
        InvestorAddress: investorAddress,
        InsuranceAddres: insuranceAddress,
        Date: date,
        Amount: amount,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.subscribeInsurancePool = async (clientAddress, insuranceAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/subscribeInsurancePool", {
        ClientAddress: clientAddress,
        InsuranceAddres: insuranceAddress,
        Date: date,
        Amount: amount,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.subscribeInsurancePool = async (clientAddress, insuranceAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/subscribeInsurancePool", {
        ClientAddress: clientAddress,
        InsuranceAddres: insuranceAddress,
        Date: date,
        Amount: amount,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.unsubscribeInsurancePool = async (clientAddress, insuranceAddress, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainInsuranceFTAPI + "/unsubscribeInsurancePool", {
        ClientAddress: clientAddress,
        InsuranceAddres: insuranceAddress,
        Date: date,
        Amount: amount,
        TxnId: txnId,
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