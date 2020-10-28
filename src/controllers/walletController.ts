import createNotificaction from "./notifications";
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest } from "../constants/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance";
import express from 'express';

const send = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const fromUid = body.fromUid;
        const toUid = body.toUid;
        const amount = body.amount;
        const token = body.token;
        const type = body.type;
        const blockchainRes = await coinBalance.blockchainTransfer(fromUid, toUid, amount, token, type);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // notification
            let senderName = fromUid;
            let receiverName = toUid;
            // const senderSnap = await db.colletion(collection.user).doc(fromUid).get();
            // const receiverSnap = await db.colletion(collection.user).doc(toUid).get();
            const senderSnap = await db.collection(collections.user).doc(fromUid).get();
            const receiverSnap = await db.collection(collections.user).doc(toUid).get();
            const senderData = senderSnap.data();
            const receriverData = receiverSnap.data();
            if (senderData !== undefined && receriverData !== undefined) {
                senderName = senderData.firstName;
                receiverName = receriverData.firstName;
                // notification to sender 
                createNotificaction(fromUid, "Transfer - Sent",
                    `You have succesfully send ${amount} ${token} to ${receiverName}!`,
                    notificationTypes.transferSend
                );
                // notification to receiver
                createNotificaction(fromUid, "Transfer - Received",
                    `You have succesfully received ${amount} ${token} from ${senderName}!`,
                    notificationTypes.transferReceive
                );
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> send()');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> send()', err);
        res.send({ success: false });
    }
}


const withdraw = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await coinBalance.withdraw(publicId, amount, token);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Withdraw - Complete",
                `You have succesfully swapped ${amount} ${token} from your PRIVI Wallet. ${amount} ${token} has been added to your Ethereum wallet!`,
                notificationTypes.withdraw
            );
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> withdraw()');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> withdraw()', err);
        res.send({ success: false });
    }
}

const swap = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const amount = body.amount;
        const token = body.token;
        const blockchainRes = await coinBalance.swap(publicId, amount, token);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "Swap - Complete",
                `You have succesfully swapped ${amount} ${token} from your Ethereum Wallet. ${amount} ${token} has been added to your PRIVI wallet!`,
                notificationTypes.swap
            );
            res.send({ success: true });
        } else {
            console.log('Error in controllers/walletController -> swap()');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> swap()', err);
        res.send({ success: false });
    }
}

module.exports = {
    send,
    withdraw,
    swap
}
