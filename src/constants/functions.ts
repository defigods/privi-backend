import { db, firebase } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance";
const collections = require("../firebase/collections");

export async function updateFirebase(blockchainRes) {
    const output = blockchainRes.output;
    await db.runTransaction(async (transaction) => {
        const updateWallets = output.UpdateWallets;
        const updateLoans = output.UpdateLoans;
        // update loan
        if (updateLoans != undefined && updateLoans != null) {
            let loanId: string = "";
            let loanObj: any = {};
            for ([loanId, loanObj] of Object.entries(updateLoans)) {
                transaction.set(db.collection(collections.priviCredits).doc(loanId), loanObj);
            }
        }
        if (updateWallets != undefined && updateWallets != null) {
            // update wallet
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
    });
}

export async function getRateOfChange() {
    let res = {};
    const ratesQuery = await db.collection("ratesOfChange").get();
    for (let i = 0; i < ratesQuery.docs.length; i++) {
        const lastRateQuery = await ratesQuery.docs[i].ref.collection("rateHistory").orderBy("timestamp", "desc").limit(1).get();
        let _lastRate = 0;
        if (!lastRateQuery.empty) {
            lastRateQuery.forEach((doc) => {
                let docData = doc.data();
                _lastRate = docData["rateUSD"];
            });
        }
        res[ratesQuery.docs[i].id] = _lastRate;
    }
    // still don't have these Token conversion rates in firebase, so we add them manually
    res["BC"] = 1;
    res["DC"] = 0.01;
    res["PDT"] = 0.01;
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
        const interestSnap = await db.collection("manualConstants").doc("TraditionalLendingConstants").get();
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
        console.log("constants/functions.ts: error calling blockchain get tokenList");
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
        const interestSnap = await db.collection("manualConstants").doc("StakingConstants").get();
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
        console.log("constants/functions.ts: error calling blockchain get tokenList");
        return null;
    }
};