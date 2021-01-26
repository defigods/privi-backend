import express from 'express';
import liquidityPool from "../blockchain/liquidtyPool";
import coinBalance from "../blockchain/coinBalance";
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
        const poolToken = body.PoolToken;   // this works like the identifier
        const minFee = body.MinFee;
        const maxFee = body.MaxFee;
        const riskParameter = body.RiskParameter;
        const regimePoint = body.RegimePoint;

        const blockchainRes = await liquidityPool.createLiquidityPool(poolToken, minFee, maxFee, riskParameter, regimePoint, apiKey);
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
        const blockchainRes = await liquidityPool.protectLiquidityPool(poolToken, poolSpread, apiKey);
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
        const liquidityProviderAddress = body.LiquidityProviderAddress;
        const poolToken = body.PoolToken;
        const amount = body.Amount;
        const depositId = body.DepositId;

        const hash = body.Hash;
        const signature = body.Signature;

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != liquidityProviderAddress) {
            console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.depositLiquidity(liquidityProviderAddress, poolToken, amount, depositId, hash, signature, apiKey);
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
        const rate = body.Rate;

        const hash = body.Hash;
        const signature = body.Signature;

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != traderAddress) {
            console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.swapCryptoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const output = blockchainRes.output;
            const transactions = output.Transactions;

            const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(tokenFrom).get();
            const liquidityPoolData: any = liquidityPoolSnap.data();
            // add swapper and update accumulated fee
            const swaps = liquidityPoolData.Providers ?? {};
            if (!swaps[traderAddress]) swaps[traderAddress] = amountFrom;
            else swaps[traderAddress] += amountFrom;
            let newAccumulatedFee = liquidityPoolData.AcculatedFee ?? 0;
            let newDailyAccumulatedFee = liquidityPoolData.DailyAcculatedFee ?? 0;
            newAccumulatedFee += 0;
            newDailyAccumulatedFee += 0;
            liquidityPoolSnap.ref.update({
                Swaps: swaps,
                AccumulatedFee: newAccumulatedFee,
                DailyAccumulatedFee: newDailyAccumulatedFee
            });
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
        const docs = liquidityPoolSnap.docs;
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const data: any = doc.data();
            const blockchainRes = await coinBalance.balanceOf(data.PoolAddress, data.PoolToken);
            if (blockchainRes && blockchainRes.success) {
                const output = blockchainRes.output;
                const liquidity = output.Amount;
                const liquidityInUSD = rateOfChange[doc.id] ? rateOfChange[doc.id] * liquidity : liquidity;
                const rewardedAmount = data.RewardedAmount ?? 0;
                const rewardedAmountInUSD = rateOfChange[doc.id] ? rateOfChange[doc.id] * rewardedAmount : rewardedAmount; // to usd
                retData.push({
                    ...data,
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                    RewardedAmountInUSD: rewardedAmountInUSD,
                });
            }
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPools(): ', err);
        res.send({ success: false });
    }
};

// get liquidity pools basic info
exports.getOtherLiquidityPools = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).get();
        const docs = liquidityPoolSnap.docs;
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const data: any = doc.data();
            const blockchainRes = await coinBalance.balanceOf(data.PoolAddress, data.PoolToken);
            if (blockchainRes && blockchainRes.success) {
                const output = blockchainRes.output;
                const liquidity = output.Amount;
                const liquidityInUSD = rateOfChange[doc.id] ? rateOfChange[doc.id] * liquidity : liquidity;
                retData.push({
                    PoolToken: doc.id,
                    NumProviders: Object.keys(data.Providers ?? {}).length,
                    DailyAccumulatedFee: data.DailyAccumulatedFee ?? 0,
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                });
            }
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getOtherLiquidityPools(): ', err);
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
            const blockchainRes = await coinBalance.balanceOf(data.PoolAddress, token);
            const output = blockchainRes.output;
            const liquidity = output.Amount;
            const liquidityInUSD = rateOfChange[liquidityPoolSnap.id] ? rateOfChange[liquidityPoolSnap.id] * liquidity : liquidity;
            // get rewarded amount in Privi
            const rewardedAmount = data.RewardedAmount ?? 0;
            const rewardedAmountInUSD = rateOfChange[token] ? rateOfChange[token] * rewardedAmount : rewardedAmount; // to usd
            res.send({
                success: true, data: {
                    ...data,
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                    RewardedAmountInUSD: rewardedAmountInUSD,
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

exports.getSwapPrice = async (req: express.Request, res: express.Response) => {
    try {
        const query = req.query;
        const tokenFrom = query.TokenFrom;
        const tokenTo = query.TokenTo;
        const amountFrom = Number(query.AmountFrom);
        const rate = Number(query.Rate);
        const blockchainRes = await liquidityPool.getSwapPrice(tokenFrom, tokenTo, amountFrom, rate, apiKey);
        console.log(blockchainRes);
        if (blockchainRes && blockchainRes.success) {
            const price = blockchainRes.output;
            res.send({ success: true, data: price });
        } else {
            console.log('Error in controllers/liquidityPoolController -> getSwapPrice(): blockchain = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getSwapPrice(): ', err);
        res.send({ success: false });
    }
};