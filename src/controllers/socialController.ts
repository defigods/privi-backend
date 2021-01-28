import express from 'express';
import social from "../blockchain/social";
import coinBalance from "../blockchain/coinBalance";
import { updateFirebase, addZerosToHistory, getMarketPrice, getSellTokenAmount, getBuyTokenAmount, getSellTokenAmountPod } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
const notificationsController = require('./notificationsController');

const apiKey = process.env.API_KEY;

// ----------------------------------- POST -------------------------------------------

// user stakes in a token
exports.createSocialToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.Creator;
        const amm = body.AMM;
        const spreadDividend = body.SpreadDividend;
        const fundingToken = body.FundingToken;
        const tokenSymbol = body.TokenSymbol;
        const tokenName = body.TokenName;
        const dividendFreq = body.DividendFreq;
        const initialSupply = body.InitialSupply;
        const targetSupply = body.TargetSupply;
        const targetPrice = body.TargetPrice;

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await social.createSocialToken(creator, amm, spreadDividend, fundingToken, tokenSymbol, tokenName, dividendFreq, initialSupply, targetSupply, targetPrice, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const output = blockchainRes.output;
            const updateSocialPools = output.UpdateSocialPools;
            const socialAddress = Object.keys(updateSocialPools)[0];

            // add more fields
            const description = body.Description;
            db.collection(collections.socialPools).doc(socialAddress).set({
                Description: description
            });

            await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 47,
                    typeItemId: 'user',
                    itemId: body.userId,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: tokenSymbol,
                    amount: 0,
                    onlyInformation: false,
                    otherItemId: ''
                }
            });

            res.send({ success: true });
        } else {
            console.log('Error in controllers/socialController -> createSocialToken(): success = false.', blockchainRes.message);
            res.send({ success: false, error: blockchainRes.message });
        }
    } catch (err) {
        console.log('Error in controllers/socialController -> createSocialToken(): ', err);
        res.send({ success: false });
    }
};


// ----------------------------------- GETS -------------------------------------------
// get social pools
exports.getSocialTokens = async (req: express.Request, res: express.Response) => {
    try {
        const { address } = req.query;
        const retData: any[] = [];
        // get those social tokens which the user is the creator or has some balance
        const blockchainRes = await coinBalance.getBalancesByType(address, collections.socialToken, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const balances = blockchainRes.output;
            const socialSnap = await db.collection(collections.socialPools).get();
            socialSnap.forEach((doc) => {
                const data: any = doc.data();
                if (balances[data.TokenSymbol]) {
                    let marketPrice = getMarketPrice(data.AMM, data.SupplyReleased, data.InitialSupply, data.TragetPrice, data.TargetSupply);
                    retData.push({
                        ...data,
                        MarketPrice: marketPrice
                    });
                }
            });
            res.send({ success: true, data: retData });
        } else {
            console.log('Error in controllers/socialController -> getSocialPools(): blockchain = false ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/socialController -> getSocialPools(): ', err);
        res.send({ success: false });
    }
};


// get selling price for API
exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolAddress = body.poolAddress;
        const amount = body.amount;
        const socialTokenPool = await db.collection(collections.socialPools).doc(poolAddress).get();
        const data: any = socialTokenPool.data();
        const retData = getBuyTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice);
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/socialController -> getBuyTokenAmount(): ', err);
        res.send({ success: false });
    }
};

// get funding tokens for API
exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolAddress = body.poolAddress;
        const amount = body.amount;
        const socialTokenPool = await db.collection(collections.socialPools).doc(poolAddress).get();
        const data: any = socialTokenPool.data();
        const retData = getSellTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice);
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/socialController -> getSellTokenAmount(): ', err);
        res.send({ success: false });
    }
};









// exports.sellSocialToken = async (req: express.Request, res: express.Response) => {
//     try {
//         const body = req.body;
//         let data = {
//             Investor: body.Investor,
//             PoolAddress: body.PoolAddress,
//             Amount: body.Amount,
//             Hash: body.Hash,
//             Signature: body.Signature,
//             Caller: apiKey
//         }
//         const blockchainRes = await socialToken.sellSocialToken(data);
//         if (blockchainRes && blockchainRes.success) {
//             updateFirebase(blockchainRes);

//             res.send({success: true});
//         } else {
//             console.log('Error in controllers/socialTokenController -> sellSocialToken(): success = false.', blockchainRes.message);
//             res.send({success: false});
//         }
//     } catch (err) {
//         console.log('Error in controllers/socialTokenController -> sellSocialToken(): success = false.', err);
//         res.send({success: false});
//     }
// }

// exports.buySocialToken = async (req: express.Request, res: express.Response) => {
//     try {
//         const body = req.body;
//         let data = {
//             Investor: body.Investor,
//             PoolAddress: body.PoolAddress,
//             Amount: body.Amount,
//             Hash: body.Hash,
//             Signature: body.Signature,
//             Caller: apiKey
//         }
//         const blockchainRes = await socialToken.buySocialToken(data);
//         if (blockchainRes && blockchainRes.success) {
//             updateFirebase(blockchainRes);
//             res.send({success: true});
//         } else {
//             console.log('Error in controllers/socialTokenController -> buySocialToken(): success = false.', blockchainRes.message);
//             res.send({success: false});
//         }
//     } catch (err) {
//         console.log('Error in controllers/socialTokenController -> buySocialToken(): success = false.', err);
//         res.send({success: false});
//     }
// }

// exports.getSocialPool = async (req: express.Request, res: express.Response) => {
//     try {
//         let poolId = req.params.poolId;
//         if (poolId) {
//             const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
//             const data: any = poolSnap.data();
//             if (data) {
//                 res.send({
//                     success: true,
//                     data: data
//                 })
//             } else {
//                 console.log('Error in controllers/socialTokenController -> getSocialPool(): ', 'Social pool not found');
//                 res.send({success: false})
//             }
//         } else {
//             console.log('Error in controllers/socialTokenController -> getSocialPool(): ', 'poolId is missing');
//             res.send({success: false})
//         }
//     } catch (err) {
//         console.log('Error in controllers/socialTokenController -> getSocialPool(): ', err);
//         res.send({success: false});
//     }
// }

// exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
//     try {
//         const body = req.body;
//         const poolId = body.poolId;
//         const amount = body.amount;
//         const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
//         const data: any = poolSnap.data();
//         const poolTokens = getBuyTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice, data.TargetSupply);
//         res.send({success: true, data: poolTokens});
//     } catch (err) {
//         console.log('Error in controllers/socialTokenController -> getBuyTokenAmount(): ', err);
//         res.send({success: false});
//     }
// }

// exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
//     try {
//         const body = req.body;
//         const poolId = body.poolId;
//         const amount = body.amount;
//         const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
//         const data: any = poolSnap.data();
//         const poolTokens = getSellTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.SpreadDividend, data.TargetPrice, data.TargetSupply);
//         res.send({success: true, data: poolTokens});
//     } catch (err) {
//         console.log('Error in controllers/socialTokenController -> getSellTokenAmount(): ', err);
//     }
// }
