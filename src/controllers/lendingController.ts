import express from 'express';
const tradinionalLending = require("../blockchain/traditionalLending");
const notification = require("./notifications");
const functions = require("../constants/functions");
const notificationTypes = require("../constants/notificationType");
const cron = require('node-cron');

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const collaterals = body.collaterals;
        const rateOfChange = await functions.getRateOfChange();
        const blockchainRes = await tradinionalLending.borrowFunds(publicId, token, amount, collaterals, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            functions.updateFirebase(blockchainRes);
            notification.createNotificaction(publicId, "Loans 1.0 - Funds Borrowed",
                ` `,
                notificationTypes.priviCreditCreated
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> initiateCredit(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> initiateCredit(): ', err);
        res.send({ success: false });
    }
};

exports.depositCollateral = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const token = body.token;
        const collaterals = body.collaterals;
        const blockchainRes = await tradinionalLending.depositCollateral(publicId, token, collaterals)
        if (blockchainRes && blockchainRes.success) {
            functions.updateFirebase(blockchainRes);
            notification.createNotificaction(publicId, "Loans 1.0 - Deposit Collateral",
                ` `,
                notificationTypes.traditionalDepositCollateral
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> depositCollateral(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> depositCollateral(): ', err);
        res.send({ success: false });
    }
};

exports.withdrawCollateral = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const token = body.token;
        const collaterals = body.collaterals;
        const rateOfChange = await functions.getRateOfChange();
        const blockchainRes = await tradinionalLending.withdrawCollateral(publicId, token, collaterals, rateOfChange)
        if (blockchainRes && blockchainRes.success) {
            functions.updateFirebase(blockchainRes);
            notification.createNotificaction(publicId, "Loans 1.0 - Withdraw Collateral",
                ` `,
                notificationTypes.traditionalWithdrawCollateral
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> withdrawCollateral(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> withdrawCollateral(): ', err);
        res.send({ success: false });
    }
};

exports.repayFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.repayFunds(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            functions.updateFirebase(blockchainRes);
            notification.createNotificaction(publicId, "Loans 1.0 - Funds Repaid",
                ` `,
                notificationTypes.traditionalRepay
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> repayFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> repayFunds(): ', err);
        res.send({ success: false });
    }
};