import express, { response } from 'express';
import {
    updateFirebase,
    getMediaPodBuyingAmount,
    getMediaPodSellingAmount
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
const podController = require('./podController');
const tasks = require('./tasksController');
require('dotenv').config();
const apiKey = 'PRIVI'; // process.env.API_KEY;

// -------------------- GETS ----------------------

exports.getMyMediaPods = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        const userRef = db.collection(collections.user).doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();


        res.send({ success: true, data: user.myMediaPods || [] });
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> getMyMediaPods(): ', err);
        res.send({ success: false, error: "Error making request" });
    }
};

exports.getTrendingMediaPods = async (req: express.Request, res: express.Response) => {
    try {
        const trendingMediaPods: any[] = [];
        const MediaPodsSnap = await db.collection(collections.trendingMediaPods).get();
        for (let podSnap of MediaPodsSnap.docs) {
            let podData = podSnap.data()
            let mediaPod = await db.collection(collections.mediaPods).doc(podData.id).get();
            if (mediaPod.exists) {
                trendingMediaPods.push(mediaPod.data());
            }
        }
        res.send({ success: true, data: { trending: trendingMediaPods } });
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> getTrendingMediaPods(): ', err);
        res.send({ success: false, error: "Error making request" });
    }
};

exports.setTrendingMediaPods = cron.schedule('* * * * *', async () => {
    try {
        let allMediaPods: any[] = [];
        let podsMedia = await db.collection(collections.mediaPods).get();
        podsMedia.docs.forEach((p) => {
            let data = p.data();
            data.id = p.id;
            allMediaPods.push(data);
        });
        let trendingMediaPods: any[] = await podController.countLastWeekPods(allMediaPods);

        let batch = db.batch();

        await db
            .collection(collections.trendingMediaPods)
            .listDocuments()
            .then((val) => {
                val.map((val) => {
                    batch.delete(val);
                });
            });
        await trendingMediaPods.forEach((doc) => {
            let docRef = db.collection(collections.trendingMediaPods).doc();
            batch.set(docRef, { id: doc.id });
        });
        await batch.commit();
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> setTrendingMediaPods()', err);
    }
});

exports.getOtherMediaPods = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user).doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let query;
        for (const pod of user.myMediaPods) {
            query = db.collection(collections.mediaPods).where('PodAddress', '!=', pod.PodAddress);
        }
        if (!query) {
            query = db.collection(collections.mediaPods);
        }

        let podsMediaSnap = await query.get();
        let podsMedia: any[] = [];
        podsMediaSnap.docs.forEach((p) => {
            podsMedia.push(p.data());
        });

        res.send({ success: true, data: podsMedia });
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> getOtherMediaPods(): ', err);
        res.send({ success: false, error: "Error making request" });
    }
};

exports.getAllMediaPodsInfo = async (req: express.Request, res: express.Response) => {
    try {
        const mediaNFTPod = req.query.lastMediaPod;
        let allMediaPods: any[] = await getMediaPods(mediaNFTPod);
        res.send({
            success: true,
            data: allMediaPods ?? []
        });
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> getAllMediaPodsInfo(): ', err);
        res.send({ success: false, error: "Error making request" });
    }
};


// function to get all NFT Pods
const getMediaPods = (exports.getNFTPods = (lastMediaPod): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        let podsMedia;
        if (lastMediaPod) {
            podsMedia = await db.collection(collections.mediaPods).startAfter(lastMediaPod).limit(5).get();
        } else {
            podsMedia = await db.collection(collections.mediaPods).limit(6).get();
        }

        let array: any[] = [];
        podsMedia.docs.map((doc, i) => {
            array.push(doc.data());
        });
        resolve(array);
    });
});

exports.getMediaPod = async (req: express.Request, res: express.Response) => {
    try {
        let params = req.params;

        if (params && params.mediaPodId) {
            const mediaPodSnap = await db.collection(collections.mediaPods).doc(params.mediaPodId).get();

            // add selling orders
            const medias: any[] = [];
            const mediasSnap = await mediaPodSnap.ref.collection(collections.medias).get();
            mediasSnap.forEach((doc) => {
                let data = doc.data();
                data.id = doc.id;
                medias.push(data);
            });

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

exports.getPhotoById = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        console.log(podId);
        if (podId) {
            const directoryPath = path.join('uploads', 'mediaPod');
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                files.forEach(function (file) {
                    // Do whatever you want to do with the file
                    console.log(file);
                });
            });

            // stream the image back by loading the file
            res.setHeader('Content-Type', 'image');
            let raw = fs.createReadStream(path.join('uploads', 'mediaPod', podId + '.png'));
            raw.on('error', function (err) {
                console.log(err);
                res.sendStatus(400);
            });
            raw.pipe(res);
        } else {
            console.log('Error in controllers/podController -> getPhotoById()', "There's no pod id...");
            res.send({ success: false, error: "There's no pod id..." });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getPhotoById()', err);
        res.send({ success: false, error: err });
    }
};


exports.getBuyingPodFundingTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const podAddress: any = req.query.PodAddress;
        const amount: any = req.query.Amount;
        const podSnap = await db.collection(collections.mediaPods).doc(podAddress).get();
        const podData: any = podSnap.data();
        const price = getMediaPodBuyingAmount(podData.AMM, podData.FundingTokenPrice, podData.MaxPrice, podData.MaxSupply, podData.SupplyReleased, amount);
        res.send({ success: true, data: price });
    } catch (err) {
        console.log('Error in controllers/podController -> getBuyingPodFundingTokenAmount()', err);
        res.send({ success: false, error: err });
    }
};

exports.getSellingPodFundingTokenAmount = async (req: express.Request, res: express.Response) => {
    try {
        const podAddress: any = req.query.PodAddress;
        const amount: any = req.query.Amount;
        const podSnap = await db.collection(collections.mediaPods).doc(podAddress).get();
        const podData: any = podSnap.data();
        const price = getMediaPodSellingAmount(podData.AMM, podData.FundingTokenPrice, podData.MaxPrice, podData.MaxSupply, podData.SupplyReleased, amount);
        res.send({ success: true, data: price });
    } catch (err) {
        console.log('Error in controllers/podController -> getBuyingPodFundingTokenAmount()', err);
        res.send({ success: false, error: err });
    }
};

// ------------------- POST -----------------

exports.initiatePod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const podInfo = body.PodInfo;
        const medias = body.Medias;
        const hash = body.Hash;
        const signature = body.Signature;
        const creator = body.Creator;
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
                    JarrId: '',
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

exports.registerMedia = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const requester = body.Requester;
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;
        const type = body.Type;
        const paymentType = body.PaymentType;
        const copies = body.Copies;
        const royalty = body.Royalty;
        const fundingToken = body.FundingToken;
        const releaseDate = body.ReleaseDate;
        const pricePerSecond = body.PricePerSecond;
        const price = body.Price;
        const isRecord = body.IsRecord;
        const recordToken = body.RecordToken;
        const recordPaymentType = body.RecordPaymentType;
        const recordPrice = body.RecordPrice;
        const recordPricePerSecond = body.RecordPricePerSecond;
        const recordCopies = body.RecordCopies;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.registerMedia(requester, podAddress, mediaSymbol, type, paymentType, copies,
          royalty, fundingToken, releaseDate, pricePerSecond, price, isRecord, recordToken, recordPaymentType,
          recordPrice, recordPricePerSecond, recordCopies, hash, signature, apiKey);
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

exports.updateCollabs = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;
        /*
        "Collabs": {
            "Angel": 0.3,
            "Aleix": 0.7
            },
        */
        const collabs = body.Collabs;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.updateCollabs(podAddress, mediaSymbol, collabs, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            updateFirebase(output);
            res.send({ success: true });
        } else {
            console.log('Error in controllers/mediaPodController -> updateCollabs(): ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/mediaPodController -> updateCollabs(): ', err);
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

