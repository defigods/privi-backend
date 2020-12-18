import express from "express";
import { createNotification, generateUniqueId, updateFirebase } from "../functions/functions";
import badge from "../blockchain/badge";
import community from "../blockchain/community";
import notificationTypes from "../constants/notificationType";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = process.env.API_KEY;

exports.createCommunity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creater = body.creater;
        const communityAddress = body.communityAddress;
        const ammAddress = body.ammAddress;
        const amm = body.amm;
        const targetSupply = body.targetSupply;
        const targetPrice = body.targetPrice;
        const spreadDividend = body.spreadDivident;
        const fundingToken = body.fundingToken;
        const tokenSymbol = body.tokenSymbol;
        const tokenName = body.tokenName;
        const frequency = body.frequency;
        const initialSupply = body.initialSupply;
        const dateLockUpDate = body.dateLockUpDate;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.createCommunity(creater, communityAddress, ammAddress, amm, targetSupply, targetPrice, spreadDividend, fundingToken, tokenSymbol, tokenName, frequency, initialSupply, date,
            dateLockUpDate, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> createCommunity(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> createCommunity(): ', err);
        res.send({ success: false });
    }
};


exports.sellCommunityToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investor = body.investor;
        const communityAddress = body.communityAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.sellCommunityToken(investor, communityAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> sellCommunityToken(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> sellCommunityToken(): ', err);
        res.send({ success: false });
    }
};

exports.buyCommunityToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investor = body.investor;
        const communityAddress = body.communityAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.buyCommunityToken(investor, communityAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> buyCommunityToken(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> buyCommunityToken(): ', err);
        res.send({ success: false });
    }
};

exports.stakeCommunityFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const lpAddress = body.lpAddress;
        const communityAddress = body.communityAddress;
        const stakingToken = body.stakingToken;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.stakeCommunityFunds(lpAddress, communityAddress, stakingToken, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> stakeCommunityFunds(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> stakeCommunityFunds(): ', err);
        res.send({ success: false });
    }
};






exports.createBadge = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const name = body.name;
        const description = body.description;
        const totalSupply = body.totalSupply;
        const royalty = body.royalty;
        const txid = generateUniqueId();
        const blockchainRes = await badge.createBadge(creator, name, name, parseInt(totalSupply), parseFloat(royalty), Date.now(), 0, txid, 'PRIVI');

        if (blockchainRes && blockchainRes.success) {
            console.log('llega', creator);
            // updateFirebase(blockchainRes);
            /*await notificationsController.addNotification({
                userId: creatorId,
                notification: {
                    type: 45,
                    typeItemId: '',
                    itemId: '', //Liquidity pool id
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: 0,
                    onlyInformation: false,
                }
            });*/
            await db.runTransaction(async (transaction) => {

                // userData - no check if firestore insert works? TODO
                transaction.set(db.collection(collections.badges).doc(creator), {
                    creator: creator,
                    name: name,
                    description: description,
                    symbol: name,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                });
            });

            res.send({
                success: true, data: {
                    creator: creator,
                    name: name,
                    symbol: name,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                }
            });
        }
        else {
            console.log('Error in controllers/communitiesControllers -> createBadge(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (e) {
        return ('Error in controllers/communitiesControllers -> createBadge()' + e)
    }
}


exports.changeBadgePhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const badgeRef = db.collection(collections.badges)
                .doc(req.file.originalname);
            const badgeGet = await badgeRef.get();
            const badge: any = badgeGet.data();
            if (badge.hasPhoto) {
                await badgeRef.update({
                    hasPhoto: true
                });
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/communitiesController -> changeBadgePhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communitiesController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};


