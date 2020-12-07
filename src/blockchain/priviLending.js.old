const axios = require("axios");
const api = require("./blockchainApi");

module.exports.initiatePRIVIcredit = async (creator, amount, token, duration, payments, maxFunds, interest, p_incentive, p_premium, trustScore, endorsementScore) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/initiatePRIVIcredit", {
        Loan_conditions: {
            Creator: creator,
            Token: token,
            Duration: duration,
            Payments: payments,
            MaxFunds: maxFunds,
            Interest: interest,
            P_incentive: p_incentive,
            P_premium: p_premium,
            TrustScore: trustScore,
            EndorsementScore: endorsementScore,
        },
        InitialDeposit: String(amount),
    }
    );
    return blockchainRes.data;
};

module.exports.modifyPRIVIparameters = async (creator, loanId, duration, payments, maxFunds, interest, p_incentive, p_premium, trustScore, endorsementScore) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/modifyPRIVIparameters", {
        loanId: loanId,
        Creator: creator,
        Duration: duration,
        Payments: payments,
        MaxFunds: maxFunds,
        Interest: interest,
        P_incentive: p_incentive,
        P_premium: p_premium,
        TrustScore: trustScore,
        EndorsementScore: endorsementScore,
    });
    return blockchainRes.data;
};


module.exports.updateRiskParameters = async (token, interest_min, interest_max, p_incentive_min, p_incentive_max, p_premium_min, p_premium_max) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/updateRiskParameters", {
        Token: token,
        RiskParameters: {
            Interest_min: interest_min,
            Interest_max: interest_max,
            P_incentive_min: p_incentive_min,
            P_incentive_max: p_incentive_max,
            P_premium_min: p_premium_min,
            P_premium_max: p_premium_max,
        }
    });
    return blockchainRes.data;
};

module.exports.getPRIVIcreditList = async () => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVIcreditList", {
    });
    return blockchainRes.data;
};

module.exports.getPRIVIcredit = async (loanId) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/getPRIVIcredit", {
        LoanId: loanId
    });
    return blockchainRes.data;
};

module.exports.depositFunds = async (loanId, lenderId, amount) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/depositFunds", {
        LoanId: loanId,
        LenderId: lenderId,
        Amount: amount
    });
    return blockchainRes.data;
};

module.exports.withdrawFunds = async (loanId, userId, amount) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/withdrawFunds", {
        LoanId: loanId,
        UserId: userId,
        Amount: amount
    });
    return blockchainRes.data;
};

module.exports.borrowFunds = async (loanId, borrowerId, amount, collaterals) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/borrowFunds", {
        LoanId: loanId,
        BorrowerId: borrowerId,
        Amount: amount,
        Collaterals: collaterals
    });
    return blockchainRes.data;
};

module.exports.assumePRIVIrisk = async (loanId, provider, premiumId, riskPct) => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/assumePRIVIrisk", {
        LoanId: loanId,
        ProviderId: provider,
        PremiumId: premiumId,
        Pct_Risk: riskPct,
    });
    return blockchainRes.data;
};


module.exports.managePRIVIcredits = async () => {
    let blockchainRes = await axios.post(api.blockchainPriviLendingAPI + "/managePRIVIcredits", {});
    return blockchainRes.data;
};



