import express from 'express';
import priviCredit from "../blockchain/priviLending";
import { updateFirebase, createNotification } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import cron from 'node-cron';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now

exports.getPRIVICreditInfo = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const creditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
        const creditData = creditSnap.data();

        if (creditData) {
            res.send({ success: true, data: creditData });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPRIVICreditInfo(): ', err);
        res.send({ success: false });
    }
};

exports.getPRIVICreditState = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const creditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
        const creditData = creditSnap.data();
        
        if (creditData) {
            const creditState = creditData.State.state;
            res.send({ success: true, data: creditState });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPRIVICreditState(): ', err);
        res.send({ success: false });
    }
};

exports.getUserLendings = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const address = body.address;
        const userSnap = await db.collection(collections.user).doc(address).get()
        const userData = userSnap.data();
        
        if (userData) {
            const userLendings = userData.lendings;
            res.send({ success: true, data: userLendings });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getUserLendings(): ', err);
        res.send({ success: false });
    }
};

exports.getUserBorrowings = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const address = body.address;
        const userSnap = await db.collection(collections.user).doc(address).get()
        const userData = userSnap.data();
        
        if (userData) {            
            const userBorrowings = userData.borrowings;
            res.send({ success: true, data: userBorrowings });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getUserLendings(): ', err);
        res.send({ success: false });
    }
};

exports.getCreditBorrowers = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const creditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
        const creditData = creditSnap.data();
        
        if (creditData) {
            const creditBorrowers = creditData.borrowers;
            res.send({ success: true, data: creditBorrowers });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPRIVICreditInfo(): ', err);
        res.send({ success: false });
    }
};

exports.getCreditLenders = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const creditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
        const creditData = creditSnap.data();
        
        if (creditData) {
            const creditLenders = creditData.lenders;
            res.send({ success: true, data: creditLenders });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPRIVICreditInfo(): ', err);
        res.send({ success: false });
    }
};

exports.initiatePriviCredit = async (req: express.Request, res: express.Response) => {
    try {
      
        const body = req.body;
        const creator = body.creator;
        const creditName = body.creditName;
        const creditAddress = body.creditAddress;
        const lendingToken = body.lendingToken;
        const maxFunds = body.maxFunds;
        const interest = body.interest;
        const frequency = body.frequency;
        const p_incentive = body.p_incentive;
        const p_premium = body.p_premium;
        const date = body.date;
        const dateExpiration = body.dateExpiration;
        const trustScore = body.trustScore;
        const endorsementScore = body.endorsementScore;
        const collateralsAccepted = body.collateralsAccepted;
        const ccr = body.ccr;
        const initialDeposit = body.initialDeposit;
        const txnId = body.txnId;
        const caller = apiKey;

        const blockchainRes = await priviCredit.initiatePRIVIcredit(creator, creditName, creditAddress, lendingToken, maxFunds, interest, frequency, p_incentive, p_premium, date, dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(creator, "Privi Credit - Loan Offer Created",
                `You have successfully created a new PRIVI Credit. ${initialDeposit} ${lendingToken} has been added to the PRIVI Credit Pool!`,
                notificationTypes.priviCreditCreated
            );
            const updateLoans = blockchainRes.output.UpdateLoans;
            const loanIds: string[] = Object.keys(updateLoans);
            const id = loanIds[0];
            const date = updateLoans[id].Date;
            res.send({ success: true, data: { id: loanIds[0], date: date } });
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

exports.depositFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const address = body.address;
        const amount = body.amount;
        const date = body.date;
        const txnId = body.txnId;
        const caller = apiKey;

        const blockchainRes = await priviCredit.depositFunds(creditAddress, address, amount, date, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(address, "Privi Credit - Credit Deposited",
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

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const address = body.address;
        const amount = body.amount;
        const date = body.date;
        const txnId = body.txnId;
        const collaterals = body.collaterals;
        const rateChange = body.rateChange;
        const caller = apiKey;

        const blockchainRes = await priviCredit.borrowFunds(creditAddress, address, amount, date, txnId, collaterals, rateChange, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(address, "Privi Credit - Loan Borrowed",
                `You have succesfully borrowed a Privi Credit loan offer, enjoy your ${amount} Coins`,
                notificationTypes.priviCreditBorrowed
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> borrowFunds(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> borrowFunds(): ', err);
        res.send({ success: false });
    }
};

/////////////////////////// CRON JOBS //////////////////////////////

// scheduled every day at 00:00
exports.managePRIVIcredits = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("******** Privi Credit managePRIVIcredits ********");
        const blockchainRes = await priviCredit.managePRIVIcredits();
        if (blockchainRes && blockchainRes.success) {
            console.log("******** Privi Credit managePRIVIcredits finished ********");
            updateFirebase(blockchainRes);
            const updateWallets = blockchainRes.output.UpdateWallets;
            let uid: string = "";
            let walletObj: any = null;
            for ([uid, walletObj] of Object.entries(updateWallets)) {
                if (walletObj["Transaction"].length > 0) {
                    createNotification(uid, "Privi Credit - Interest Payment",
                        ` `,
                        notificationTypes.priviCreditInterest
                    );
                }
            }
        }
        else {
            console.log('Error in controllers/priviCredit -> managePRIVIcredits(): success = false');
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> managePRIVIcredits()', err);
    }
});