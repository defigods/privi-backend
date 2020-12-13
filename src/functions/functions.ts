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
        console.log(output);
        const updateUser = output.UpdateUser;
        const updateWallets = output.UpdateWallets; // to be deleted
        const updateTokens = output.UpdateTokens;
        const updateBalances = output.UpdateBalances;
        const updateTransactions = output.Transactions;
        // Pods FT and NFT
        const updatePods = output.UpdatePods;
        const updatePodStates = output.UpdatePodStates;
        const updateBuyingOffers = output.UpdateBuyingOffers;
        const updateSellingOffers = output.UpdateSellingOffers;
        // Insurance
        const updateInsurancePools = output.UpdateInsurancePools;
        const updateInsuranceStates = output.UpdateInsuranceStates;
        const updateInsuranceInvestors = output.UpdateInsuranceInvestors;
        const updateInsuranceClients = output.UpdateInsuranceClients;
        const updatePools = output.UpdatePools;
        const updateInsurance = output.UpdateInsurance;
        // update loan
        const updateLenders = output.UpdateLenders;
        const updateBorrowers = output.UpdateBorrowers;
        const updatedCreditInfo = output.UpdatedCreditInfo;
        const updatedCreditState = output.UpdatedCreditState;
        const updatedCreditRequirement = output.UpdatedCreditRequirement;

        // update user
        if (updateUser) {
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
        // update tokens
        if (updateTokens) {
            let key: string = "";
            let val: any = null;
            for ([key, val] of Object.entries(updateTokens)) {
                transaction.set(db.collection(collections.tokens).doc(key), val);
            }
        }
        // update wallet
        if (updateWallets) {
            let uid: string = '';
            let walletObj: any = {};
            for ([uid, walletObj] of Object.entries(updateWallets)) {
                // balances
                const balances = walletObj.Balances;
                let token: string = '';
                let value: any = null;
                for ([token, value] of Object.entries(balances)) {
                    transaction.set(db.collection(collections.wallet).doc(token).collection(collections.user).doc(uid), value, { merge: true });
                }
                // balances ft
                const balancesFT = walletObj.BalancesFT;
                for ([token, value] of Object.entries(balancesFT)) {
                    transaction.set(db.collection(collections.walletFT).doc(token).collection(collections.user).doc(uid), value, { merge: true });
                }
                // balances nft
                const balancesNFT = walletObj.BalancesNFT;
                for ([token, value] of Object.entries(balancesNFT)) {
                    transaction.set(db.collection(collections.walletNFT).doc(token).collection(collections.user).doc(uid), value, { merge: true });
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
        // update nft buying offers
        if (updateBuyingOffers) {
            let orderId: string = '';
            let orderObj: any = null;
            for ([orderId, orderObj] of Object.entries(updateBuyingOffers)) {
                const podAddress = orderObj.PodAddress;
                if (podAddress) transaction.set(db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId), orderObj, { merge: true });
                else console.log("Update Firebase: update nft buying order error ,", orderId, " order updateObject has no podAddress field");
            }
        }
        // update nft selling offers
        if (updateSellingOffers) {
            let orderId: string = '';
            let orderObj: any = null;
            for ([orderId, orderObj] of Object.entries(updateSellingOffers)) {
                const podAddress = orderObj.PodAddress;
                if (podAddress) transaction.set(db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId), orderObj, { merge: true });
                else console.log("Update Firebase: update nft selling order error ,", orderId, " order updateObject has no podAddress field");
            }
        }
        // update pools
        if (updatePools) {
            let poolId: string = '';
            let poolObj: any = {};
            for ([poolId, poolObj] of Object.entries(updatePools)) {
                transaction.set(db.collection(collections.liquidityPools).doc(poolId), poolObj, { merge: true }); // to be deleted later
            }
        }
        // TODO: update insurance
        if (updateInsurance) {

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
                const investorId = investorObj.InvestorAddress;
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId).collection(collections.insuranceInvestors).doc(investorId), investorObj, { merge: true });
            }
        }
        // update insurance clients
        if (updateInsuranceClients) {
            let insuranceId: string = '';
            let clientObj: any = {};
            for ([insuranceId, clientObj] of Object.entries(updateInsuranceInvestors)) {
                const clientId = clientObj.ClientAddress;
                transaction.set(db.collection(collections.insurancePools).doc(insuranceId).collection(collections.insuranceClients).doc(clientId), clientObj, { merge: true });
            }
        }
        // update lender (in both User and PriviCredit colection)
        if (updateLenders) {
            let creditId: string = '';
            let lenderObj: any = {};
            for ([creditId, lenderObj] of Object.entries(updateLenders)) {
                const lenderId = lenderObj.LenderAddress;
                transaction.set(db.collection(collections.priviCredits).doc(creditId).collection(collections.priviCreditsLending).doc(lenderId), lenderObj, { merge: true });
                transaction.set(db.collection(collections.user).doc(lenderId).collection(collections.priviCreditsLending).doc(creditId), lenderObj, { merge: true });
            }
        }
        // update borrower (in both User and PriviCredit colection)
        if (updateBorrowers) {
            let creditId: string = '';
            let borrowerObj: any = {};
            for ([creditId, borrowerObj] of Object.entries(updateBorrowers)) {
                const borrowerId = borrowerObj.BorrowerAddress;
                transaction.set(db.collection(collections.priviCredits).doc(creditId).collection(collections.priviCreditsBorrowing).doc(borrowerId), borrowerObj, { merge: true });
                transaction.set(db.collection(collections.user).doc(borrowerId).collection(collections.priviCreditsBorrowing).doc(creditId), borrowerObj, { merge: true });
            }
        }
        // update credit info
        if (updatedCreditInfo) {
            console.log(updatedCreditInfo)
            let creditId: string = '';
            let creditObj: any = {};
            for ([creditId, creditObj] of Object.entries(updatedCreditInfo)) {
                transaction.set(db.collection(collections.priviCredits).doc(creditId), creditObj, { merge: true });
            }
        }
        // update credit state
        if (updatedCreditState) {
            let creditId: string = '';
            let creditObj: any = {};
            for ([creditId, creditObj] of Object.entries(updatedCreditState)) {
                transaction.set(db.collection(collections.priviCredits).doc(creditId), creditObj, { merge: true });
            }
        }
        // update credit requirements
        if (updatedCreditRequirement) {
            let creditId: string = '';
            let creditObj: any = {};
            for ([creditId, creditObj] of Object.entries(updatedCreditRequirement)) {
                transaction.set(db.collection(collections.priviCredits).doc(creditId), creditObj, { merge: true });
            }
        }
    });
}


// rate of all tokens in ratesOfChange colection (that is all types except nft) as {}
export async function getRateOfChangeAsMap() {
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
export async function getRateOfChangeAsList() {
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

// get usd to other currency (eur, gbp..) conversion rate
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

// generate uuid
export function generateUniqueId() {
    return 'Px' + uuid.v4();
}

// check if given string is a valid email
export function isEmail(email: string) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegexp.test(email);
}

// given a string return the type of token (CRYPTO, FTPOD...)
const identifyTypeOfToken = async function (token: string): Promise<string> {
    const tokenSnap = await db.collection(collections.tokens).doc(token).get();
    if (tokenSnap.exists) {
        const data = tokenSnap.data();
        if (data) return data.TokenType;
    }
    return collections.unknown;
}
module.exports.identifyTypeOfToken = identifyTypeOfToken;

// filter the trending ones, that is the top 10 with most followers in the last week
export function filterTrending(allElems) {
    let trendingArray = [];
    let lastWeek = new Date();
    let pastDate = lastWeek.getDate() - 7;
    lastWeek.setDate(pastDate);

    allElems.forEach((item, i) => {
        if (item.Followers && item.Followers.length > 0) {
            let lastWeekFollowers = item.Followers.filter(follower => follower.date._seconds > lastWeek.getTime() / 1000);
            item.lastWeekFollowers = lastWeekFollowers.length;
        } else {
            item.lastWeekFollowers = 0;
        }
        if (allElems.length === i + 1) {
            let sortedArray = allElems.sort((a, b) => (a.lastWeekFollowers > b.lastWeekFollowers) ? 1 : ((b.lastWeekFollowers > a.lastWeekFollowers) ? -1 : 0));
            trendingArray = sortedArray.slice(0, 10);
        }
    });
    return trendingArray;
};

// check if today is payment day, frequency can be DAILY, WEEKLY, MONTHLY and day: 1st, 2nd ...
export function isPaymentDay(frequency, paymentDay) {
    const actualDate = new Date();
    switch (frequency) {
        case "DAILY":
            return true;
            break;
        case "WEEKLY":
            if (paymentDay == actualDate.getDay()) return true;
            break;
        case "MONTHLY":
            if (paymentDay == actualDate.getDate()) return true;
            break;
    }
    return false;
};