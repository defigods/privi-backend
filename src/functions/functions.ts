import { db, firebase } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance";
import collections from "../firebase/collections";
import axios from "axios";

// updates multiple firebase collection according to blockchain response
export async function updateFirebase(blockchainRes) {
    const output = blockchainRes.output;
    await db.runTransaction(async (transaction) => {
        const updateUser = output.UpdateUser;
        const updateWallets = output.UpdateWallets;
        const updateLoans = output.UpdateLoans;
        const updatePods = output.UpdatePods;
        const updatePools = output.UpdatePools;
        // update user
        if (updateUser !== undefined && updateUser !== null) {
            let uid: string = '';
            let walletObj: any = {};
            for ([uid, walletObj] of Object.entries(updateWallets)) {
                // balances
                const balances = walletObj.Balances;
                for (const [token, value] of Object.entries(balances)) {
                    transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                }
                // transactions
                const history = walletObj.Transaction;
                if (history != null) {
                    history.forEach(obj => {
                        transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                        transaction.set(db.collection(collections.allTransactions).doc(obj.Id), obj); // to be deleted later
                    });
                }
            }
        }
        // update loan
        if (updateLoans !== undefined && updateLoans !== null) {
            let loanId: string = "";
            let loanObj: any = {};
            for ([loanId, loanObj] of Object.entries(updateLoans)) {
                transaction.set(db.collection(collections.priviCredits).doc(loanId), loanObj);
            }
        }
        // update wallet
        if (updateWallets !== undefined && updateWallets !== null) {
            let uid: string = '';
            let walletObj: any = {};
            for ([uid, walletObj] of Object.entries(updateWallets)) {
                // balances
                const balances = walletObj.Balances;
                for (const [token, value] of Object.entries(balances)) {
                    transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value);
                }
                // transactions
                const history = walletObj.Transaction;
                if (history != null) {
                    history.forEach(obj => {
                        transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                        transaction.set(db.collection(collections.allTransactions).doc(obj.Id), obj); // to be deleted later
                    });
                }
            }
        }
        // update pods (FT)
        if (updatePods !== undefined && updatePods !== null) {
            let podId: string = '';
            let podObj: any = {};
            for ([podId, podObj] of Object.entries(updatePods)) {
                transaction.set(db.collection(collections.podsFT).doc(podId), podObj); // to be deleted later
            }
        }
        // update pools
        if (updatePools !== undefined && updatePools !== null) {
            let poolId: string = '';
            let poolObj: any = {};
            for ([poolId, poolObj] of Object.entries(updatePools)) {
                transaction.set(db.collection(collections.liquidityPools).doc(poolId), poolObj); // to be deleted later
            }
        }
    });
}

export async function getRateOfChange() {
    let res = {};
    const ratesQuery = await db.collection(collections.rates).get();
    for (const doc of ratesQuery.docs) {
        const rate = doc.data().rate;
        res[doc.id] = rate;
    }
    // still don't have these Token conversion rates in firebase, so we add them manually
    res["BC"] = 1;
    res["DC"] = 0.1;
    return res;
};

// traditional lending interest harcoded in firebase
export async function getLendingInterest() {
    const res = {};
    const blockchainRes = await coinBalance.getTokenList();
    if (blockchainRes && blockchainRes.success) {
        const tokenList: string[] = blockchainRes.output;
        tokenList.forEach((token) => {
            res[token] = 0.02 // case firebase doesnt contain these
        })
        const interestSnap = await db.collection(collections.constants).doc("TraditionalLendingConstants").get();
        const interestData = interestSnap.data();
        if (interestData !== undefined) {
            const interest = interestData["interest"];
            tokenList.forEach((token) => {
                res[token] = interest;
            })
        }
        else {
            console.log("constants/functions.ts: firebase traditional lending constants not found, using predefined values for interest...");
        }
        return res;
    }
    else {
        console.log("constants/functions.ts: error cron job started blockchain get tokenList");
        return null;
    }
};

// traditional staking interest harcoded in firebase
export async function getStakingInterest() {
    const res = {};
    const blockchainRes = await coinBalance.getTokenList();
    if (blockchainRes && blockchainRes.success) {
        const tokenList: string[] = blockchainRes.output;
        tokenList.forEach((token) => {
            res[token] = 0.02 // case firebase doesnt contain these
        })
        const interestSnap = await db.collection(collections.constants).doc("StakingConstants").get();
        const interestData = interestSnap.data();
        if (interestData !== undefined) {
            const interest = interestData["interest"];
            tokenList.forEach((token) => {
                res[token] = interest;
            })
        }
        else {
            console.log("constants/functions.ts: firebase traditional lending constants not found, using predefined values for interest...");
        }
        return res;
    }
    else {
        console.log("constants/functions.ts: error cron job started blockchain get tokenList");
        return null;
    }
};

export async function createNotification(userId, title, text, type) {
    if (userId && title && text && type) {
        const dbNotificationRef = db.collection(collections.user).doc(userId).collection(collections.notificaction);
        await dbNotificationRef.add({
            title: title,
            text: text,
            type: type,
            createdAt: Date.now(),
        });
        return true;
    } else {
        return false;
    }
}

export async function getCurrencyRatesUsdBase() {
    const resp = await axios.get("https://api.exchangeratesapi.io/latest?base=USD");
    const rates = resp.data.rates;
    rates.USD = 1;
    return rates;
}

// return object that maps uid to email and viceversa - this would be very big soon avoid when you can
export async function getEmailUidMap() {
    let res = {};
    const usersQuery = await db.collection(collections.user).get();
    for (const doc of usersQuery.docs) {
        const email = doc.data().email;
        res[doc.id] = email;
        res[email] = doc.id;
    }
    return res;
};

export async function getUidFromEmail(email) {
    let res = {};
    const usersQuery = await db.collection(collections.user).where("email", "==", email).get();
    for (const doc of usersQuery.docs) {
        const email = doc.data().email;
        res[doc.id] = email;
        res[email] = doc.id;
    }
    return res;
};
