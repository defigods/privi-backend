const axios = require("axios");
const api = require("./blockchainApi");

module.exports.getPRIVICreditInfo = async (creditAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVICreditInfo", {
        CreditAddress: creditAddress,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.getPRIVICreditState = async (creditAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVICreditState", {
        CreditAddress: creditAddress,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.getUserLendings = async (address, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getUserLendings", {
        Address: address,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.getUserBorrowings = async (address, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getUserBorrowings", {
        Address: address,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.getCreditBorrowers = async (creditAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getCreditBorrowers", {
        CreditAddress: creditAddress,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.getCreditLenders = async (creditAddress, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getCreditLenders", {
        CreditAddress: creditAddress,
        Caller: caller
    }
    );
    return blockchainRes.data;
};

///////////////////////////////////////////////////////////////////

module.exports.initiatePRIVIcredit = async (creator, creditName, creditAddress, lendingToken, maxFunds, interest, frequency, p_incentive, p_premium, date,
    dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/initiatePRIVIcredit", {
        Parameters: {
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
            DateExpiration: dateExpiration
        },
        Requirements: {
            TrustScore: trustScore,
            EndorsementScore: endorsementScore,
            CollateralsAccepted: collateralsAccepted,
            CCR: ccr
        },
        Initialisation: {
            InitialDeposit: initialDeposit,
            TxnId: txnId,
        },
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.depositFunds = async (creditAddress, address, amount, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/depositFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.borrowFunds = async (creditAddress, address, amount, date, txnId, collateral, rateOfChange, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/borrowFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Date: date,
        TxnId: txnId,
        Collaterals: collateral,
        RateChange: rateOfChange,
        Caller: caller
    });
    return blockchainRes.data;
};
