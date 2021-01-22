import express from "express";
import socialToken from '../blockchain/socialToken'
import collections from "../firebase/collections";
import {getBuyTokenAmount, getMarketPrice, getSellTokenAmount, updateFirebase} from "../functions/functions";
import {db} from "../firebase/firebase";

const apiKey = "PRIVI";

exports.createSocialToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        let sp = {
            Creator: body.Creator,
            PoolAddress: body.PoolAddress,
            AMM: body.AMM,
            SpreadDividend: body.SpreadDividend,
            TokenSymbol: body.TokenSymbol,
            TokenName: body.TokenName,
            InitialSupply: body.InitialSupply,
            FundingToken: body.FundingToken,
            DividendFreq: body.DividendFreq,
            LockUpDate: body.LockUpDate,
            TargetSupply: body.TargetSupply,
            TargetPrice: body.TargetPrice,
            Hash: body.Hash,
            Signature: body.Signature,
            Caller: apiKey,
        }

        const blockchainRes = await socialToken.createSocialToken(sp);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);

            res.send({success: true});
        } else {
            console.log('Error in controllers/socialTokenController -> createSocialToken(): success = false.', blockchainRes.message);
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> createSocialToken(): success = false.', err);
        res.send({success: false, message: err});
    }
}

exports.sellSocialToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        let data = {
            Investor: body.Investor,
            PoolAddress: body.PoolAddress,
            Amount: body.Amount,
            Hash: body.Hash,
            Signature: body.Signature,
            Caller: apiKey
        }
        const blockchainRes = await socialToken.sellSocialToken(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            res.send({success: true});
        } else {
            console.log('Error in controllers/socialTokenController -> sellSocialToken(): success = false.', blockchainRes.message);
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> sellSocialToken(): success = false.', err);
        res.send({success: false});
    }
}

exports.buySocialToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        let data = {
            Investor: body.Investor,
            PoolAddress: body.PoolAddress,
            Amount: body.Amount,
            Hash: body.Hash,
            Signature: body.Signature,
            Caller: apiKey
        }
        const blockchainRes = await socialToken.buySocialToken(data);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({success: true});
        } else {
            console.log('Error in controllers/socialTokenController -> buySocialToken(): success = false.', blockchainRes.message);
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> buySocialToken(): success = false.', err);
        res.send({success: false});
    }
}

exports.getMarketPrice = async (req: express.Request, res: express.Response) => {
    try {
        const poolId = req.params.poolId;
        const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
        const data = poolSnap.data();
        let price = NaN;
        if (data) {
            const supplyReleased = data.SupplyReleased;
            const amm = data.AMM;
            price = getMarketPrice(amm, supplyReleased);
        }
        res.send({success: true, data: price});
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> getMarketPrice(): success = false.', err);
        res.send({success: false});
    }
}

exports.getSocialPool = async (req: express.Request, res: express.Response) => {
    try {
        let poolId = req.params.poolId;
        if (poolId) {
            const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
            const data: any = poolSnap.data();
            if (data) {
                res.send({
                    success: true,
                    data: data
                })
            } else {
                console.log('Error in controllers/socialTokenController -> getSocialPool(): ', 'Social pool not found');
                res.send({success: false})
            }
        } else {
            console.log('Error in controllers/socialTokenController -> getSocialPool(): ', 'poolId is missing');
            res.send({success: false})
        }
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> getSocialPool(): ', err);
        res.send({success: false});
    }
}

exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolId = body.poolId;
        const amount = body.amount;
        const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
        const data: any = poolSnap.data();
        const poolTokens = getBuyTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice, data.TargetSupply);
        res.send({success: true, data: poolTokens});
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> getBuyTokenAmount(): ', err);
        res.send({success: false});
    }
}

exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const poolId = body.poolId;
        const amount = body.amount;
        const poolSnap = await db.collection(collections.socialPools).doc(poolId).get();
        const data: any = poolSnap.data();
        const poolTokens = getSellTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.SpreadDividend, data.TargetPrice, data.TargetSupply);
        res.send({success: true, data: poolTokens});
    } catch (err) {
        console.log('Error in controllers/socialTokenController -> getSellTokenAmount(): ', err);
    }
}