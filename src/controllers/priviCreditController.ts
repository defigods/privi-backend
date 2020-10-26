import express from 'express';
//const jwt = require("jsonwebtoken");
//const Cons = require('../shared/Config');
//const { query } = require('../shared/query');
const firebase = require("../firebase/firebase");
const admin = firebase.getAdmin();
const db = firebase.getDb();
const collections = require("../firebase/collections");
const priviCredit = require("../blockchain/priviLending");
const notification = require("./notifications");
const notificationTypes = require("../constants/notificationType");


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
            const output = blockchainRes.output;
            await db.runTransaction(async (transaction) => {
                const updateWallets = output.UpdateWallets;
                const updateLoans = output.UpdateLoans;
                // update loan
                let loanId: string = "";
                let loanObj: any = {};
                for ([loanId, loanObj] of Object.entries(updateLoans)) {
                    transaction.set(db.collection(collections.priviCredits).doc(loanId), loanObj);
                }
                // update wallet
                let uid: string = '';
                let walletObj: any = {};
                for ([uid, walletObj] of Object.entries(updateWallets)) {
                    // balances
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    // transactions
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(obj.Id), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(creator, "Privi Credit - Loan Offer Created",
                `You have succesfully created a Privi Credit loan offer of ${amount} ${token}`,
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
        const blockchainRes = await priviCredit.modifyPRIVIparameters(loanId, creator, duration, payments, maxFunds, interest, p_incentive, p_premium, trustScore, endorsementScore);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;

            await notification.createNotificaction(creator, "Privi Credit - Loan Offer Modified",
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
        const trustScore = body.trustScore;
        const endorsementScore = body.endorsementScore;
        const collaterals = body.collaterals;
        const blockchainRes = await priviCredit.borrowFunds(loanId, borrowerId, amount, trustScore, endorsementScore, collaterals);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(borrowerId, "Privi Credit - Loan Borrowed",
                `You have succesfully borrowed a Privi Credit loan offer, enjoy your ${amount} Coins`,
                notificationTypes.priviCreditBorrowed
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

exports.withdrawFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const loanId = body.loanId;
        const lenderId = body.lenderId;
        const amount = body.amount;
        const blockchainRes = await priviCredit.withdrawFunds(loanId, lenderId, amount);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(lenderId, "Privi Credit - Credit Withdrawn",
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
            const output = blockchainRes.output;
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(lenderId, "Privi Credit - Credit Deposited",
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