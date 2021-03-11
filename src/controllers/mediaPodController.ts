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
        const creator = body.Creator;
        console.log(podInfo, medias, hash, signature, apiKey);
        const blockchainRes = await mediaPod.initiatePod(podInfo, medias, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];

            console.log(output);

            updateFirebase(blockchainRes);

            const userRef = db.collection(collections.user).doc(creator);
            const userGet = await userRef.get();
            const user: any = userGet.data();

            const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, user.firstName);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Discussions', creator, user.firstName, 'general', false, []);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Information', creator, user.firstName, 'announcements', false, []);

            const name = body.Name;
            const description = body.Description;
            const mainHashtag = body.MainHashtag;
            const hashtags = body.Hashtags;
            const hasPhoto = body.HasPhoto;
            const openAdvertising = body.OpenAdvertising;

            await db.collection(collections.mediaPods).doc(podId).set(
                {
                    HasPhoto: hasPhoto || false,
                    Name: name || '',
                    Description: description || '',
                    MainHashtag: mainHashtag || '',
                    Hashtags: hashtags || [],
                    OpenAdvertising: openAdvertising || false,
                    JarrId: discordChatJarrCreation.id || '',
                    Date: new Date().getTime()

                }, { merge: true }
            );

            res.send({ success: true, data: podId });
        } else {
            console.log('Error in controllers/mediaPodController -> initiatePod(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> initiatePod(): ', err);
        res.send({ success: false, error: "Error making request" });
    }
};

exports.getMediaPod = async (req: express.Request, res: express.Response) => {
    try {
        let params = req.params;

        if (params && params.mediaPodId) {
            const mediaPodSnap = await db.collection(collections.mediaPods).doc(params.mediaPodId).get();

            // add selling orders
            const medias: any[] = [];
            const mediasSnap = await mediaPodSnap.ref.collection(collections.medias).get();
            mediasSnap.forEach((doc) => medias.push(doc.data()));

            let mediaPod: any = mediaPodSnap.data();

            // add url if empty //
            if (!mediaPod.hasOwnProperty('urlSlug') || mediaPod.urlSlug == "") {
                await db.collection(collections.mediaPods).doc(params.mediaPodId).update({
                    "urlSlug": mediaPod.Name.split(' ').join('')
                })
            }

            res.send({
                success: true,
                data: {
                    mediaPod: mediaPod,
                    medias: medias
                },
            });

        } else {
            console.log('Error in controllers/mediaPodController -> initiatePod(): Media Pod Id not provided');
            res.send({ success: false, error: 'Media Pod Id not provided' });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> registerMedia(): ', err);
        res.send({ success: false, error: "Error making request" });
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

exports.buyPodTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.Trader;
        const podAddress = body.PodAddress;
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.buyPodTokens(trader, podAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> buyPodTokens(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> buyPodTokens(): ', err);
        res.send({ success: false });
    }
};

exports.sellPodTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.Trader;
        const podAddress = body.PodAddress;
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.sellPodTokens(trader, podAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> sellPodTokens(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> sellPodTokens(): ', err);
        res.send({ success: false });
    }
};


exports.changeMediaPodPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const mediaPodRef = db.collection(collections.mediaPods).doc(req.file.originalname);

            const mediaPodGet = await mediaPodRef.get();
            const mediaPod: any = await mediaPodGet.data();

            if (mediaPod.HasPhoto !== undefined) {
                await mediaPodRef.update({
                    HasPhoto: true
                });
            }

            res.send({ success: true });
        } else {
            console.log('Error in controllers/podController -> changeMediaPodPhoto()', "There's no file...");
            res.send({ success: false, error: "There's no file..." });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> changeMediaPodPhoto(): ', err);
        res.send({ success: false, error: err });
    }
};