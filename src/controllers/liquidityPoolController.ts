import express from 'express';
import liquidityPool from "../blockchain/liquidtyPool";
import coinBalance from "../blockchain/coinBalance";
import { updateFirebase, addZerosToHistory, getRateOfChangeAsMap } from "../functions/functions";
//import { uploadToFirestoreBucket } from '../functions/firestore'
import notificationTypes from "../constants/notificationType";
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import cron from 'node-cron';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now
const notificationsController = require('./notificationsController');

// function used to create a liquidity pool of certain token (always called from Postman)
exports.createLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;   // this works like the identifier
        const minFee = body.MinFee;
        const maxFee = body.MaxFee;
        const riskParameter = body.RiskParameter;
        const regimePoint = body.RegimePoint;

        const blockchainRes = await liquidityPool.createLiquidityPool(poolToken, minFee, maxFee, riskParameter, regimePoint, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // add zeros for graph
            const ref = db.collection(collections.liquidityPools).doc(poolToken);
            addZerosToHistory(ref.collection(collections.liquidityHistory), 'liquidity');
            addZerosToHistory(ref.collection(collections.rewardHistory), 'reward');

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> createLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> createLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// function to list a liquidity pool (always called from Postman)
exports.listLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const blockchainRes = await liquidityPool.listLiquidityPool(poolToken, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> listLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> listLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// function to protect a liquidity pool (always called from Postman)
exports.protectLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolToken = body.PoolToken;
        const poolSpread = body.PoolSpread;
        const blockchainRes = await liquidityPool.protectLiquidityPool(poolToken, poolSpread, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> protectLiquidityPool(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> protectLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

// user deposits in some pool
exports.depositLiquidity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const liquidityProviderAddress = body.LiquidityProviderAddress;
        const poolToken = body.PoolToken;
        const amount = body.Amount;
        const depositId = body.DepositId;

        const hash = body.Hash;
        const signature = body.Signature;

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != liquidityProviderAddress) {
            console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.depositLiquidity(liquidityProviderAddress, poolToken, amount, depositId, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
            const liquidityPoolData: any = liquidityPoolSnap.data();
            // add provider
            const providers = liquidityPoolData.Providers ?? {};
            if (!providers[liquidityProviderAddress]) providers[liquidityProviderAddress] = amount;
            else providers[liquidityProviderAddress] += amount;
            liquidityPoolSnap.ref.update({ Providers: providers });


            // await notificationsController.addNotification({
            //     userId: liquidityPoolData.CreatorId,
            //     notification: {
            //         type: 45,
            //         itemId: poolToken,
            //         follower: '',
            //         pod: '',
            //         comment: '',
            //         token: '',
            //         amount: 0,
            //         onlyInformation: false,
            //         otherItemId: ''
            //     }
            // });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> depositLiquidity(): ', err);
        res.send({ success: false });
    }
};

exports.swapCryptoTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const traderAddress = body.TraderAddress;
        const tokenFrom = body.TokenFrom;
        const tokenTo = body.TokenTo;
        const amountFrom = body.AmountFrom;
        const rate = body.Rate;

        const hash = body.Hash;
        const signature = body.Signature;

        // jwt user check
        const priviUser = body.priviUser;
        if (!priviUser || !priviUser.id || priviUser.id != traderAddress) {
            console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): jwt user doesnt match');
            res.send({ success: false, message: 'jwt user doesnt match' });
            return;
        }

        const blockchainRes = await liquidityPool.swapCryptoTokens(traderAddress, tokenFrom, tokenTo, amountFrom, rate, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let fee = 0;

            let tid: string = '';
            let txnArray: any = [];
            for ([tid, txnArray] of Object.entries(transactions)) {
                txnArray.forEach((txn) => {
                    if (txn.Type == notificationTypes.swapTradeFee && txn.Amount) fee = txn.Amount;
                });
            }

            // -------- update 'to' pool --------
            // add fee to "To Liquidity Pool"
            const liquidityToPoolSnap = await db.collection(collections.liquidityPools).doc(tokenTo).get();
            const liquidityToPoolData: any = liquidityToPoolSnap.data();
            let newAccumulatedFee = liquidityToPoolData.AcculatedFee ?? 0;
            let newDailyAccumulatedFee = liquidityToPoolData.DailyAcculatedFee ?? 0;
            newAccumulatedFee += fee;
            newDailyAccumulatedFee += fee;
            liquidityToPoolSnap.ref.update({
                AccumulatedFee: newAccumulatedFee,
                DailyAccumulatedFee: newDailyAccumulatedFee
            });
            // -------- update 'from' pool --------
            const liquidityFromPoolSnap = await db.collection(collections.liquidityPools).doc(tokenFrom).get();
            const liquidityFromPoolData: any = liquidityFromPoolSnap.data();
            const swaps = liquidityFromPoolData.Providers ?? {};
            if (!swaps[traderAddress]) swaps[traderAddress] = amountFrom;
            else swaps[traderAddress] += amountFrom;
            liquidityFromPoolSnap.ref.update({
                Swaps: swaps,
            });
            res.send({ success: true });

            // -------- update pairs --------
            const rateOfChange = await getRateOfChangeAsMap();
            // To -> From pair
            let newDailyAccumulatedFeeInUSD = 0;
            let newDailyAccumulatedVolumeInUSD = 0;
            const pairFromToSnap = await liquidityFromPoolSnap.ref.collection(collections.liquidityPairs).doc(tokenTo).get();
            const pairFromToData: any = pairFromToSnap.data();
            if (pairFromToData) {
                newDailyAccumulatedFeeInUSD = pairFromToData.DailyAccumulatedFeeInUSD ?? 0;
                newDailyAccumulatedVolumeInUSD = pairFromToData.DailyAccumulatedVolumeInUSD ?? 0;
            }
            newDailyAccumulatedFeeInUSD += (rateOfChange[tokenFrom] ?? 1) * fee;
            newDailyAccumulatedVolumeInUSD += (rateOfChange[tokenFrom] ?? 1) * amountFrom;
            pairFromToSnap.ref.set({
                DailyAccumulatedFeeInUSD: newDailyAccumulatedFeeInUSD,
                DailyAccumulatedVolumeInUSD: newDailyAccumulatedVolumeInUSD,
            }, { merge: true });
            // From -> To pair
            const pairToFromSnap = await liquidityToPoolSnap.ref.collection(collections.liquidityPairs).doc(tokenFrom).get();
            const pairToFromData: any = pairToFromSnap.data();
            newDailyAccumulatedFeeInUSD = 0;
            newDailyAccumulatedVolumeInUSD = 0;
            if (pairToFromData) {
                newDailyAccumulatedFeeInUSD = pairToFromData.DailyAccumulatedFeeInUSD ?? 0;
                newDailyAccumulatedVolumeInUSD = pairToFromData.DailyAccumulatedVolumeInUSD ?? 0;
            }
            newDailyAccumulatedFeeInUSD += (rateOfChange[tokenFrom] ?? 1) * fee;
            newDailyAccumulatedVolumeInUSD += (rateOfChange[tokenFrom] ?? 1) * amountFrom;
            pairToFromSnap.ref.set({
                DailyAccumulatedFeeInUSD: newDailyAccumulatedFeeInUSD,
                DailyAccumulatedVolumeInUSD: newDailyAccumulatedVolumeInUSD,
            }, { merge: true });
        }
        else {
            console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> swapCryptoTokens(): ', err);
        res.send({ success: false });
    }
}

// --------------------------------- GET ----------------------------------

exports.getLiquidityPools = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const pools: any = {};
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).get();
        liquidityPoolSnap.forEach((doc) => {
            const data: any = doc.data();
            const rewardedAmount = data.RewardedAmount ?? 0;
            const rewardedAmountInUSD = rateOfChange[doc.id] ? rateOfChange[doc.id] * rewardedAmount : rewardedAmount; // to usd
            pools[doc.id] = {
                ...data,
                RewardedAmountInUSD: rewardedAmountInUSD,
            };
        });

        // get pools balances from blockchain
        const promises: any[] = [];
        let token: string = "";
        let data: any = {};
        for ([token, data] of Object.entries(pools)) {
            promises.push(coinBalance.balanceOf(data.PoolAddress, token));
        };
        const balanceResponces = await Promise.all(promises);
        balanceResponces.forEach((balanceResponce) => {
            if (balanceResponce.success) {
                const output = balanceResponce.output;
                const token = output.Token;
                const liquidity = output.Amount;
                const liquidityInUSD = rateOfChange[token] ? rateOfChange[token] * liquidity : liquidity;
                retData.push({
                    ...pools[output.Token],
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                })
            }
        });

        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPools(): ', err);
        res.send({ success: false });
    }
};

// get liquidity pools basic info
exports.getOtherLiquidityPools = async (req: express.Request, res: express.Response) => {
    try {
        let { poolToken } = req.query;
        poolToken = String(poolToken);
        const retData: any[] = [];
        const pools: any = {};
        const pairs: any = {};
        const rateOfChange = await getRateOfChangeAsMap();
        // get given poolToken's pair data
        const pairsSnap = await db.collection(collections.liquidityPools).doc(poolToken).collection(collections.liquidityPairs).get();
        pairsSnap.forEach((doc) => {
            pairs[doc.id] = doc.data();
        });
        // get other liquidity pools and add the corresponding pair 
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).get();
        liquidityPoolSnap.forEach((doc) => {
            if (doc.id !== poolToken) {
                const data: any = doc.data();
                pools[doc.id] = {
                    PairData: {
                        ...pairs[doc.id]
                    },
                    PoolAddress: data.PoolAddress,
                    PoolToken: data.PoolToken,
                    NumProviders: Object.keys(data.Providers ?? {}).length,
                    DailyAccumulatedFee: data.DailyAccumulatedFee ?? 0, // in TokenTo
                };
            }
        });

        // get pools balances from blockchain
        const promises: any[] = [];
        let token: string = "";
        let data: any = {};
        for ([token, data] of Object.entries(pools)) {
            promises.push(coinBalance.balanceOf(data.PoolAddress, token));
        };
        const balanceResponces = await Promise.all(promises);
        balanceResponces.forEach((balanceResponce) => {
            if (balanceResponce.success) {
                const output = balanceResponce.output;
                const token = output.Token;
                const liquidity = output.Amount;
                const liquidityInUSD = rateOfChange[token] ? rateOfChange[token] * liquidity : liquidity;
                retData.push({
                    ...pools[output.Token],
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                })
            }
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getOtherLiquidityPools(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityPool = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const rateOfChange = await getRateOfChangeAsMap();
        const liquidityPoolSnap = await db.collection(collections.liquidityPools).doc(poolToken).get();
        const data: any = liquidityPoolSnap.data();
        if (data) {
            const token = data.PoolToken ?? '';
            const blockchainRes = await coinBalance.balanceOf(data.PoolAddress, token);
            const output = blockchainRes.output;
            const liquidity = output.Amount;
            const liquidityInUSD = rateOfChange[liquidityPoolSnap.id] ? rateOfChange[liquidityPoolSnap.id] * liquidity : liquidity;
            // get rewarded amount in Privi
            const rewardedAmount = data.RewardedAmount ?? 0;
            const rewardedAmountInUSD = rateOfChange[token] ? rateOfChange[token] * rewardedAmount : rewardedAmount; // to usd
            res.send({
                success: true, data: {
                    ...data,
                    Liquidity: liquidity,
                    LiquidityInUSD: liquidityInUSD,
                    RewardedAmountInUSD: rewardedAmountInUSD,
                }
            });
        }
        else res.send({ success: false });
    } catch (err) {
        console.log('Error in controllers/liquiityPoolController -> getLiquidityPool(): ', err);
        res.send({ success: false });
    }
};

exports.getLiquidityHistory = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const retData: any[] = [];
        const liquidityHistorySnap = await db.collection(collections.liquidityPools).doc(poolToken).collection(collections.liquidityHistory).get();
        liquidityHistorySnap.forEach((doc) => {
            retData.push(doc.data());
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getLiquidityHistory(): ', err);
        res.send({ success: false });
    }
};

exports.getRewardHistory = async (req: express.Request, res: express.Response) => {
    try {
        let poolToken = req.params.poolToken;
        const retData: any[] = [];
        const liquidityHistorySnap = await db.collection(collections.liquidityPools).doc(poolToken).collection(collections.rewardHistory).get();
        liquidityHistorySnap.forEach((doc) => {
            retData.push(doc.data());
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getRewardHistory(): ', err);
        res.send({ success: false });
    }
};

exports.getSwapPrice = async (req: express.Request, res: express.Response) => {
    try {
        const query = req.query;
        const tokenFrom = query.TokenFrom;
        const tokenTo = query.TokenTo;
        const amountFrom = Number(query.AmountFrom);
        const rate = Number(query.Rate);
        console.log(query)
        const blockchainRes = await liquidityPool.getSwapPrice(tokenFrom, tokenTo, amountFrom, rate, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const price = blockchainRes.output;
            console.log(price);
            res.send({ success: true, data: price });
        } else {
            console.log('Error in controllers/liquidityPoolController -> getSwapPrice(): blockchain = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/liquidityPoolController -> getSwapPrice(): ', err);
        res.send({ success: false });
    }
};


// --------------------------------- CRONS ----------------------------------

// reset the DailyAccumulatedFee field by the end of every day and generate a history of it
exports.resetDailyAccumulators = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("******** Liquidity Pool resetDailyAccumulators ********");
        const liquidityPoolSnaps = await db.collection(collections.liquidityPools).get();
        const docs = liquidityPoolSnaps.docs;
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const data: any = doc.data();
            const dailyFee = data.DailyAcculatedFee ?? 0;
            doc.ref.update({
                DailyAcculatedFee: 0
            });
            doc.ref.collection(collections.feeHistory).add({
                date: Date.now(),
                fee: dailyFee
            });
            // reset pair accumulators (delete)
            const pairsSnap = await doc.ref.collection(collections.liquidityPairs).get();
            pairsSnap.forEach((pairDoc) => {
                pairDoc.ref.delete()
            });
        }
    } catch (err) {
        console.log('Error in controllers/liquidityPool -> resetDailyAccumulators()', err);
    }
});