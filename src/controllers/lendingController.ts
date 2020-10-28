import express from 'express';
import tradinionalLending from "../blockchain/traditionalLending";
import createNotificaction from "./notifications";
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest } from "../constants/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const collaterals = body.collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.borrowFunds(publicId, token, amount, collaterals, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Funds Borrowed",
                ` `,
                notificationTypes.priviCreditCreated
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> borrowFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> borrowFunds(): ', err);
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
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Deposit Collateral",
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
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.withdrawCollateral(publicId, token, collaterals, rateOfChange)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Withdraw Collateral",
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
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Funds Repaid",
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


// scheduled every hour
exports.checkLiquidation = cron.schedule('0 * * * *', async () => {
    try {
        console.log("********* Calling traditional lending checkLiquidation *********");
        // get list of users
        const uidList: string[] = [];
        const usersSnap = await db.collection(collections.user).get();
        usersSnap.forEach((doc) => {
            uidList.push(doc.id);
        });
        console.log(uidList);
        const rateOfChange = await getRateOfChange();
        uidList.forEach(async (uid) => {
            const blockchainRes = await tradinionalLending.checkLiquidation(uid, rateOfChange);
            if (blockchainRes && blockchainRes.success) {
                if (blockchainRes.output.Liquidated && blockchainRes.output.Liquidated == "YES") updateFirebase(blockchainRes);
            }
            else {
                console.log('Error in controllers/lendingController -> checkLiquidation(): success = false. User: ', uid);
            }
        });
        console.log("********* Traditional lending checkLiquidation done *********");
    } catch (err) {
        console.log('Error in controllers/lendingController -> checkLiquidation()', err);
    }
});

// scheduled every day 00:00
exports.payInterest = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Calling traditional lending payInterest *********");
        // get interest rates
        const lendingInterest = await getLendingInterest();
        const stakingInterest = await getStakingInterest();
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await tradinionalLending.payInterests(lendingInterest, stakingInterest, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            console.log("********* Traditional lending payInterest paid ***********");
            updateFirebase(blockchainRes);
        }
        else {
            console.log('Error in controllers/lendingController -> checkLiquidation(): success = false');
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> checkLiquidation()', err);
    }
});