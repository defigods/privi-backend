import express from 'express';
import priviGovernance from "../blockchain/priviGovernance";
import { updateFirebase, createNotification, generateUniqueId, addZerosToHistory } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections, { stakingDeposit } from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import { user } from "firebase-functions/lib/providers/auth";
const notificationsController = require('./notificationsController');

const apiKey = process.env.API_KEY;

// ----------------------------------- POST -------------------------------------------

// user stakes in a token
exports.stakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userAddress = body.userAddress;
        const token = body.token;
        const amount = body.amount;

        const txnId = generateUniqueId();
        const date = Date.now();
        const blockchainRes = await priviGovernance.stakeToken(userAddress, token, amount, txnId, date, apiKey)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // update stakedAmount and members of the token
            const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
            const data: any = tokenSnap.data();
            let newAmount = 0;
            let newMembers = {};
            if (data) {
                if (data.StakedAmount) newAmount = data.StakedAmount;
                if (data.Members) newMembers = data.Members;
            }
            newAmount += amount;
            if (!newMembers[userAddress]) newMembers[userAddress] = amount;
            else newMembers[userAddress] += amount;
            tokenSnap.ref.set({ StakedAmount: newAmount, Members: newMembers }, { merge: true });

            // add zeros for graph
            addZerosToHistory(tokenSnap.ref.collection(collections.retunHistory), 'return');
            addZerosToHistory(tokenSnap.ref.collection(collections.stakedHistory), 'amount');

            await notificationsController.addNotification({
                userId: userAddress,
                notification: {
                    type: 33,
                    typeItemId: 'user',
                    itemId: userAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: amount,
                    onlyInformation: false,
                }
            });

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/stakingController -> stakeToken(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/stakingController -> stakeToken(): ', err);
        res.send({ success: false });
    }
};

// user unstakes in a token
exports.unstakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userAddress = body.userAddress;
        const token = body.token;
        const amount = body.amount;

        const txnId = generateUniqueId();
        const date = Date.now();;
        const blockchainRes = await priviGovernance.unstakeToken(userAddress, token, amount, txnId, date, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // update stakedAmount and members of the token
            const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
            const data: any = tokenSnap.data();
            let newAmount = 0;
            let newMembers = {};
            if (data) {
                if (data.StakedAmount) newAmount = data.StakedAmount;
                if (data.Members) newMembers = data.Members;
            }
            newAmount -= amount;
            if (newMembers[userAddress]) {
                newMembers[userAddress] -= amount;
                if (newMembers[userAddress] <= 0) delete newMembers[userAddress];
            }
            tokenSnap.ref.update({ StakedAmount: newAmount, Members: newMembers });

            await notificationsController.addNotification({
                userId: userAddress,
                notification: {
                    type: 34,
                    typeItemId: 'user',
                    itemId: userAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: amount,
                    onlyInformation: false,
                }
            });
            res.send({ success: true });


        }
        else {
            console.log('Error in controllers/stakingController -> unstakeToken(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/stakingController -> unstakeToken(): ', err);
        res.send({ success: false });
    }
};


// ----------------------------------- GET -------------------------------------------

// get user staking amount of PRIVI
exports.getStakingAmount = async (req: express.Request, res: express.Response) => {
    try {
        const userId = req.params.userId;
        console.log(userId);
        const stakingSnap = await db.collection(collections.stakingDeposit).doc(userId).get();
        const data = stakingSnap.data();
        if (data) {
            const stakedAmount = data.StakedAmount + data.NewStakedAmount;
            res.send({ success: true, data: stakedAmount });
        }
        else {
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/stakingController -> getStakings(): ', err);
        res.send({ success: false });
    }
};

// get the number of people that made some staking
exports.getTotalMembers = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const token = req.params.token;
        const stakedHistorySnap = await db.collection(collections.stakingToken).doc(token).get();
        const data: any = stakedHistorySnap.data();
        const members = Object.keys(data.Members ?? {}).length;
        res.send({ success: true, data: members });
    } catch (err) {
        console.log('Error in controllers/stakingController -> getTotalMembers(): ', err);
        res.send({ success: false });
    }
};

// get return history of a token
exports.getReturnHistory = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const token = req.params.token;
        const returnHistorySnap = await db.collection(collections.stakingToken).doc(token).collection(collections.retunHistory).get();
        returnHistorySnap.forEach((doc) => {
            const data: any = doc.data();
            retData.push(data);
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/stakingController -> getReturnHistory(): ', err);
        res.send({ success: false });
    }
};

// get staked amount history of a token
exports.getStakedHistory = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const token = req.params.token;
        const stakedHistorySnap = await db.collection(collections.stakingToken).doc(token).collection(collections.stakedHistory).get();
        stakedHistorySnap.forEach((doc) => {
            const data: any = doc.data();
            retData.push(data);
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/stakingController -> getStakedHistory(): ', err);
        res.send({ success: false });
    }
};


// ----------------------------------- CRON -------------------------------------------

// daily save staked amount to history collection for every staking token
exports.manageStakedAmount = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Staking manageStakedAmount() cron job started *********");
        const stakingTokensSnap = await db.collection(collections.stakingToken).get();
        stakingTokensSnap.forEach((tokenDoc) => {
            const data: any = tokenDoc.data();
            const amount = data.StakedAmount ?? 0;
            const date = Date.now();
            tokenDoc.ref.collection(collections.stakedHistory).add({
                amount: amount,
                date: date
            });
        });
    }
    catch (err) {
        console.log('Error in controllers/stakingController -> manageStakedAmount()', err);
    }
});

// // manage daily returns
exports.manageReturns = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Staking manageReturns() cron job started *********");
        const tokensSnap = await db.collection(collections.stakingToken).get();
        const tokenDocs = tokensSnap.docs;
        for (let i = 0; i < tokenDocs.length; i++) {
            const token = tokenDocs[i].id;
            const txnId = generateUniqueId();
            const date = Date.now();
            const blockchainRes = await priviGovernance.payStakingReward(token, txnId, date, apiKey);
            if (blockchainRes && blockchainRes.success) {
                updateFirebase(blockchainRes);
                // calculate total return amount
                let returnAmount = 0;
                const txns = blockchainRes.output ? blockchainRes.output.Transactions : {};
                let tid: string = '';
                let tobj: any = null;
                for ([tid, tobj] of Object.entries(txns)) {
                    if (tobj.Type == notificationTypes.stakingReward) returnAmount += tobj.Amount;
                }
                tokenDocs[i].ref.collection(collections.retunHistory).add({
                    return: returnAmount,
                    date: date
                });
            }
            else {
                console.log('Error in controllers/stakingController -> manageReturns()', blockchainRes.message);
            }
        }
    }
    catch (err) {
        console.log('Error in controllers/stakingController -> manageReturns()', err);
    }
});