import express from 'express';
import liquidityPool from "../blockchain/liquidtyPool";
import { updateFirebase, createNotification, addZerosToHistory, getRateOfChangeAsMap, generateUniqueId } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now
const notificationsController = require('./notificationsController');

// --------------------------------- POST ----------------------------------

// function used to create a liquidity pool of certain token,  only called by Privi with Postman (not FE)
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

// user deposits in some pool
exports.depositLiquidity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const liquidityProviderAddress = body.LiquidityProviderAddress; // depositing user address
        const poolToken = body.PoolToken;
        const amount = body.Amount;

        const depositId = generateUniqueId();
        const txnId = generateUniqueId();

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

exports.swapCrytoTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const traderAddress = body.TraderAddress;
        const tokenFrom = body.TokenFrom;
        const tokenTo = body.TokenTo;
        const amountFrom = body.AmountFrom;

        const rate = 1;
        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await liquidityPool.swapCrytoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(tokenFrom).get();
            const liquidityPoolData: any = liquidityPoolSnap.data();
            // add provider
            const swaps = liquidityPoolData.Providers ?? {};
            if (!swaps[traderAddress]) swaps[traderAddress] = amountFrom;
            else swaps[traderAddress] += amountFrom;
            liquidityPoolSnap.ref.update({ Swaps: swaps });

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> swapCrytoTokens(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> swapCrytoTokens(): ', err);
        res.send({ success: false });
    }
};

exports.protectLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.poolToken;
        const poolSpread = body.PoolSpread;
        const date = body.Date;
        const caller = apiKey;

        const blockchainRes = await liquidityPool.protectLiquidityPool(poolToken, poolSpread, date, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(poolToken, "Liquidity Pool - Pool protected",
                ` `,
                notificationTypes.liquidityPoolProtect
            );
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


// --------------------------------- GET ----------------------------------

exports.getLiquidityPools = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).get();
        liquidityPoolSnap.forEach((doc) => {
            const data: any = doc.data();
            // get staked amount in Privi
            const token = data.PoolToken ?? '';
            const amount = data.StakedAmount ?? 0;
            const amountInUSD = rateOfChange[token] ? rateOfChange[token] * amount : amount; // to usd
            const amountInPrivi = rateOfChange["PRIVI"] ? rateOfChange['PRIVI'] * amountInUSD : amountInUSD; // to PRIVI

            retData.push({
                StakedAmountInPrivi: amountInPrivi,
                ...data
            });
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPools(): ', err);
        res.send({ success: false });
    }
};