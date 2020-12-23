import { db, firebase } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance.js";
import collections from "../firebase/collections";
import axios from "axios";
import { object } from "firebase-functions/lib/providers/storage";

const xid = require('xid-js');  // for generating unique ids (in Txns for example)
const uuid = require('uuid');


// updates multiple firebase collection according to blockchain response
export async function updateFirebase(blockchainRes) {
    const output = blockchainRes.output;
    await db.runTransaction(async (transaction) => {
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
        // communities
        const updateCommunities = output.UpdateCommunities;
        const updateCommunityStates = output.UpdateCommunityStates;
        const updateCommunityLPs = output.UpdateCommunityLPs;
        const updateVotations = output.updateVotations;
        const updateVotationStates = output.updateVotationStates;
        const updateVoters = output.UpdateVoters;

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
        const isNFT = {};
        if (updatePods) {
            let podId: string = '';
            let podObj: any = {};
            for ([podId, podObj] of Object.entries(updatePods)) {
                // find out NFT or FT
                let colectionName = collections.podsFT;
                if (podObj.Royalty != undefined) {
                    isNFT[podId] = true;
                    colectionName = collections.podsNFT;    // case NFT
                } else {
                    isNFT[podId] = false;
                }
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
                if (isNFT[podId]) colectionName = collections.podsNFT;    // case NFT
                // with merge flag because pods have more info thats not in blockchain (eg followers)
                transaction.set(db.collection(colectionName).doc(podId), podState, { merge: true });
            }
        }
        // update nft buying offers
        if (updateBuyingOffers) {
            let _: string = '';
            let orderObj: any = null;
            for ([_, orderObj] of Object.entries(updateBuyingOffers)) {
                const orderId = orderObj.OrderId;
                const podAddress = orderObj.PodAddress;
                if (orderId && podAddress) {
                    const amount = orderObj.Amount;
                    if (amount == 0) transaction.delete(db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId));
                    else transaction.set(db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId), orderObj, { merge: true });
                }
                else console.log("Update Firebase: update nft buying order error ,", orderId, " order updateObject has no podAddress field");
            }
        }
        // update nft selling offers
        if (updateSellingOffers) {
            let _: string = '';
            let orderObj: any = null;
            for ([_, orderObj] of Object.entries(updateSellingOffers)) {
                const orderId = orderObj.OrderId;
                const podAddress = orderObj.PodAddress;
                if (orderId && podAddress) {
                    const amount = orderObj.Amount;
                    if (amount == 0) transaction.delete(db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId));
                    else transaction.set(db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId), orderObj, { merge: true });
                }
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
        // update communities
        if (updateCommunities) {
            let communityAddress: string = '';
            let communityObj: any = {};
            for ([communityAddress, communityObj] of Object.entries(updateCommunities)) {
                transaction.set(db.collection(collections.community).doc(communityAddress), communityObj, { merge: true });
            }
        }
        // update community state
        if (updateCommunityStates) {
            let communityAddress: string = '';
            let communityObj: any = {};
            for ([communityAddress, communityObj] of Object.entries(updateCommunityStates)) {
                transaction.set(db.collection(collections.community).doc(communityAddress), communityObj, { merge: true });
            }
        }
        // update community LPs
        if (updateCommunityLPs) {
            let communityAddress: string = '';
            let communityLPObj: any = {};
            for ([communityAddress, communityLPObj] of Object.entries(updateCommunityLPs)) {
                const uid = communityLPObj.LPAddress;
                if (uid) transaction.set(db.collection(collections.community).doc(communityAddress).collection(collections.communityLP).doc(uid), communityLPObj, { merge: true });
            }
        }
        // update votations
        if (updateVotations) {
            console.log(updateVotations)
            let votationId: string = '';
            let votationObj: any = {};
            for ([votationId, votationObj] of Object.entries(updateVotations)) {
                transaction.set(db.collection(collections.votation).doc(votationId), votationObj, { merge: true });
            }
        }
        // update votations state
        if (updateVotationStates) {
            let votationId: string = '';
            let votationObj: any = {};
            for ([votationId, votationObj] of Object.entries(updateVotationStates)) {
                transaction.set(db.collection(collections.votationState).doc(votationId), votationObj, { merge: true });
            }
        }
        // update votaters
        if (updateVoters) {
            let votationId: string = '';
            let votationObj: any = {};
            for ([votationId, votationObj] of Object.entries(updatedCreditState)) {
                transaction.set(db.collection(collections.voter).doc(votationId), votationObj, { merge: true });
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
export const identifyTypeOfToken = async function (token: string): Promise<string> {
    const tokenSnap = await db.collection(collections.tokens).doc(token).get();
    if (tokenSnap.exists) {
        const data = tokenSnap.data();
        if (data) return data.TokenType;
    }
    return collections.unknown;
}
//module.exports.identifyTypeOfToken = identifyTypeOfToken;

// used to filter the trending ones, that is the top 10 with most followers in the last week
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

// follow function shared between pods, credits, communities... 
export async function follow(userAddress, productAddress, collectionName, fieldName) {
    try {
        // update user
        const userSnap = await db.collection(collections.user).doc(userAddress).get();

        const userData: any = userSnap.data();

        const userFollowingProds = userData[fieldName] ?? [];
        userFollowingProds.push(productAddress);
        const userUpdateObj = {};
        userUpdateObj[fieldName] = userFollowingProds;
        userSnap.ref.update(userUpdateObj);

        // update prod
        const prodSnap = await db.collection(collectionName).doc(productAddress).get();
        const prodData: any = prodSnap.data();
        const followerArray = prodData.Followers ?? [];
        followerArray.push({
            date: Date.now(),
            id: userAddress
        })
        prodSnap.ref.update({
            Followers: followerArray
        });
        return true;
    } catch (err) {
        console.log(`error at following ${collectionName} ${productAddress} by the user ${userAddress}`, err);
        return false;
    }

}

// unfollow function shared between pods, credits, communities... 
export async function unfollow(userAddress, productAddress, collectionName, fieldName) {
    try {
        // update user
        const userSnap = await db.collection(collections.user).doc(userAddress).get();

        const userData: any = userSnap.data();

        let userFollowingProds = userData[fieldName] ?? [];
        userFollowingProds = userFollowingProds.filter((val, index, arr) => {
            return val !== productAddress;
        });
        const userUpdateObj = {};
        userUpdateObj[fieldName] = userFollowingProds;
        userSnap.ref.update(userUpdateObj);

        // update prod
        const prodSnap = await db.collection(collectionName).doc(productAddress).get();
        const prodData: any = prodSnap.data();
        let followerArray = prodData.Followers ?? [];
        followerArray = followerArray.filter((val, index, arr) => {
            return val.id && val.id !== userAddress;
        });
        prodSnap.ref.update({
            Followers: followerArray
        });
        return true;
    } catch (err) {
        console.log(`error at unfollowing ${collectionName} ${productAddress} by the user ${userAddress}`, err);
        return false;
    }

}

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

// calculates the market price of a token (community/FT pod)
export function getMarketPrice(amm: string, supplyRealeased: number, initialSupply: number = 0, targetPrice: number = 0, targetSupply: number = 0) {
    const effectiveSupply: number = supplyRealeased - initialSupply;
    if (effectiveSupply < 0) { // ERROR
        console.log('getMarketPrice error: initialSupply > supplyReleased')
        return -1;
    }

    let multiplier = 1;
    switch (amm) {
        case 'LINEAR':
            if (targetSupply) multiplier = targetPrice / targetSupply;
            return multiplier * effectiveSupply;
        case 'QUADRATIC':
            if (targetSupply) multiplier = targetPrice / Math.pow(targetSupply, 2);
            return multiplier * Math.pow(effectiveSupply, 2);
        case 'EXPONENTIAL':
            if (targetSupply) multiplier = targetPrice / Math.exp(-targetSupply);
            return multiplier * Math.exp(supplyRealeased);
        case 'SIGMOID':
            return targetPrice * (1. / (1 + Math.exp(-effectiveSupply + targetSupply)));
    }

    return -1;
}

// calculates the integral area given the upper and lower bounds
const integral = (amm: string, upperBound: number, lowerBound: number, targetPrice: number = 0, targetSupply: number = 0) => {
    let multiplier = 1;
    let integral = 0;
    switch (amm) {
        case 'LINEAR':
            if (targetSupply) multiplier = (targetPrice / targetSupply);
            integral = Math.pow(upperBound, 2) - Math.pow(lowerBound, 2);
            if (integral < 0) {
                console.log("error calculating integral, area negative", integral);
                return -1;
            }
            return multiplier * integral / 2;
        case 'QUADRATIC':
            if (targetSupply) multiplier = targetPrice / Math.pow(targetSupply, 2);
            integral = Math.pow(upperBound, 3) - Math.pow(lowerBound, 3);
            if (integral < 0) {
                console.log("error calculating integral, area negative", integral);
                return -1;
            }
            return multiplier * integral / 3;
        case 'EXPONENTIAL':
            if (targetSupply) multiplier = targetPrice / Math.exp(-targetSupply);
            integral = upperBound - lowerBound;
            if (integral < 0) {
                console.log("error calculating integral, area negative", integral);
                return -1;
            }
            return multiplier * integral;
        case 'SIGMOID':
            const upper = upperBound + Math.log(1 + Math.exp(-upperBound + targetSupply));
            const lower = lowerBound + Math.log(1 + Math.exp(-lowerBound + targetSupply));
            integral = upper - lower;
            if (integral < 0) {
                console.log("error calculating integral, area negative", integral);
                return -1;
            }
            return targetPrice / 2 * integral;
    }
    return -1;
}

// calculates the amount of funding tokens to receive after selling an amount of pod/community tokens
export function getInvestingTokenAmount(amm: string, supplyRealeased: number, initialSupply: number = 0, fundingTokenAmount, targetPrice: number = 0, targetSupply: number = 0) {
    const effectiveSupply: number = supplyRealeased - initialSupply;
    if (effectiveSupply < 0) { // ERROR
        console.log('getFundingTokenPrice error: initialSupply > supplyReleased')
        return -1;
    }
    const newSupply = effectiveSupply + fundingTokenAmount;
    const fundingAmount = integral(amm, newSupply, effectiveSupply, targetPrice, targetSupply);
    return fundingAmount;
}

// calculates the amount of investing tokens to get after investing some amount of funding token
export function getFundingTokenAmount(amm: string, supplyRealeased: number, initialSupply: number = 0, investingTokenAmount, spread, targetPrice: number = 0, targetSupply: number = 0) {
    const effectiveSupply: number = supplyRealeased - initialSupply;
    if (effectiveSupply < 0) { // ERROR
        console.log('getInvestingTokenAmount error: initialSupply > supplyReleased')
        return -1;
    }
    const lowSupply = Math.max(0, effectiveSupply - investingTokenAmount);
    const fundingAmount = integral(amm, effectiveSupply, lowSupply, targetPrice, targetSupply);
    return fundingAmount * (1 - spread);
}