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

module.exports.initiatePRIVIcredit = async (creator, creditName, lendingToken, maxFunds, interest, frequency, p_incentive, p_premium,
    dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/initiatePRIVIcredit", {
        Parameters: {
            Creator: creator,
            CreditName: creditName,
            LendingToken: lendingToken,
            MaxFunds: maxFunds,
            Interest: interest,
            Frequency: frequency,
            P_incentive: p_incentive,
            P_premium: p_premium,
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
            Hash: hash,
            Signature: signature
        },
        Caller: caller
    }
    );
    return blockchainRes.data;
};

module.exports.depositFunds = async (creditAddress, address, amount, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/depositFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.borrowFunds = async (creditAddress, address, amount, collateral, rateOfChange, hash, signature, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/borrowFunds", {
        CreditAddress: creditAddress,
        Address: address,
        Amount: amount,
        Collaterals: collateral,
        RateChange: rateOfChange,
        Hash: hash,
        Signature: signature,
        Caller: caller
    });
    return blockchainRes.data;
};

module.exports.payInterest = async (creditAddress, date, txnId, caller) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/payInterest", {
        CreditAddress: creditAddress,
        Date: date,
        TxnId: txnId,
        Caller: caller
    });
    return blockchainRes.data;
};
