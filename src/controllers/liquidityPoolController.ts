import express from 'express';
import liquidityPool from "../blockchain/liquidtyPool";
import { updateFirebase, createNotification } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now
const notificationsController = require('./notificationsController');

// --------------------------------- POST ----------------------------------

exports.createLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolAddress = body.PoolAddress;
        const poolToken = body.PoolToken;
        const minFee = body.MinFee;
        const maxFee = body.MaxFee;
        const riskParameter = body.RiskParameter;
        const regimePoint = body.RegimePoint;
        const caller = apiKey;

        const blockchainRes = await liquidityPool.createLiquidityPool(poolAddress, poolToken, minFee, maxFee, riskParameter, regimePoint, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(poolAddress, "Liquidity Pool - Pool Created",
                ` `,
                notificationTypes.liquidityPoolCreation
            );
            /*await notificationsController.addNotification({
                userId: creatorId,
                notification: {
                    type: 45,
                    typeItemId: '',
                    itemId: '', //Liquidity pool id
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: 0,
                    onlyInformation: false,
                }
            });*/
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

exports.depositLiquidity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const liquidityProviderAddress = body.LiquidityProviderAddress;
        const poolToken = body.PoolToken;
        const amount = body.Amount;
        const depositId = body.DepositId;
        const txnId = body.TxnId;
        const caller = apiKey;

        const blockchainRes = await liquidityPool.depositLiquidity(liquidityProviderAddress, poolToken, amount, depositId, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(liquidityProviderAddress, "Liquidity Pool - Pool Deposited",
                ` `,
                notificationTypes.liquidityPoolProvide
            );
            /*const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(liquidityPoolId).get();
            const liquidityPoolData : any = liquidityPoolSnap.data();
            await notificationsController.addNotification({
                userId: liquidityPoolData.CreatorId,
                notification: {
                    type: 45,
                    itemId: liquidityProviderAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: '',
                    amount: 0,
                    onlyInformation: false,
                }
            });*/
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
        const rate = body.Rate;
        const date = body.Date;
        const txnId = body.TxnId;
        const caller = apiKey;

        const blockchainRes = await liquidityPool.swapCrytoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(traderAddress, "Crypto Token - Swapped",
                ` `,
                notificationTypes.liquidityPoolSwap
            );
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