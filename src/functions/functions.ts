import { db } from "../firebase/firebase";
import coinBalance from "../blockchain/coinBalance.js";
import collections, { exchange } from "../firebase/collections";
import axios from "axios";
const { mnemonicToSeed } = require('bip39')
const { fromMasterSeed } = require('hdkey')
const { ecsign, toRpcSig, keccak } = require("ethereumjs-util")

const uuid = require('uuid');

const apiKey = "PRIVI"; // just for now
// require('dotenv').config();
//const apiKey = process.env.API_KEY;


export async function updateStatusOneToOneSwap(swapDocID, _status) {
    await db.runTransaction(async (transaction) => {
        // console.log('confirmOneToOneSwap in path, docID', collections.ethTransactions, swapDocID)
        transaction.update(db.collection(collections.ethTransactions).doc(swapDocID), { status: _status });
    });
};

export async function updateTxOneToOneSwap(swapDocID, txId) {
    await db.runTransaction(async (transaction) => {
        // console.log('confirmOneToOneSwap in path, docID', collections.ethTransactions, swapDocID)
        transaction.update(db.collection(collections.ethTransactions).doc(swapDocID), { txHash: txId });
    });
};

export async function updatePriviTxOneToOneSwap(swapDocID, txId) {
    await db.runTransaction(async (transaction) => {
        // console.log('confirmOneToOneSwap in path, docID', collections.ethTransactions, swapDocID)
        transaction.update(db.collection(collections.ethTransactions).doc(swapDocID), { txPrivi: txId });
    });
};

export async function getRecentSwaps(userAddress) {
    // console.log('getRecentSwaps in path, docID', collections.ethTransactions, userAddress)
    let recentSwaps = {};
    let recentSwapsArray: any[] = [];
    const swapQuery = await db.collection(collections.ethTransactions).where('address', '==', userAddress)/*.orderBy('lastUpdate', 'desc').limit(10)*/.get();
    for (const doc of swapQuery.docs) {
        const swap = doc.data();
        // recentSwaps[doc.id] = swap;
        recentSwapsArray.push({ ...swap, id: doc.id });
    }

    let sortedArray: any[] = recentSwapsArray.sort((obj1, obj2) => {
        if (obj1.lastUpdate < obj2.lastUpdate) {
            return 1;
        }

        if (obj1.lastUpdate > obj2.lastUpdate) {
            return -1;
        }

        return 0;
    });

    // console.log('getRecentSwaps', sortedArray)

    for (let index = 0; index < 5; index++) {
        const element = sortedArray[index];
        if (element) {
            recentSwaps[element.id] = element;
        }
    }

    return recentSwaps;
};

// updates multiple firebase collection according to blockchain response
export async function updateFirebase(blockchainRes) {
    const output = blockchainRes.output;
    await db.runTransaction(async (transaction) => {
        const updateTokens = output.UpdateTokens;
        const updateBalances = output.UpdateBalances;
        const updateTransactions = output.Transactions;
        // Media Pods
        const updatePods = output.UpdatePods;
        const updatePodStates = output.UpdatePodStates;
        const updateMedias = output.UpdateMedias;
        // Fractionalise Media
        const updateFractionalise = output.UpdateFractionalise;
        const updateBuyingOffers = output.UpdateBuyingOffers;
        const updateSellingOffers = output.UpdateSellingOffers;
        // const updateStreamings = output.UpdateStreamings;
        // auction (media)
        const updateAuctions = output.Auctions;
        // Insurance
        const updateInsurancePools = output.UpdateInsurancePools;
        const updateInsuranceStates = output.UpdateInsuranceStates;
        const updateInsuranceInvestors = output.UpdateInsuranceInvestors;
        const updateInsuranceClients = output.UpdateInsuranceClients;
        const updatePools = output.UpdatePools;
        const updateInsurance = output.UpdateInsurance;
        // update privi credit
        const updateLenders = output.UpdateLenders;
        const updateBorrowers = output.UpdateBorrowers;
        const updatedCreditInfo = output.UpdatedCreditInfo;
        const updatedCreditState = output.UpdatedCreditState;
        const updatedCreditRequirement = output.UpdatedCreditRequirement;
        // communities
        const updateCommunities = output.UpdateCommunities;
        const updateCommunityStates = output.UpdateCommunityStates;
        const updateCommunityLPs = output.UpdateCommunityLPs;
        // voting
        const updateVotations = output.updateVotations;
        const updateVotationStates = output.updateVotationStates;
        const updateVoters = output.UpdateVoters;
        // badges
        const updateBadges = output.UpdateBadges;
        // liquidity pools
        const updatedLiquidityPoolInfos = output.UpdatedLiquidityPoolInfos;
        const updatedLiquidityPoolStates = output.UpdatedLiquidityPoolStates;
        const updatedProtocolPool = output.UpdatedProtocolPool;
        // staking
        const updateStakings = output.UpdateStakings;
        // social token
        const updateSocialPools = output.UpdateSocialPools;
        const updateSocialPoolStates = output.UpdateSocialPoolStates;
        // exchange
        const updateExchanges = output.Exchanges;
        const updateOffers = output.Offers; 

        // update badges
        if (updateBadges) {
            let key: string = "";
            let val: any = null;
            for ([key, val] of Object.entries(updateBadges)) {
                transaction.set(db.collection(collections.badges).doc(key), val, { merge: true });
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
                const splitted: string[] = key.split(" "); // Sarkawt: here it takes the address instead of publicId
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
            let tid: string = "";
            let txnArray: any = [];
            for ([tid, txnArray] of Object.entries(updateTransactions)) {
                if (txnArray && txnArray.length > 0) {
                    const firstTxn = txnArray[0];
                    const date = firstTxn.Date;
                    transaction.set(db.collection(collections.priviScan).doc(tid), { Transactions: txnArray, Date: date });
                    if (txnArray && txnArray.length > 0) {
                        txnArray.forEach((txnObj) => {
                            const from = txnObj.From;
                            const to = txnObj.To;
                            if (from) transaction.set(db.collection(collections.transactions).doc(from).collection(collections.history).doc(), txnObj);
                            if (to) transaction.set(db.collection(collections.transactions).doc(to).collection(collections.history).doc(), txnObj);
                        });
                    }
                }
            }
        }
        // update pods (FT and NFT)
        const podType = {};
        if (updatePods) {
            let podId: string = '';
            let podObj: any = {};
            for ([podId, podObj] of Object.entries(updatePods)) {
                // find out NFT or FT
                let colectionName = collections.podsFT;
                if (podObj.Royalty != undefined) {  // case NFT
                    podType[podId] = 'NFT';
                    colectionName = collections.podsNFT;
                } else if (podObj.IsInvesting != undefined) {
                    podType[podId] = 'MEDIA';
                    colectionName = collections.mediaPods;
                } else {
                    podType[podId] = 'FT';
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
                if (podType[podId] && podType[podId] == "NFT") colectionName = collections.podsNFT;    // case NFT
                else if ((podType[podId] && podType[podId] == "MEDIA")) colectionName = collections.mediaPods;
                // with merge flag because pods have more info thats not in blockchain (eg followers)
                transaction.set(db.collection(colectionName).doc(podId), podState, { merge: true });
            }
        }
        // update fractionalise media 
        if (updateFractionalise) {
            let tokenSymbol: string = '';
            let obj: any = null;
            for ([tokenSymbol, obj] of Object.entries(updateFractionalise)) {
                if (tokenSymbol) transaction.set(db.collection(collections.streaming).doc(tokenSymbol), {Fraction: obj}, { merge: true });
            }
        }
        // update fractionalise buying offers
        if (updateBuyingOffers) {
            let orderId: string = '';
            let orderObj: any = null;
            for ([orderId, orderObj] of Object.entries(updateBuyingOffers)) {
                const tokenSymbol = orderObj.TokenSymbol;
                if (orderId && tokenSymbol) {
                    const amount = orderObj.Amount ?? 0;
                    if (amount > 0) transaction.set(db.collection(collections.streaming).doc(tokenSymbol).collection(collections.buyingOffers).doc(orderId), orderObj, { merge: true });
                }
                else console.log("Update Firebase: update fractionalise buying order error ,", orderId, " order updateObject has no podAddress field");
            }
        }
        // update fractionalise selling offers
        if (updateSellingOffers) {
            let orderId: string = '';
            let orderObj: any = null;
            for ([orderId, orderObj] of Object.entries(updateSellingOffers)) {
                const tokenSymbol = orderObj.TokenSymbol;
                if (orderId && tokenSymbol) {
                    const amount = orderObj.Amount ?? 0;
                    if (amount > 0) transaction.set(db.collection(collections.streaming).doc(tokenSymbol).collection(collections.sellingOffers).doc(orderId), orderObj, { merge: true });
                }
                else console.log("Update Firebase: update fractionalise selling order error ,", orderId, " order updateObject has no podAddress field");
            }
        }
        // update medias 
        if (updateMedias) {
            let mediaSymbol: string = '';
            let mediaObj: any = null;
            for ([mediaSymbol, mediaObj] of Object.entries(updateMedias)) { // add in both colections
                const podAddress = mediaObj.PodAddress;
                // have this field when its created with a pod
                if (podAddress) transaction.set(db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol), mediaObj, { merge: true });
                // when crated alone
                else transaction.set(db.collection(collections.streaming).doc(mediaSymbol), mediaObj, { merge: true });
            }
        }
        // update auctions 
        if (updateAuctions) {
            let mediaSymbol: string = '';
            let mediaObj: any = null;
            for ([mediaSymbol, mediaObj] of Object.entries(updateAuctions)) { // add in both colections
                transaction.set(db.collection(collections.streaming).doc(mediaSymbol), {Auctions: mediaObj}, { merge: true });
            }
        }
        // update streamings
        // if (updateStreamings) {
        //     let streamingId: string = '';
        //     let streamingObj: any = null;
        //     for ([streamingId, streamingObj] of Object.entries(updateStreamings)) {
        //         const podAddress = streamingObj.PodAddress;
        //         const mediaSymbol = streamingObj.MediaSymbol;
        //         if (podAddress && mediaSymbol) transaction.set(db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias)
        //             .doc(mediaSymbol).collection(collections.mediaStreamings).doc(streamingId), streamingObj, { merge: true });
        //     }
        // }
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
            let votationId: string = '';
            let votationObj: any = {};
            for ([votationId, votationObj] of Object.entries(updateVotations)) {
                transaction.set(db.collection(collections.voting).doc(votationId), votationObj, { merge: true });
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
            for ([votationId, votationObj] of Object.entries(updateVoters)) {
                transaction.set(db.collection(collections.voter).doc(votationId + votationObj.VoterAddress), votationObj, { merge: true });
            }
        }
        // update liquidity pools info
        if (updatedLiquidityPoolInfos) {
            let poolToken: string = '';
            let poolObj: any = {};
            for ([poolToken, poolObj] of Object.entries(updatedLiquidityPoolInfos)) {
                transaction.set(db.collection(collections.liquidityPools).doc(poolToken), poolObj, { merge: true });
            }
        }
        // update liquidity pools states
        if (updatedLiquidityPoolStates) {
            let poolToken: string = '';
            let poolObj: any = {};
            for ([poolToken, poolObj] of Object.entries(updatedLiquidityPoolStates)) {
                transaction.set(db.collection(collections.liquidityPools).doc(poolToken), poolObj, { merge: true });
            }
        }
        // update protocol pools
        if (updatedProtocolPool) {
            let poolToken: string = '';
            let poolObj: any = {};
            for ([poolToken, poolObj] of Object.entries(updatedLiquidityPoolStates)) {
                transaction.set(db.collection(collections.liquidityPools).doc(poolToken), poolObj, { merge: true });
            }
        }
        // update staking
        if (updateStakings) {
            let token: string = '';
            let obj: any = {};
            for ([token, obj] of Object.entries(updateStakings)) {
                const uid = obj.UserAddress;
                const token = obj.Token;
                transaction.set(db.collection(collections.stakingDeposit).doc(token).collection(collections.userStakings).doc(uid),
                    obj, { merge: true });
            }
        }
        // update social pools
        if (updateSocialPools) {
            let socialPoolToken: string = '';
            let socialPoolObj: any = {};
            for ([socialPoolToken, socialPoolObj] of Object.entries(updateSocialPools)) {
                transaction.set(db.collection(collections.socialPools).doc(socialPoolToken), socialPoolObj, { merge: true });
            }
        }

        // update social pools states
        if (updateSocialPoolStates) {
            let socialPoolToken: string = '';
            let socialPoolObj: any = {};
            for ([socialPoolToken, socialPoolObj] of Object.entries(updateSocialPoolStates)) {
                transaction.set(db.collection(collections.socialPools).doc(socialPoolToken), socialPoolObj, { merge: true });
            }
        }
        // update social pool
        if (updateSocialPools) {
            let address: string = '';
            let obj: any = {};
            for ([address, obj] of Object.entries(updateSocialPools)) {
                transaction.set((db.collection(collections.socialPools).doc(address)), obj, { merge: true });
            }
        }
        // update social pool state
        if (updateSocialPoolStates) {
            let address: string = '';
            let obj: any = {};
            for ([address, obj] of Object.entries(updateSocialPoolStates)) {
                transaction.set((db.collection(collections.socialPools).doc(address)), obj, { merge: true });
            }
        }
        // update exchange
        if (updateExchanges) {
            let exchangeId: string = '';
            let obj:any = {};
            for ([exchangeId, obj] of Object.entries(updateExchanges)) {
                if (exchangeId) transaction.set(db.collection(collections.exchange).doc(exchangeId), obj, { merge:true });
            }
        }
        // update offers
        if (updateOffers) {
            let offerId: string = '';
            let obj:any = {};
            for ([offerId, obj] of Object.entries(updateOffers)) {
                const exchangeId = obj.ExchangeId;
                const amount = obj.Amount;
                if (offerId && exchangeId && amount > 0) transaction.set(db.collection(collections.exchange).doc(exchangeId).collection(collections.offers)
                    .doc(offerId), {...obj, Date: Math.floor(Date.now()/1000)}, { merge:true });
                else if (amount == 0) transaction.delete(db.collection(collections.exchange).doc(exchangeId).collection(collections.offers).doc(offerId));
            }
        }
    });
}


// rate of all tokens in ratesOfChange colection (that is all cryptos and ft pods) as {}
export async function getRateOfChangeAsMap() {
    let res = {};
    const ratesQuery = await db.collection(collections.rates).get();
    for (const doc of ratesQuery.docs) {
        const rate = doc.data().rate;
        res[doc.id] = rate;
    }
    // still don't have these Token conversion rates in firebase, so we add them manually
    return res;
};

// rate of all tokens in ratesOfChange colection (that is all cryptos and ft pods) as []
export async function getRateOfChangeAsList() {
    const data: {}[] = [];
    try {
        const ratesSnap = await db.collection(collections.rates).get();
        for (const doc of ratesSnap.docs) {
            const name = doc.data().name ?? '';
            const token = doc.id;
            const rate = doc.data().rate;
            if (name) data.push({ token: token, name: name, rate: rate });
        }
    } catch (err) {
        console.log('Error in controllers/walletController -> getTokensRate()', err);
    }
    return data;
}


// traditional lending interest harcoded in firebase
export async function getLendingInterest() {
    const res = {};
    const blockchainRes = await coinBalance.getTokenListByType("CRYPTO", apiKey);
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
    const blockchainRes = await coinBalance.getTokenListByType("CRYPTO", apiKey);
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

export async function getEmailAddressMap() {
    let res = {};
    const usersQuery = await db.collection(collections.user).get();
    usersQuery.forEach((doc) => {
        const data: any = doc.data();
        const email = data.email;
        const address = data.address;
        if (email && address) res[email] = address;
    })
    return res;
};

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

export async function getUidAddressMap() {
    let res = {};
    const usersQuery = await db.collection(collections.user).get();
    usersQuery.forEach((doc) => {
        const data: any = doc.data();
        const address = data.address;
        if (address) res[doc.id] = address;
    })
    return res;
};

export async function getAddresUidMap() {
    let res = {};
    const usersQuery = await db.collection(collections.user).get();
    usersQuery.forEach((doc) => {
        const data: any = doc.data();
        const address = data.address;
        if (address) res[address] = doc.id;
    })
    return res;
};

export async function getUidFromEmail(email) {
    let res = {};
    const usersQuery = await db.collection(collections.user).where("email", "==", email).get();
    for (const doc of usersQuery.docs) {
        const email = doc.data().email;
        res[email] = doc.id;
    }
    return res;
};

export async function getUidFromAddress(address) {
    let res = {};
    const usersQuery = await db.collection(collections.user).where("address", "==", address).get();
    for (const doc of usersQuery.docs) {
        const address = doc.data().address;
        res[address] = doc.id;
    }
    return res;
}

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
export async function identifyTypeOfToken(token: string): Promise<string> {
    const tokenSnap = await db.collection(collections.tokens).doc(token).get();
    if (tokenSnap.exists) {
        const data = tokenSnap.data();
        if (data) return data.TokenType;
    }
    return collections.unknown;
}

export async function getTokenToTypeMap() {
    const map = {};
    const tokensSnap = await db.collection(collections.tokens).get();
    tokensSnap.forEach((doc) => {
        const data: any = doc.data();
        map[doc.id] = data.TokenType;
    })
    return map;
}

export function getCurrentFormattedDate() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    return formattedDate;
}

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
export async function follow(userId, productAddress, collectionName, fieldName) {
    try {
        // update user
        const userSnap = await db.collection(collections.user).doc(userId).get();

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
            id: userId
        })
        prodSnap.ref.update({
            Followers: followerArray
        });
        return true;
    } catch (err) {
        console.log(`error at following ${collectionName} ${productAddress} by the user ${userId}`, err);
        return false;
    }

}

// unfollow function shared between pods, credits, communities... 
export async function unfollow(userId, productAddress, collectionName, fieldName) {
    try {
        // update user
        const userSnap = await db.collection(collections.user).doc(userId).get();

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
            return val.id && val.id !== userId;
        });
        prodSnap.ref.update({
            Followers: followerArray
        });
        return true;
    } catch (err) {
        console.log(`error at unfollowing ${collectionName} ${productAddress} by the user ${userId}`, err);
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

// ------------------- Formulas to calculate Amount --------------------

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
            if (targetSupply) {
                const dividend = Math.exp(-targetSupply) ?? Number.MIN_VALUE; // floating point precision problem
                multiplier = targetPrice * dividend;
            }
            integral = Math.exp(upperBound) - Math.exp(lowerBound);
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

// calculate the amount of funding tokens to receive after selling an amount of pod/community tokens (Buying)
export function getBuyTokenAmount(amm: string, supplyReleased: number, initialSupply: number = 0, amount, targetPrice: number = 0, targetSupply: number = 0) {
    const effectiveSupply: number = supplyReleased - initialSupply;
    if (effectiveSupply < 0) { // ERROR
        console.log('getFundingTokenPrice error: initialSupply > supplyReleased')
        return -1;
    }
    const newSupply = effectiveSupply + amount;
    const fundingAmount = integral(amm, newSupply, effectiveSupply, targetPrice, targetSupply);
    return fundingAmount;
}

// calculate the amount of funding tokens to get after investing some amount of funding token (Selling)
export function getSellTokenAmount(amm: string, supplyReleased: number, initialSupply: number = 0, amount, spread, targetPrice: number = 0, targetSupply: number = 0) {
    const effectiveSupply: number = supplyReleased - initialSupply;
    if (effectiveSupply < 0) { // ERROR
        console.log('getInvestingTokenAmount error: initialSupply > supplyReleased')
        return -1;
    }
    const lowSupply = Math.max(0, effectiveSupply - amount);
    const fundingAmount = integral(amm, effectiveSupply, lowSupply, targetPrice, targetSupply);
    return fundingAmount * (1 - spread);
}

// buy function is different for pods (parameter amount is in funding tokens and returns pod tokens )
export function getBuyTokenAmountPod(amm: string, supplyReleased: number, amount) {
    let price = -1;
    switch (amm) {
        case "QUADRATIC":
            const term = 3 * amount + Math.pow(supplyReleased, 3);
            price = Math.pow(term, 1. / 3) - supplyReleased;
            if (price < 0) price = NaN;
            break;
    }
    return price;
}

// sell function is different for pods (parameter amount is in pod tokens and returns funding tokens to receive after sell )
export function getSellTokenAmountPod(amm: string, supplyReleased: number, amount: number, regimePoint: number) {
    const supplyLeft = supplyReleased - amount;
    if (supplyLeft < 0) {
        console.log('error getSellTokenAmountPod: supplyLeft negative');
        return -1;
    }
    // funding phase
    const fundingUpper = Math.min(regimePoint, supplyReleased);
    const fundingLower = Math.min(regimePoint, supplyLeft);
    const fundingPhase = integral(amm, fundingUpper, fundingLower);
    if (fundingPhase < 0) {
        console.log('error getSellTokenAmountPod: fundingPhase negative');
        return -1;
    }
    // exchange phase
    const exchangeUpper = Math.max(regimePoint, supplyReleased);
    const exchangeLower = Math.max(regimePoint, supplyLeft);
    const exchangePhase = integral(amm, exchangeUpper, exchangeLower);
    if (exchangePhase < 0) {
        console.log('error getSellTokenAmountPod: exchangePhase negative');
        return -1;
    }
    return fundingPhase + exchangePhase;
}

// integral for media pod equations
function mediaPodIntegral(amm, upper, lower, scale, shift) {
    switch (amm) {
        case "LINEAR":
            var term1 = Math.max((Math.pow(upper, 2) - Math.pow(lower, 2)) / 2, 0);
            var term2 = Math.max(upper - lower, 0);
            return scale * (term1 + term2) / 2 + shift;
        case "QUADRATIC":
            var term1 = Math.max((Math.pow(upper, 3) - Math.pow(lower, 3)) / 3, 0);
            var term2 = Math.max(upper - lower, 0);
            return scale * (term1 + term2) / 3 + shift;
        case "EXPONENTIAL":
            return 0;
        case "SIGMOID":
            return 0;
    }
    return 0;
}

// return [scale, shift]
function mediaPodGetFormulaParams(amm, initialPrice, maxPrice, maxSupply, supplyReleased) {
    let scale = 0;
    let shift = initialPrice;
    switch (amm) {
        case "LINEAR":
            scale = (maxPrice - initialPrice) / maxSupply;
            break;
        case "QUADRATIC":
            scale = (maxPrice - initialPrice) / Math.pow(maxSupply, 2);
            break
        case "EXPONENTIAL":
            break;
        case "SIGMOID":
            break;
    }
    return [scale, shift];
}

// return the funding token amount to pay
export function getMediaPodBuyingAmount(amm, initialPrice, maxPrice, maxSupply, supplyReleased, podTokenAmount) {
    const [scale, shift] = mediaPodGetFormulaParams(amm, initialPrice, maxPrice, maxSupply, supplyReleased);
    const newPodAmount = supplyReleased + podTokenAmount;
    const price = mediaPodIntegral(amm, newPodAmount, supplyReleased, scale, shift);
    return price;
}

// return the funding token amount to receive
export function getMediaPodSellingAmount(amm, initialPrice, maxPrice, maxSupply, supplyReleased, podTokenAmount) {
    const [scale, shift] = mediaPodGetFormulaParams(amm, initialPrice, maxPrice, maxSupply, supplyReleased);
    const newPodAmount = Math.max(supplyReleased - podTokenAmount, 0);
    const price = mediaPodIntegral(amm, supplyReleased, newPodAmount, scale, shift);
    return price;
}

// -----------------------------------------

// add 7 days of 0 to History
export async function addZerosToHistory(colRef, fieldName) {
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    dates.forEach((date) => {
        const obj: any = {};
        obj[fieldName] = 0;
        obj.date = date.getTime();
        colRef.add(obj);
    });
}

// sign the transaction by mnemonic and txnObj returning [hash, signature]
export async function singTransaction(mnemonic, transaction) {
    // Derive Public and Private key from mnemonic //
    const derivationPath = "m/44'/60'/0'/0/0";
    const seed = await mnemonicToSeed(mnemonic);
    const node = fromMasterSeed(seed)
    const hdKey = node.derive(derivationPath);
    // Generate transaction hash //
    let transactionString = JSON.stringify(transaction);
    let transactionHash = keccak(Buffer.from(transactionString));
    // Generate signature //
    const { v, r, s } = ecsign(transactionHash, hdKey._privateKey);
    let signature = toRpcSig(v, r, s);
    return [transactionHash.toString('hex'), signature]
}


export async function getUserLiveStreamInformation(user) {
    const userInformation = await db.collection(collections.user).doc(user.DocId).get();
    return userInformation;
}

export function isUserValidForLiveStream(user, liveStreamSession) {

    // check if moderator or streamer


    //  check if user is able tolive stream permissions.
    return true;

}

// save transaction to the items doc
export async function saveTransactions(collectionRef, blockchainRes) {
    const output = blockchainRes.output;
    const transactions = output.Transactions;
    let tid = '';
    let txnArray: any = null;
    for ([tid, txnArray] of Object.entries(transactions)) {
        collectionRef.doc(tid).set({Transactions: txnArray});
    }
}