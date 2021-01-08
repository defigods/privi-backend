import express from 'express';
import liquidityPool from "../blockchain/liquidtyPool";
import { updateFirebase, createNotification, addZerosToHistory, getRateOfChangeAsMap, generateUniqueId } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import { send } from 'process';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now
const notificationsController = require('./notificationsController');

// --------------------------------- POST ----------------------------------

// function used to create a liquidity pool of certain token (always called from Postman)
exports.createLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolAddress = body.PoolAddress;
        const poolToken = body.PoolToken;   // this works like the identifier
        const minFee = body.MinFee;
        const maxFee = body.MaxFee;
        const riskParameter = body.RiskParameter;
        const regimePoint = body.RegimePoint;

        const blockchainRes = await liquidityPool.createLiquidityPool(poolAddress, poolToken, minFee, maxFee, riskParameter, regimePoint, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // add zeros for graph
            const ref = db.collection(collections.liquidityPools).doc(poolToken);
            addZerosToHistory(ref.collection(collections.liquidityHistory), 'liquidity');
            addZerosToHistory(ref.collection(collections.rewardHistory), 'reward');

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> createLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> createLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// function to list a liquidity pool (always called from Postman)
exports.listLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const blockchainRes = await liquidityPool.listLiquidityPool(poolToken, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> listLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> listLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// function to protect a liquidity pool (always called from Postman)
exports.protectLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const poolSpread = body.PoolSpread;
        const date = Date.now();
        const blockchainRes = await liquidityPool.protectLiquidityPool(poolToken, poolSpread, date, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> protectLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> protectLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// user deposits in some pool
exports.depositLiquidity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const liquidityProviderAddress = body.LiquidityProviderAddress; // depositing user address
        const poolToken = body.PoolToken;
        const amount = body.Amount;

        const depositId = generateUniqueId();
        const txnId = generateUniqueId();

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != liquidityProviderAddress) {
            console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.depositLiquidity(liquidityProviderAddress, poolToken, amount, depositId, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
            const liquidityPoolData: any = liquidityPoolSnap.data();
            // add provider
            const providers = liquidityPoolData.Providers ?? {};
            if (!providers[liquidityProviderAddress]) providers[liquidityProviderAddress] = amount;
            else providers[liquidityProviderAddress] += amount;
            liquidityPoolSnap.ref.update({ Providers: providers });


            // await notificationsController.addNotification({
            //     userId: liquidityPoolData.CreatorId,
            //     notification: {
            //         type: 45,
            //         itemId: poolToken,
            //         follower: '',
            //         pod: '',
            //         comment: '',
            //         token: '',
            //         amount: 0,
            //         onlyInformation: false,
            //     }
            // });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): ', err);
        res.send({ success: false });
    }
};

exports.swapCryptoTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const traderAddress = body.TraderAddress;
        const tokenFrom = body.TokenFrom;
        const tokenTo = body.TokenTo;
        const amountFrom = body.AmountFrom;

        const rate = 1;
        const date = Date.now();
        const txnId = generateUniqueId();
        console.log(body)

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != traderAddress) {
            console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.swapCrytoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            console.log(JSON.stringify(blockchainRes, null, 4))

            const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(tokenFrom).get();
            const liquidityPoolData: any = liquidityPoolSnap.data();
            // add swapper
            const swaps = liquidityPoolData.Providers ?? {};
            if (!swaps[traderAddress]) swaps[traderAddress] = amountFrom;
            else swaps[traderAddress] += amountFrom;
            liquidityPoolSnap.ref.update({ Swaps: swaps });

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): ', err);
        res.send({ success: false });
    }
}

// --------------------------------- GET ----------------------------------

exports.getLiquidityPools = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).get();
        liquidityPoolSnap.forEach((doc) => {
            const data: any = doc.data();
            const token = data.PoolToken ?? '';
            // get staked amount in Privi
            const amount = data.StakedAmount ?? 0;
            const amountInUSD = rateOfChange[token] ? rateOfChange[token] * amount : amount; // to usd
            const amountInPrivi = rateOfChange["PRIVI"] ? rateOfChange['PRIVI'] * amountInUSD : amountInUSD; // to PRIVI
            // get rewarded amount in Privi
            const rewardedAmount = data.RewardedAmount ?? 0;
            const rewardedAmountInUSD = rateOfChange[token] ? rateOfChange[token] * rewardedAmount : rewardedAmount; // to usd
            const rewardedAmountInPrivi = rateOfChange["PRIVI"] ? rateOfChange['PRIVI'] * rewardedAmountInUSD : rewardedAmountInUSD; // to PRIVI

            retData.push({
                ...data,
                StakedAmountInPrivi: amountInPrivi,
                RewardedAmountInPrivi: rewardedAmountInPrivi,
            });
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPools(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
        const data: any = liquidityPoolSnap.data();
        if (data) {
            const token = data.PoolToken ?? '';
            // get staked amount in Privi
            const amount = data.StakedAmount ?? 0;
            const amountInUSD = rateOfChange[token] ? rateOfChange[token] * amount : amount; // to usd
            const amountInPrivi = rateOfChange["PRIVI"] ? rateOfChange['PRIVI'] * amountInUSD : amountInUSD; // to PRIVI
            // get rewarded amount in Privi
            const rewardedAmount = data.RewardedAmount ?? 0;
            const rewardedAmountInUSD = rateOfChange[token] ? rateOfChange[token] * rewardedAmount : rewardedAmount; // to usd
            const rewardedAmountInPrivi = rateOfChange["PRIVI"] ? rateOfChange['PRIVI'] * rewardedAmountInUSD : rewardedAmountInUSD; // to PRIVI


            res.send({
                sucess: true, data: {
                    ...data,
                    StakedAmountInPrivi: amountInPrivi,
                    RewardedAmountInPrivi: rewardedAmountInPrivi,
                }
            });
        }
        else res.send({ success: false });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityHistory = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const retData: any[] = [];
        const liquidityHistorySnap = await db.collection(collections.liquidityPools).doc(poolToken).collection(collections.liquidityHistory).get();
        liquidityHistorySnap.forEach((doc) => {
            retData.push(doc.data());
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getLiquidityHistory(): ', err);
        res.send({ success: false });
    }
};

exports.getRewardHistory = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const retData: any[] = [];
        const liquidityHistorySnap = await db.collection(collections.liquidityPools).doc(poolToken).collection(collections.rewardHistory).get();
        liquidityHistorySnap.forEach((doc) => {
            retData.push(doc.data());
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getRewardHistory(): ', err);
        res.send({ success: false });
    }
};