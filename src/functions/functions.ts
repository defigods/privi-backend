import { db, firebase } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance.js";
import collections from "../firebase/collections";
import axios from "axios";

const xid = require('xid-js');  // for generating unique ids (in Txns for example)
const uuid = require('uuid');


// updates multiple firebase collection according to blockchain response
export async function updateFirebase(blockchainRes) {
    const output = blockchainRes.output;
    await db.runTransaction(async (transaction) => {
        const updateTokens = output.UpdateTokens;   // new added
        const updateBalances = output.UpdateBalances;   // new added
        const updateTransactions = output.Transactions;   // new added
        const updateLoans = output.UpdateLoans;
        const updatePods = output.UpdatePods;   // changed to new version
        const updatePodStates = output.UpdatePodStates; // new adaded
        const updateInsurancePools = output.UpdateInsurancePools;
        const updateInsuranceStates = output.UpdateInsuranceStates;
        const updateInsuranceInvestors = output.UpdateInsuranceInvestors;
        const updateInsuranceClients = output.UpdateInsuranceClients;
        // update loan
        if (updateLoans) {
            let loanId: string = "";
            let loanObj: any = {};
            for ([loanId, loanObj] of Object.entries(updateLoans)) {
                transaction.set(db.collection(collections.priviCredits).doc(loanId), loanObj);
            }
        }
        // update tokens
        if (updateTokens) {
            let key: string = "";
            let val: any = null;
            for ([key, val] of Object.entries(updateTokens)) {
                transaction.set(db.collection(collections.tokens).doc(key), val);
            }
        }
        // update balances
        if (updateBalances) {
            let key: string = "";
            let balanceObj: any = null;
            for ([key, balanceObj] of Object.entries(updateBalances)) {
                let uid = "";
                let token = "";
                let tokenType = "";
                const splitted: string[] = key.split(" ");
                uid = splitted[0];
                token = splitted[1];
                tokenType = await identifyTypeOfToken(token);   // token type colection                
                if (tokenType == collections.unknown && updateTokens) { // case new token added in the system
                    const newToken: any = Object.values(updateTokens)[0];
                    if (newToken.TokenType) tokenType = newToken.TokenType;
                }
                console.log(uid, token, tokenType);
                transaction.set(db.collection(collections.wallet).doc(uid).collection(tokenType).doc(token), balanceObj, { merge: true });
            }
        }
        // update transactions (for each txn, save to from's colection and to's colection)
        if (updateTransactions) {
            let key: string = "";
            let val: any = null;
            for ([key, val] of Object.entries(updateTransactions)) {
                const from = val.From;
                const to = val.To;
                if (from) transaction.set(db.collection(collections.history).doc(collections.history).collection(from).doc(key), val);
                if (to) transaction.set(db.collection(collections.history).doc(collections.history).collection(to).doc(key), val);
            }
        }
        // update pods (FT and NFT)
        if (updatePods) {
            let podId: string = '';
            let podObj: any = {};
            for ([podId, podObj] of Object.entries(updatePods)) {
                // find out NFT or FT
                let colectionName = collections.podsFT;
                if (podObj.Royalty) colectionName = collections.podsNFT;    // case NFT
                // with merge flag because pods have more info thats not in blockchain (eg followers)
                transaction.set(db.collection(colectionName).doc(podId), podObj, { merge: true });
            }
        }
        // update pod states
        if (updatePodStates) {
            let podId: string = '';
            let podState: any = {};
            for ([podId, podState] of Object.entries(updatePodStates)) {
                // find out NFT or FT
                let colectionName = collections.podsFT;
                if (podState.Royalty) colectionName = collections.podsNFT;    // case NFT
                // with merge flag because pods have more info thats not in blockchain (eg followers)
                transaction.set(db.collection(colectionName).doc(podId), podState, { merge: true });
            }
        }
        // update insurance pools
        if (updateInsurancePools) {
            let insuranceId: string = '';
            let insuranceState: any = {};
            for ([insuranceId, insuranceState] of Object.entries(updateInsurancePools)) {
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId), insuranceState, { merge: true });
            }
        }
        // update insurance states
        if (updateInsuranceStates) {
            let insuranceId: string = '';
            let insuranceState: any = {};
            for ([insuranceId, insuranceState] of Object.entries(updateInsuranceStates)) {
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId), insuranceState, { merge: true });
            }
        }
        // update insurance investors
        if (updateInsuranceInvestors) {
            let insuranceId: string = '';
            let investorObj: any = {};
            for ([insuranceId, investorObj] of Object.entries(updateInsuranceInvestors)) {
                const investorMapField = "Investors." + investorObj.InvestorAddress;
                const updateObj = {
                    investorMapField: investorObj
                }
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId), updateObj, { merge: true });
            }
        }
        // update insurance clients
        if (updateInsuranceClients) {
            let insuranceId: string = '';
            let clientObj: any = {};
            for ([insuranceId, clientObj] of Object.entries(updateInsuranceInvestors)) {
                const clientMapField = "Investors." + clientObj.ClientAddress;
                const updateObj = {
                    clientMapField: clientObj
                }
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId), updateObj, { merge: true });
            }
        }
    });
}


// rate of all tokens in ratesOfChange colection (that is all types except nft) as {}
export async function getRateOfChange() {
    let res = {};
    const ratesQuery = await db.collection(collections.rates).get();
    for (const doc of ratesQuery.docs) {
        const rate = doc.data().rate;
        res[doc.id] = rate;
    }
    // still don't have these Token conversion rates in firebase, so we add them manually
    res["BC"] = 1;
    res["DC"] = res["PC"];
    return res;
};

// rate of all tokens in ratesOfChange colection (that is all types except nft) as []
export async function getTokensRate2() {
    const data: {}[] = [];
    let dcRate = 0.014;
    try {
        const ratesSnap = await db.collection(collections.rates).get();
        for (const doc of ratesSnap.docs) {
            const name = doc.data().name;
            const token = doc.id;
            const rate = doc.data().rate;
            if (name) data.push({ token: token, name: name, rate: rate });

            if (token == "PC") dcRate = rate;
        }
        data.push({ token: "BC", name: "Base Coin", rate: 1 });
        data.push({ token: "DC", name: "Data Coin", rate: dcRate });   // DC same rate as PC for now

    } catch (err) {
        console.log('Error in controllers/walletController -> getTokensRate()', err);
    }

    return data;
}


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

export async function getUidNameMap() {
    const map = {};
    const userSnap = await db.collection(collections.user).get();
    userSnap.forEach((doc) => {
        const name = doc.data().firstName;
        map[doc.id] = name;
    })
    return map;
}

export function generateUniqueId() {
    // const id = xid.next();
    // return id;
    return 'Px' + uuid.v4();
}

export function isEmail(email: string) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegexp.test(email);
}

const identifyTypeOfToken = async function (token: string): Promise<string> {
    const tokenSnap = await db.collection(collections.tokens).doc(token).get();
    if (tokenSnap.exists) {
        const data = tokenSnap.data();
        if (data) return data.TokenType;
    }
    return collections.unknown;
}
module.exports.identifyTypeOfToken = identifyTypeOfToken;