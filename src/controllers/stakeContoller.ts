import express from 'express';
import tradinionalLending from "../blockchain/traditionalLending";
import { updateFirebase, createNotificaction } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections, { stakingDeposit } from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';

// user stakes in a token
exports.stakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.stakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // update staking deposit: check if field already exists, if not intialize to the given amount else sum this value
            let newTokenDepositVal = Number(amount);
            const docSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
            // case doc not exists, create doc and 'deposited' map
            if (!docSnap.exists) {
                const obj = {};
                obj[token] = newTokenDepositVal;
                docSnap.ref.set({ deposited: obj });
            } else { // else calculate new deposited value and update firebase
                const data = docSnap.data();
                if (data) { // update if already has some staking
                    if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
                }
                const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
                const obj = {};
                obj[dotNotation] = newTokenDepositVal;
                db.collection(collections.stakingDeposit).doc(publicId).update(obj);
            }
            createNotificaction(publicId, "Staking - Token Unstaked",
                ` `,
                notificationTypes.unstaking
            );
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
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.unstakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // update staking deposit: check if field already exists, if not intialize to the given amount else sum this value
            let newTokenDepositVal = -Number(amount);
            const docSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data) { // update if already has some staking
                    if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
                }
                const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
                const obj = {};
                obj[dotNotation] = newTokenDepositVal;
                db.collection(collections.stakingDeposit).doc(publicId).update(obj);
                createNotificaction(publicId, "Staking - Token Unstaked",
                    ` `,
                    notificationTypes.unstaking
                );
                res.send({ success: true });
            }
            else {
                console.log('Error in controllers/stakingController -> unstakeToken(): unstakin when StakingDeposit doc for ' + publicId + " not creaded");
                res.send({ success: false });
            }
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

// get the reward earned by staking token, 
// output: object which key is the token and value the amount earned in this token
exports.getStakeReward = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const rewarded = {};
        const ratesSnap = await db.collection(collections.rates).get();
        // get list of token and initialize to 0
        ratesSnap.forEach((doc) => {
            if (doc.id.length <= 5) { // only crypto tokens
                rewarded[doc.id] = 0;
            }
        });
        // update with the total staked amount (deposited + rewarded)
        let key: string = "";
        let val: any = 0;
        for ([key, val] of Object.entries(rewarded)) {
            const walletSnap = await db.collection(collections.wallet).doc(key).collection(collections.user).doc(publicId).get();
            const data = walletSnap.data();
            if (data) {
                rewarded[key] += data.Staking_Amount;
            }
        }
        // substract the deposited amount, in order to leave the rewarded amount
        const stakingDepositSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
        const stakingData = stakingDepositSnap.data();
        if (stakingData) {
            for ([key, val] of Object.entries(rewarded)) {
                const deposited = stakingData.deposited[key];
                if (deposited) rewarded[key] -= deposited;
            }
        }
        res.send({ success: true, data: rewarded });
    } catch (err) {
        console.log('Error in controllers/stakingController -> unstakeToken(): ', err);
        res.send({ success: false });
    }
};