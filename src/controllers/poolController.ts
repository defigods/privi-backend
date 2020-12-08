import express from 'express';
import podProtocol from "../blockchain/podFTProtocol";
import { updateFirebase, createNotification } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now

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

        const blockchainRes = await podProtocol.createLiquidityPool(poolAddress, poolToken, minFee, maxFee, riskParameter, regimePoint, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(poolAddress, "Liquidity Pool - Pool Created",
                ` `,
                notificationTypes.liquidityPoolCreation
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> createLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> createLiquidityPool(): ', err);
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

        const blockchainRes = await podProtocol.depositLiquidity(liquidityProviderAddress, poolToken, amount, depositId, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(liquidityProviderAddress, "Liquidity Pool - Pool Deposited",
                ` `,
                notificationTypes.liquidityPoolProvide
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> depositLiquidity(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> depositLiquidity(): ', err);
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
        
        const blockchainRes = await podProtocol.swapCrytoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, date, txnId, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(traderAddress, "Crypto Token - Swapped",
                ` `,
                notificationTypes.liquidityPoolSwap
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> swapCrytoTokens(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> swapCrytoTokens(): ', err);
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

        const blockchainRes = await podProtocol.protectLiquidityPool(poolToken, poolSpread, date, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(poolToken, "Liquidity Pool - Pool protected",
                ` `,
                notificationTypes.liquidityPoolProtect
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> protectLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> protectLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

exports.listLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const caller = apiKey;

        const blockchainRes = await podProtocol.listLiquidityPool(poolToken, caller);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(poolToken, "Liquidity Pool - Pool Listed",
                ` `,
                notificationTypes.liquidityPoolList
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> listLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> listLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityPoolInfo = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const poolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
        const poolData = poolSnap.data();

        if (poolData) {
            res.send({ success: true, data: poolData });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> getLiquidityPoolInfo(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityPoolState = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const poolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
        const poolData = poolSnap.data();

        if (poolData) {
            res.send({ success: true, data: poolData });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> getLiquidityPoolState(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityDeposits = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const address = body.Address;
        const depositSnap = await db.collection(collections.liquidityPools).doc(address).get();
        const depositData = depositSnap.data();

        if (depositData) {
            res.send({ success: true, data: depositData });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> getLiquidityDeposits(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityProviders = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const providersSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
        const providersData = providersSnap.data();

        if (providersData) {
            res.send({ success: true, data: providersData });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> getLiquidityProviders(): ', err);
        res.send({ success: false });
    }
};

