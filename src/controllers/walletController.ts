const firebase = require("../firebase/firebase");
const db = firebase.getDb();
const collections = require("../firebase/collections");
const coinBalance = require("../blockchain/coinBalance");
const notification = require("./notifications");
const notificationTypes = require("../constants/notificationType");
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
            const output = blockchainRes.output;
            console.log(output);
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    // for (const [uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            // notification
            let senderName = fromUid;
            let receiverName = toUid;
            // const senderSnap = await db.colletion(collection.user).doc(fromUid).get();
            // const receiverSnap = await db.colletion(collection.user).doc(toUid).get();
            const senderSnap = await db.collection(collections.user).doc(fromUid).get();
            const receiverSnap = await db.collection(collections.user).doc(toUid).get();
            senderName = senderSnap.data().firstName;
            receiverName = receiverSnap.data().firstName;
            // notification to sender 
            await notification.createNotificaction(fromUid, "Transfer - Sent",
                `You have succesfully send ${amount} ${token} to ${receiverName}!`,
                notificationTypes.transferSend
            );
            // notification to receiver
            await notification.createNotificaction(fromUid, "Transfer - Received",
                `You have succesfully received ${amount} ${token} from ${senderName}!`,
                notificationTypes.transferReceive
            );
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
            const output = blockchainRes.output;
            console.log(output);
            console.log("withdraw ok");
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(publicId, "Withdraw - Complete",
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
            const output = blockchainRes.output;
            console.log(output);
            console.log("swap ok");
            await db.runTransaction(async (transaction) => {
                let uid: string = '';
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(output.UpdateWallets)) {
                    const balances = walletObj.Balances;
                    for (const [token, value] of Object.entries(balances)) {
                        transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                    }
                    const history = walletObj.Transaction;
                    if (history != null) {
                        history.forEach(obj => {
                            transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                            transaction.set(db.collection(collections.allTransactions).doc(), obj); // to be deleted later
                        });
                    }
                }
            });
            await notification.createNotificaction(publicId, "Swap - Complete",
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
