import express from 'express';
const tradinionalLending = require("../blockchain/traditionalLending");
import { updateFirebase, createNotificaction } from "../constants/functions";
const notificationTypes = require("../constants/notificationType");

exports.stakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.stakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Token Staked",
                ` `,
                notificationTypes.staking
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> stakeToken(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> stakeToken(): ', err);
        res.send({ success: false });
    }
};

exports.unstakeToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await tradinionalLending.unstakeToken(publicId, token, amount)
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Loans 1.0 - Token Unstaked",
                ` `,
                notificationTypes.unstaking
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/lendingController -> unstakeToken(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/lendingController -> unstakeToken(): ', err);
        res.send({ success: false });
    }
};