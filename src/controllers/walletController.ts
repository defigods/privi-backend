import { updateFirebase, createNotificaction, getRateOfChange, getCurrencyRatesUsdBase, getUidFromEmail } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance";
import express from 'express';
const currencySymbol = require("currency-symbol");

module.exports.send = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const fromUid = body.fromUid;
        let toUid = body.toUid;
        const toEmail = body.toEmail; // in case recipient email is passed instead of uid
        const amount = body.amount;
        const token = body.token;
        const type = body.type;
        if (toEmail) {
            const emailUidMap = await getUidFromEmail(toEmail);
            toUid = emailUidMap[toEmail];
        }
        if (!toUid) {
            res.send({ success: true, message: "toUid is required" });
            return;
        }
        const blockchainRes = await coinBalance.blockchainTransfer(fromUid, toUid, amount, token, type);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            let senderName = fromUid;
            let receiverName = toUid;
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


module.exports.withdraw = async (req: express.Request, res: express.Response) => {
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

module.exports.swap = async (req: express.Request, res: express.Response) => {
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



///////////////////////////// gets //////////////////////////////

const getTotalBalance = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        const rateOfChange = await getRateOfChange();
        // get user currency in usd
        let sum = 0;
        let sumTokens = 0;
        let token: string = "";
        let rate: any = 1;
        for ([token, rate] of Object.entries(rateOfChange)) {
            const walletTokenSnap = await db.collection(collections.wallet).doc(token).collection(collections.user).doc(userId).get();
            const data = walletTokenSnap.data();
            if (data) {
                sum += data.Amount * rate;
                sumTokens = sumTokens + data.Amount;
            }
        }
        // get user currency
        let amountInUserCurrency = sum;
        const userSnap = await db.collection(collections.user).doc(userId).get();
        const userData = userSnap.data();
        let currency = "Unknown";
        if (userData) {
            currency = userData.currency;
            const currencyRate = await getCurrencyRatesUsdBase()
            if (currency == "EUR" || currency == "GBP") amountInUserCurrency = amountInUserCurrency * currencyRate[currency];
        }

        const data = {
            amount: amountInUserCurrency,
            tokens: sumTokens,
            currency: currency,
            currency_symbol: currencySymbol.symbol(currency)
        }
        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTotalBalance()', err);
        res.send({ success: false });
    }
}
module.exports.getTotalBalance = getTotalBalance;

module.exports.getTotalBalancePC = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        
        let { userId } = req.query;
		userId = userId!.toString()

        const rateOfChange = await getRateOfChange();
        // get user currency in usd
        let sum = 0;
        let token: string = "";
        let rate: any = 1;
        for ([token, rate] of Object.entries(rateOfChange)) {
            const walletTokenSnap = await db.collection(collections.wallet).doc(token).collection(collections.user).doc(userId).get();
            const data = walletTokenSnap.data();
            if (data) {
                const convRate = rateOfChange[token] / rateOfChange["PC"];
                sum += data.Amount * convRate;
            }
        }
        res.send({ success: true, data: sum });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTotalBalancePC()', err);
        res.send({ success: false });
    }
}

module.exports.getTokensRate = async (req: express.Request, res: express.Response) => {
    try {
        const data: {}[] = [];
        const ratesSnap = await db.collection(collections.rates).get();
        for (const doc of ratesSnap.docs) {
            const name = doc.data().name;
            const token = doc.id;
            const rate = doc.data().rate;
            if (name) data.push({ token: token, name: name, rate: rate });
        }
        data.push({ token: "BC", name: "Base Coin", rate: 1 });
        data.push({ token: "DC", name: "Data Coin", rate: 0.01 });

        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokensRate()', err);
        res.send({ success: false });
    }
}

module.exports.getTokenBalances = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        const retData: {}[] = [];
        const rateOfChange = await getRateOfChange();
        for (const [token, _] of Object.entries(rateOfChange)) {
            const walletTokenSnap = await db.collection(collections.wallet).doc(token).collection(collections.user).doc(userId).get();
            const data = walletTokenSnap.data();
            let amount = 0;
            if (data) amount = data.Amount;
            retData.push({ token: token, value: amount });
        }
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokenBalances()', err);
        res.send({ success: false });
    }
}

module.exports.getTransfers = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        const retData: {}[] = [];
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId)
            .where("Type", "in", [notificationTypes.transferSend, notificationTypes.transferReceive])
            .orderBy("Date", "desc")
            .get();
        historySnap.forEach((doc) => {

			let date = new Date(doc.data().Date);
            const data = { id: doc.data().Id, token: doc.data().Token, value: doc.data().Amount, type: doc.data().Type, date: (date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear()) };

            retData.push(data);
        })
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTransfers()', err);
        res.send({ success: false });
    }
}

module.exports.getTransactions = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        const retData: {}[] = [];
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId).orderBy("Date", "desc").get();
        historySnap.forEach((doc) => {

			let date = new Date(doc.data().Date);
            const data = { id: doc.data().Id, token: doc.data().Token, value: doc.data().Amount, type: doc.data().Type, date: (date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear()) };

            retData.push(data);
        })
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTransactions()', err);
        res.send({ success: false });
    }
}

module.exports.getTotalIncome = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        let sum = 0;    // in usd
        const rateOfChange = await getRateOfChange();
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId)
            .where("To", "==", userId).get();
        historySnap.forEach((doc) => {
            const token = doc.data().Token;
            const amount = doc.data().Amount;
            let rate = 1;
            if (rateOfChange[token]) rate = rateOfChange[token];
            sum += amount * rate;
        })
        // get user currency
        let amountInUserCurrency = sum;
        const userSnap = await db.collection(collections.user).doc(userId).get();
        const userData = userSnap.data();
        let currency = "Unknown";
        if (userData) {
            currency = userData.currency;
            const currencyRate = await getCurrencyRatesUsdBase()
            if (currency == "EUR" || currency == "GBP") amountInUserCurrency = amountInUserCurrency * currencyRate[currency];
        }
        res.send({ success: true, data: amountInUserCurrency });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTotalWithdraw()', err);
        res.send({ success: false });
    }
}

module.exports.getTotalExpense = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        let { userId } = req.query;
		userId = userId!.toString()

        let sum = 0;    // in usd
        const rateOfChange = await getRateOfChange();
        const historySnap = await db.collection(collections.history).doc(collections.history).collection(userId)
            .where("From", "==", userId).get();
        historySnap.forEach((doc) => {
            const token = doc.data().Token;
            const amount = doc.data().Amount;
            let rate = 1;
            if (rateOfChange[token]) rate = rateOfChange[token];
            sum += amount * rate;
        })
        // get user currency
        let amountInUserCurrency = sum;
        const userSnap = await db.collection(collections.user).doc(userId).get();
        const userData = userSnap.data();
        let currency = "Unknown";
        if (userData) {
            currency = userData.currency;
            const currencyRate = await getCurrencyRatesUsdBase()
            if (currency == "EUR" || currency == "GBP") amountInUserCurrency = amountInUserCurrency * currencyRate[currency];
        }
        res.send({ success: true, data: amountInUserCurrency });
    } catch (err) {
        console.log('Error in controllers/walletController -> getTotalSwap()', err);
        res.send({ success: false });
    }
}
