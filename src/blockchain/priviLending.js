const axios = require("axios");
const api = require("./blockchainApi");

module.exports.getPRIVICreditInfo = async (creditAddress) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVICreditInfo", {
            CreditAddress: creditAddress,
    }
    );
    return blockchainRes.data;
};

module.exports.getPRIVICreditState = async (creditAddress) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVICreditState", {
            CreditAddress: creditAddress,
    }
    );
    return blockchainRes.data;
};

module.exports.getUserLendings = async (address) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getUserLendings", {
            Address: address,
    }
    );
    return blockchainRes.data;
};

module.exports.getUserBorrowings = async (address) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getUserBorrowings", {
            Address: address,
    }
    );
    return blockchainRes.data;
};

module.exports.getCreditBorrowers = async (creditAddress) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getCreditBorrowers", {
            CreditAddress: creditAddress,
    }
    );
    return blockchainRes.data;
};

module.exports.getCreditLenders = async (creditAddress) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getCreditLenders", {
            CreditAddress: creditAddress,
    }
    );
    return blockchainRes.data;
};

module.exports.initiatePRIVIcredit = async (creator, creditName, creditAddress, lendingToken, maxFunds, interest, frequency, p_incentive, p_premium, date, dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, txnId) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/initiatePRIVIcredit", {
        Loan_conditions: {
            Creator: creator,
            CreditName: creditName,
            CreditAddress: creditAddress,
            LendingToken: lendingToken,
            MaxFunds: maxFunds,
            Interest: interest,
            Frequency: frequency,
            P_incentive: p_incentive,
            P_premium: p_premium,
            Date: date,
            DateExpiration: dateExpiration,
            TrustScore: trustScore,
            EndorsementScore: endorsementScore,
            CollateralsAccepted: collateralsAccepted,
            CCR: ccr,
            InitialDeposit: initialDeposit,
            TxnId: txnId,
        },
    }
    );
    return blockchainRes.data;
};

module.exports.depositFunds = async (creditAddress, address, amount, date, txnId) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/depositFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Date: date,
        TxnId: txnId
    });
    return blockchainRes.data;
};

module.exports.borrowFunds = async (creditAddress, address, amount, date, txnId, collaterals, rateChange) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/borrowFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Date: date,
        TxnId: txnId,
        Collaterals: collaterals,
        RateChange: rateChange
    });
    return blockchainRes.data;
};