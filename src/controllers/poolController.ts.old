import express from 'express';
import podProtocol from "../blockchain/podFTProtocol";
import { updateFirebase, getRateOfChange, createNotification } from "../functions/functions";
import notificationTypes from "../constants/notificationType";

exports.createLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creatorId = body.creatorId;
        const token = body.token;
        const minReserveRatio = body.minReserveRatio;
        const initialAmount = body.initialAmount;
        const fee = body.fee;
        const withdrawalTime = body.withdrawalTime;
        const withdrawalFee = body.withdrawalFee;
        const minEndorsementScore = body.minEndorsementScore;
        const minTrustScore = body.minTrustScore;
        const blockchainRes = await podProtocol.createLiquidityPool(creatorId, token, minReserveRatio, initialAmount, fee, withdrawalTime, withdrawalFee, minEndorsementScore, minTrustScore);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(creatorId, "Liquidity Pool - Pool Created",
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
        const liquidityPoolId = body.liquidityPoolId;
        const providerId = body.providerId;
        const amount = body.amount;
        const blockchainRes = await podProtocol.depositLiquidity(liquidityPoolId, providerId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(providerId, "Liquidity Pool - Pool Deposited",
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

exports.withdrawLiquidity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const liquidityPoolId = body.liquidityPoolId;
        const providerId = body.providerId;
        const amount = body.amount;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.withdrawLiquidity(liquidityPoolId, providerId, amount, rateOfChange)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(providerId, "Liquidity Pool - Pool Deposited",
                ` `,
                notificationTypes.liquidityPoolWithdraw
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/poolController -> withdrawLiquidity(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/poolController -> withdrawLiquidity(): ', err);
        res.send({ success: false });
    }
};
