import express from 'express';
import social from "../blockchain/social";
import coinBalance from "../blockchain/coinBalance";
import { updateFirebase, addZerosToHistory, getMarketPrice } from "../functions/functions";
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
    } catch (err) {
        console.log('Error in controllers/podController -> getBuyTokenAmount(): ', err);
        res.send({ success: false });
    }
};

// get funding tokens for API
exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

    } catch (err) {
        console.log('Error in controllers/podController -> getSellTokenAmount(): ', err);
        res.send({ success: false });
    }
};


// get funding tokens for API
exports.getMarketPrice = async (req: express.Request, res: express.Response) => {
    try {
        const podId = req.params.podId;
    } catch (err) {
        console.log('Error in controllers/podController -> getSellTokenAmount(): ', err);
        res.send({ success: false });
    }
};