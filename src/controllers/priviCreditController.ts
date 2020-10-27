import express from 'express';
import priviCredit from "../blockchain/priviLending";
import createNotificaction from "./notifications";
import { updateFirebase } from "../constants/functions";
import notificationTypes from "../constants/notificationType";
import cron from 'node-cron';

exports.initiateCredit = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const amount = body.amount;
        const token = body.token;
        const duration = body.duration;
        const payments = body.payments;
        const maxFunds = body.maxFunds;
        const interest = body.interest;
        const p_incentive = body.p_incentive;
        const p_premium = body.p_premium;
        const trustScore = body.trustScore;
        const endorsementScore = body.endorsementScore;
        const blockchainRes = await priviCredit.initiatePRIVIcredit(creator, amount, token, duration, payments, maxFunds, interest, p_incentive, p_premium, trustScore, endorsementScore);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(creator, "Privi Credit - Loan Offer Created",
                `You have successfully created a new PRIVI Credit. ${amount} ${token} has been added to the PRIVI Credit Pool!`,
                notificationTypes.priviCreditCreated
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> initiateCredit(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> initiateCredit(): ', err);
        res.send({ success: false });
    }
};

exports.modifyParameters = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const creator = body.creator;
        const duration = body.duration;
        const payments = body.payments;
        const maxFunds = body.maxFunds;
        const interest = body.interest;
        const p_incentive = body.p_incentive;
        const p_premium = body.p_premium;
        const trustScore = body.trustScore;
        const endorsementScore = body.endorsementScore;
        const blockchainRes = await priviCredit.modifyPRIVIparameters(creator, loanId, duration, payments, maxFunds, interest, p_incentive, p_premium, trustScore, endorsementScore);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(creator, "Privi Credit - Loan Offer Modified",
                `The modifications of your loan has been performed successfully`,
                notificationTypes.priviCreditCreated
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> modifyParameters(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> modifyParameters(): ', err);
        res.send({ success: false });
    }
};

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const borrowerId = body.borrowerId;
        const amount = body.amount;
        const collaterals = body.collaterals;
        const blockchainRes = await priviCredit.borrowFunds(loanId, borrowerId, amount, collaterals);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(borrowerId, "Privi Credit - Loan Borrowed",
                `You have succesfully borrowed a Privi Credit loan offer, enjoy your ${amount} Coins`,
                notificationTypes.priviCreditBorrowed
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> borrowFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> borrowFunds(): ', err);
        res.send({ success: false });
    }
};

exports.withdrawFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const lenderId = body.lenderId;
        const amount = body.amount;
        const blockchainRes = await priviCredit.withdrawFunds(loanId, lenderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(lenderId, "Privi Credit - Credit Withdrawn",
                `You have succesfully withdrawn ${amount} Coins of your Privi Credit loan`,
                notificationTypes.priviCreditWithdrawn
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> withdrawFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> withdrawFunds(): ', err);
        res.send({ success: false });
    }
};

exports.depositFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const lenderId = body.lenderId;
        const amount = body.amount;
        const blockchainRes = await priviCredit.depositFunds(loanId, lenderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(lenderId, "Privi Credit - Credit Deposited",
                `You have succesfully deposited ${amount} Coins into your Privi Credit loan`,
                notificationTypes.priviCreditDeposited
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> depositFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> depositFunds(): ', err);
        res.send({ success: false });
    }
};


exports.assumeRisk = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const provierId = body.provierId;
        const premiumId = body.premiumId;
        const riskPct = body.riskPct;
        const blockchainRes = await priviCredit.assumePRIVIrisk(loanId, provierId, premiumId, riskPct);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(provierId, "Privi Credit - Credit Risk Assumed",
                `You have assumed ${riskPct * 100}% risk of the loan`,
                notificationTypes.priviCreditRiskAssumed
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> assumeRisk(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> assumeRisk(): ', err);
        res.send({ success: false });
    }
};

// scheduled every day at 00:00 
exports.managePRIVIcredits = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("calling managePRIVIcredits");
        const blockchainRes = await priviCredit.managePRIVIcredits();
        if (blockchainRes && blockchainRes.success) {
            console.log("PRIVI credits updated");
            updateFirebase(blockchainRes);
        }
        else {
            console.log('Error in controllers/priviCredit -> managePRIVIcredits(): success = false');
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> managePRIVIcredits()', err);
    }
});
