import express from 'express';
import priviGovernance from "../blockchain/priviGovernance";
import { updateFirebase, createNotification, generateUniqueId } from "../functions/functions";
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

            // let newTokenDepositVal = Number(amount);
            // const docSnap = await db.collection(collections.stakingDeposit).doc(userAddress).get();
            // if (!docSnap.exists) {
            //     const obj = {};
            //     obj[token] = newTokenDepositVal;
            //     docSnap.ref.set({ deposited: obj });
            // } else { // else calculate new deposited value and update firebase
            //     const data = docSnap.data();
            //     let txHistory: any[] = [];
            //     if (data) { // update if already has some staking
            //         if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
            //         if (data.history) {
            //             txHistory = [...data.history]
            //         }
            //     }
            //     const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
            //     const obj = {};
            //     obj['history'] = txHistory;
            //     obj[dotNotation] = newTokenDepositVal;
            //     txHistory.push({
            //         amount: newTokenDepositVal,
            //         token: token,
            //         date: Date.now()
            //     })
            //     obj[dotNotation] = newTokenDepositVal;
            //     db.collection(collections.stakingDeposit).doc(userAddress).update(obj);
            // }

            /*createNotification(publicId, "Staking - Token Unstaked",
                ` `,
                notificationTypes.unstaking
            );*/
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
        const userAddress = body.UserAddress;
        const token = body.Token;
        const amount = body.Amount;

        const txnId = generateUniqueId();
        const date = Date.now();;
        const blockchainRes = await priviGovernance.unstakeToken(userAddress, token, amount, txnId, date, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // update staking deposit: check if field already exists, if not intialize to the given amount else sum this value
            let newTokenDepositVal = -Number(amount);
            const docSnap = await db.collection(collections.stakingDeposit).doc(userAddress).get();
            if (docSnap.exists) {
                const data: any = docSnap.data();
                let txHistory: any[] = [];
                if (data) { // update if already has some staking
                    if (data.deposited[token]) newTokenDepositVal += data.deposited[token];
                    if (data.history) {
                        txHistory = [...data.history]
                    }
                }
                const dotNotation = "deposited." + token; // firebase "dot notation" to not override whole map
                const obj = {};
                obj[dotNotation] = newTokenDepositVal;
                txHistory.push({
                    amount: newTokenDepositVal,
                    token: token,
                    date: Date.now()
                })
                obj['history'] = txHistory;
                db.collection(collections.stakingDeposit).doc(userAddress).update(obj);
                /*createNotification(publicId, "Staking - Token Unstaked",
                    ` `,
                    notificationTypes.unstaking
                );*/
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
                console.log('Error in controllers/stakingController -> unstakeToken(): unstakin when StakingDeposit doc for ' + userAddress + " not creaded");
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

// get the staking information needed for the frontend
// output: object which key is the token and value another object with three fields: stakingDeposit, annualRate, stakingReward
exports.getUserStakeInfo = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const retData = {};
        const ratesSnap = await db.collection(collections.rates).get();
        // get list of token and initialize to 0
        ratesSnap.forEach((doc) => {
            if (doc.id.length <= 5) { // only crypto tokens
                retData[doc.id] = {}
                retData[doc.id]["stakingReward"] = 0;
            }
        });
        // update with the total staked amount (deposited + rewarded)
        let key: string = "";
        let valObj: any = 0;
        for ([key, valObj] of Object.entries(retData)) {
            const walletSnap = await db.collection(collections.wallet).doc(key).collection(collections.user).doc(publicId).get();
            const data = walletSnap.data();
            if (data) {
                retData[key]["stakingReward"] += data.Staking_Amount;
            }
        }
        // substract the deposited amount, in order to leave the rewarded amount
        const stakingDepositSnap = await db.collection(collections.stakingDeposit).doc(publicId).get();
        const stakingData = stakingDepositSnap.data();
        if (stakingData) {
            for ([key, valObj] of Object.entries(retData)) {
                const deposited = stakingData.deposited[key];
                // if has some deposit
                if (deposited) {
                    retData[key]["stakingReward"] -= deposited;
                    retData[key]["stakingDeposit"] = deposited;
                    // else deposit is 0
                } else {
                    retData[key]["stakingDeposit"] = 0;
                }
            }
        }
        // add annualRates
        const stakingRatesSnap = await db.collection(collections.constants).doc(collections.stakingRates).get();
        const stakingRatesData = stakingRatesSnap.data();
        if (stakingRatesData) {
            for ([key, valObj] of Object.entries(retData)) {
                retData[key]["annualRate"] = stakingRatesData.annualRates[key];
            }
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/stakingController -> getUserStakeInfo(): ', err);
        res.send({ success: false });
    }
};


// ----------------------------------- GETTER -------------------------------------------

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