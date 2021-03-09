import express, { response } from 'express';
import {
    updateFirebase,
    getRateOfChangeAsMap,
    createNotification,
    addZerosToHistory,
} from '../functions/functions';
import notificationTypes from '../constants/notificationType';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import mediaPod from '../blockchain/mediaPod';

const notificationsController = require('./notificationsController');
const chatController = require('./chatController');
const tasks = require('./tasksController');
require('dotenv').config();
const apiKey = 'PRIVI'; // process.env.API_KEY;

exports.initiatePod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const podInfo = body.PodInfo;
        const medias = body.Medias;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.initiatePod(podInfo, medias, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            // TODO: add Name, Description... to doc
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> initiatePod(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> initiatePod(): ', err);
        res.send({ success: false });
    }
};

exports.registerMedia = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const requester = body.Requester;
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;
        const copies = body.Copies;
        const royalty = body.Royalty;
        const fundingToken = body.FundingToken;
        const tokenType = body.TokenType;
        const paymentType = body.PaymentType;
        const price = body.Price;
        const pricePerSecond = body.PricePerSecond;
        const endingDate = body.EndingDate;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.registerMedia(requester, podAddress, mediaSymbol, copies, royalty, fundingToken, tokenType, paymentType, price, pricePerSecond,
            endingDate, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> registerMedia(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> registerMedia(): ', err);
        res.send({ success: false });
    }
};

exports.uploadMedia = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.uploadMedia(podAddress, mediaSymbol, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> uploadMedia(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> uploadMedia(): ', err);
        res.send({ success: false });
    }
};

exports.investPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investor = body.Investor;
        const podAddress = body.PodAddress;
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.investPod(investor, podAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> investPod(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> investPod(): ', err);
        res.send({ success: false });
    }
};

exports.buyMediaToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const buyer = body.Buyer;
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.buyMediaToken(buyer, podAddress, mediaSymbol, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> buyMediaToken(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> buyMediaToken(): ', err);
        res.send({ success: false });
    }
};