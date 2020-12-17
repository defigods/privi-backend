import express, { response } from 'express';
import community from "../blockchain/community";
import { updateFirebase, getRateOfChangeAsMap, createNotification, getUidNameMap, getEmailUidMap, generateUniqueId } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const notificationsController = require('./notificationsController');

require('dotenv').config();
const apiKey = process.env.API_KEY;

///////////////////////////// POSTS //////////////////////////////
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


///////////////////////////// GETS //////////////////////////////