import express, { response } from 'express';
import {
  updateFirebase,
  getMediaPodBuyingAmount,
  addZerosToHistory,
  getMediaPodSellingAmount,
  generateUniqueId,
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
    res.send({ success: false, error: 'Error making request' });
  }
};

exports.getTrendingMediaPods = async (req: express.Request, res: express.Response) => {
  try {
    const trendingMediaPods: any[] = [];
    const MediaPodsSnap = await db.collection(collections.trendingMediaPods).get();
    for (let podSnap of MediaPodsSnap.docs) {
      let podData = podSnap.data();
      let mediaPod = await db.collection(collections.mediaPods).doc(podData.id).get();
      if (mediaPod.exists) {
        trendingMediaPods.push(mediaPod.data());
      }
    }
    res.send({ success: true, data: { trending: trendingMediaPods } });
  } catch (err) {
    console.log('Error in controllers/mediaPodController -> getTrendingMediaPods(): ', err);
    res.send({ success: false, error: 'Error making request' });
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
    res.send({ success: false, error: 'Error making request' });
  }
};

// get media pods according to pagination and filters
const pageSize = 6;
const sortByOptions = ["Most Followed", "Recent"];
const sortByTokenOptions = ["Descending", "Ascending"];
const displayingPods = [
  "All Pods",
  "My Pods",
  "My Connections",
  "Private Pods",
  "Public Pods",
];
exports.getAllMediaPodsInfo = async (req: express.Request, res: express.Response) => {
  try {
    const pagination: number = +req.params.pagination;
    const previousLastId = req.params.lastId;
    const params = req.query;
    let nextLastId = "null";
    let allMediaPods: any[] = [];
    let followers: string[] = [];
    if (params.userId && params.displayingCommunitiesSelection == displayingPods[2]) {
      const userSnap = await db.collection(collections.user).doc(params.userId as string).get();
      const userData: any = userSnap.data();
      followers = userData && userData.followers ? userData.followers : [];
    }
    // pagination and filtering
    if (pagination != undefined) {
      let communitiesSnap;
      if (previousLastId != 'null') {
        const lastPodSnap = await db.collection(collections.mediaPods).doc(previousLastId).get();
        const lastPodData: any = lastPodSnap.data();
        communitiesSnap = await db.collection(collections.mediaPods).orderBy('Date').startAfter(lastPodData.Date ?? 0).get();
      }
      else communitiesSnap = await db.collection(collections.mediaPods).orderBy('Date').get();
      communitiesSnap.forEach((doc) => {
        if (allMediaPods.length < pageSize) {
          const data: any = doc.data();
          if (params) {
            let addData = true;
            const userId = params.userId;
            //1. select the communities selection to show
            const displayingPodsSelection = params.displayingPodsSelection;
            if (displayingPodsSelection) {
              switch (displayingPodsSelection) {
                case displayingPods[0]:
                  addData = true;
                  break;
                case displayingPods[1]:
                  addData = (data.Creator === userId);
                  break;
                case displayingPods[2]:
                  addData = followers.includes(data.Creator ?? '');
                  break;
                case displayingPods[3]:
                  addData = Boolean(data.Private);
                  break;
                case displayingPods[4]:
                  addData = !Boolean(data.Private);
                  break;
              }
            }
            //2. filter by user input
            const searchValue: any = params.searchValue;
            if (searchValue) {
              if (searchValue.includes("#") && data.Hashtags && data.Hashtags.length > 0) {
                data.Hashtags.forEach((hashtag: string) => {
                  if (!hashtag.toUpperCase().includes(searchValue.slice(1).toUpperCase())) {
                    addData = false;
                  }
                });
              } else if (data.Name) {
                if (!data.Name.toUpperCase().includes(searchValue.toUpperCase())) addData = false;
              }
            }
            //3. filter by endorsement and trust scores
            const trustScore = params.trustScore;
            if (trustScore != undefined && !isNaN(Number(trustScore))) addData = addData && (data.TrustScore == undefined || data.TrustScore * 100 <= Number(trustScore));
            const endorsementScore = params.endorsementScore;
            if (endorsementScore != undefined && !isNaN(Number(endorsementScore))) addData = addData && (data.EndorsementScore == undefined || data.EndorsementScore * 100 <= Number(endorsementScore))
            //4. addData 
            if (addData) allMediaPods.push(data);
          } else {
            allMediaPods.push(data);
          }
        }
      });
      if (allMediaPods.length > 0) nextLastId = allMediaPods[allMediaPods.length - 1].PodAddress; // save last community Id (by date) before sorting

      //Sort 1
      const sortByOptionsSelection = params.sortByOptionsSelection;
      if (sortByOptionsSelection) {
        if (sortByOptionsSelection === sortByOptions[0]) {
          //by most followers
          allMediaPods.sort((a, b) =>
            b.Followers && a.Followers
              ? b.Followers.length - a.Followers.length
              : 0
          );
        } else if (sortByOptionsSelection === sortByOptions[1]) {
          //by most recent date
          allMediaPods.sort(
            (a, b) => Date.parse(b["StartDate"]) - Date.parse(a["StartDate"])
          );
        }
      }
      //Sort 2
      const sortByTokenOptionsSelection = params.sortByTokenOptionsSelection;
      if (sortByTokenOptionsSelection) {
        if (sortByTokenOptionsSelection === sortByTokenOptions[0]) {
          //by tokens descending
          allMediaPods.sort((a, b) => b.FundingTokenPrice - a.FundingTokenPrice);
        } else if (sortByTokenOptionsSelection === sortByTokenOptions[1]) {
          //by tokens ascending
          allMediaPods.sort((a, b) => a.FundingTokenPrice - b.FundingTokenPrice);
        }
      }
    }
    // if no pagination and filters, just return all 
    else {
      const mediasSnap = await db.collection(collections.mediaPods).get();
      mediasSnap.forEach((doc) => allMediaPods.push(doc.data()));
    }
    const hasMore = allMediaPods.length == pageSize;
    res.send({
      success: true,
      data: {
        mediaPods: allMediaPods ?? [],
        hasMore: hasMore,
        lastId: nextLastId
      },
    });
  } catch (err) {
    console.log('Error in controllers/mediaPodController -> getAllMediaPodsInfo(): ', err);
    res.send({ success: false, error: 'Error making request' });
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
      if (!mediaPod.hasOwnProperty('urlSlug') || mediaPod.urlSlug == '') {
        await db
          .collection(collections.mediaPods)
          .doc(params.mediaPodId)
          .update({
            urlSlug: mediaPod.Name.split(' ').join(''),
          });
      }

      res.send({
        success: true,
        data: {
          mediaPod: mediaPod,
          medias: medias,
        },
      });
    } else {
      console.log('Error in controllers/mediaPodController -> initiatePod(): Media Pod Id not provided');
      res.send({ success: false, error: 'Media Pod Id not provided' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaPodController -> registerMedia(): ', err);
    res.send({ success: false, error: 'Error making request' });
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
    const price = getMediaPodBuyingAmount(
      podData.AMM,
      podData.FundingTokenPrice,
      podData.MaxPrice,
      podData.MaxSupply,
      podData.SupplyReleased,
      1
    );
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
    const price = getMediaPodSellingAmount(
      podData.AMM,
      podData.FundingTokenPrice,
      podData.MaxPrice,
      podData.MaxSupply,
      podData.SupplyReleased,
      amount
    );
    res.send({ success: true, data: price });
  } catch (err) {
    console.log('Error in controllers/podController -> getBuyingPodFundingTokenAmount()', err);
    res.send({ success: false, error: err });
  }
};

exports.getPriceHistory = async (req: express.Request, res: express.Response) => {
  try {
    const podAddress: any = req.query.PodAddress;
    const retData: any = [];
    const podSnap = await db
      .collection(collections.mediaPods)
      .doc(podAddress)
      .collection(collections.priceHistory)
      .orderBy('date', 'asc')
      .get();
    podSnap.forEach((doc) => {
      retData.push(doc.data());
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/podController -> getPriceHistory()', err);
    res.send({ success: false, error: err });
  }
};

exports.getSupplyHistory = async (req: express.Request, res: express.Response) => {
  try {
    const podAddress: any = req.query.PodAddress;
    const retData: any = [];
    const podSnap = await db
      .collection(collections.mediaPods)
      .doc(podAddress)
      .collection(collections.supplyHistory)
      .orderBy('date', 'asc')
      .get();
    podSnap.forEach((doc) => {
      retData.push(doc.data());
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/podController -> getSupplyHistory()', err);
    res.send({ success: false, error: err });
  }
};

exports.getMediaPodTransactions = async (req: express.Request, res: express.Response) => {
  try {
    const podAddress: any = req.query.PodAddress;
    const retData: any = [];
    const podSnap = await db
      .collection(collections.mediaPods)
      .doc(podAddress)
      .collection(collections.transactions)
      .get();
    podSnap.forEach((doc) => {
      const data: any = doc.data();
      if (data.Transactions) retData.push(data.Transactions);
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/podController -> getMediaPodTransactions()', err);
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
      await updateFirebase(blockchainRes);

      // add txns to pod
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podId)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      // add initial data for graph
      addZerosToHistory(db.collection(collections.mediaPods).doc(podId).collection(collections.priceHistory), 'price');
      addZerosToHistory(
        db.collection(collections.mediaPods).doc(podId).collection(collections.supplyHistory),
        'supply'
      );

      const userRef = db.collection(collections.user).doc(creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, user.firstName);
      await chatController.createDiscordRoom(
        discordChatJarrCreation.id,
        'Discussions',
        creator,
        user.firstName,
        'general',
        false,
        []
      );
      await chatController.createDiscordRoom(
        discordChatJarrCreation.id,
        'Information',
        creator,
        user.firstName,
        'announcements',
        false,
        []
      );

      const name = body.Name;
      const description = body.Description;
      const mainHashtag = body.MainHashtag;
      const hashtags = body.Hashtags;
      const hasPhoto = body.HasPhoto;
      const openAdvertising = body.OpenAdvertising;

      await db
        .collection(collections.mediaPods)
        .doc(podId)
        .set(
          {
            HasPhoto: hasPhoto || false,
            Name: name || '',
            Description: description || '',
            MainHashtag: mainHashtag || '',
            Hashtags: hashtags || [],
            OpenAdvertising: openAdvertising || false,
            JarrId: '',
            Date: new Date().getTime(),
          },
          { merge: true }
        );

      res.send({ success: true, data: podId });
    } else {
      console.log('Error in controllers/mediaPodController -> initiatePod(): ', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaPodController -> initiatePod(): ', err);
    res.send({ success: false, error: 'Error making request' });
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
    const releaseDate = parseInt(body.ReleaseDate);
    const pricePerSecond = body.PricePerSecond;
    const price = body.Price;
    const isRecord = body.IsRecord;
    const recordToken = body.RecordToken;
    const recordPaymentType = body.RecordPaymentType;
    const recordPrice = body.RecordPrice;
    const recordPricePerSecond = body.RecordPricePerSecond;
    const recordCopies = body.RecordCopies;
    const recordRoyalty = body.RecordRoyalty;
    const exclusivePermissionsList = body.ExclusivePermissionsList ?? [];
    const rewards = body.Rewards ?? [];
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await mediaPod.registerMedia(
      requester,
      podAddress,
      mediaSymbol,
      type,
      paymentType,
      copies,
      royalty,
      fundingToken,
      releaseDate,
      pricePerSecond,
      price,
      isRecord,
      recordToken,
      recordPaymentType,
      recordPrice,
      recordPricePerSecond,
      recordCopies,
      recordRoyalty,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      if (body.IsUploaded) {
        const mediasRef = db
          .collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol);
        const mediasGet = await mediasRef.get();
        const media: any = mediasGet.data();

        let bodySave: any = {
          Collabs: media.Collabs || {},
          HasPhoto: media.HasPhoto || false,
          Requester: requester,
          PodAddress: podAddress,
          MediaName: media.MediaName || '',
          MediaDescription: media.MediaDescription || '',
          MediaSymbol: mediaSymbol,
          Type: type,
          PaymentType: paymentType,
          Copies: copies,
          Royalty: royalty,
          FundingToken: fundingToken,
          ReleaseDate: releaseDate,
          PricePerSecond: pricePerSecond,
          Price: price,
          IsRecord: isRecord,
          RecordToken: recordToken,
          RecordPaymentType: recordPaymentType,
          RecordPrice: recordPrice,
          RecordPricePerSecond: recordPricePerSecond,
          RecordCopies: recordCopies,
          RecordRoyalty: recordRoyalty,
          ExclusivePermissionsList: exclusivePermissionsList,
          Rewards: rewards,
        }

        if (media.Type === "BLOG_TYPE" || media === "BLOG_SNAP_TYPE") {
          bodySave.EditorPages = media.editorPages || [];
          bodySave.DescriptionArray = media.DescriptionArray || '';
        }

        if (media.Type === "LIVE_AUDIO_TYPE" || media.Type === "LIVE_VIDEO_TYPE") {
          bodySave.RoomState = 'SCHEDULED'
          bodySave.CountStreamers = 0;
          bodySave.CountWatchers = 0;
          bodySave.ExpectedDuration = 0;
          bodySave.MainStreamer = bodySave.Requester;
          bodySave.RoomName = media.MediaSymbol;
          bodySave.StartedTime = 0;
          bodySave.EndedTime = 0;
          bodySave.StreamingToken = '';
          bodySave.StreamingUrl = '';
          bodySave.TotalWatchers = 0;
          bodySave.Video = media === "LIVE_VIDEO_TYPE";
          bodySave.Watchers = [];
          bodySave.OnlineModerators = [];
          bodySave.Moderators = [];
          bodySave.OnlineStreamers = [];
          bodySave.Streamers = []
          bodySave.LimitedEdition = [];
          bodySave.PriceType = '';
          bodySave.Price = 0;
          bodySave.StartingTime = 0;
          bodySave.EndingTime = 0;
          bodySave.Rewards = '';
        }

        await db.runTransaction(async (transaction) => {
          transaction.set(db.collection(collections.streaming).doc(body.MediaSymbol.replace(/\s/g, '')), bodySave);
        });
      }

      // add txns to media
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
    console.log(podAddress, mediaSymbol, hash, signature, apiKey);
    const blockchainRes = await mediaPod.uploadMedia(podAddress, mediaSymbol, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      if (body.IsRegistered) {
        const mediasRef = db
          .collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol);
        const mediasGet = await mediasRef.get();
        const media: any = mediasGet.data();

        let bodySave: any = {
          Collabs: media.Collabs || {},
          HasPhoto: media.HasPhoto || false,
          Requester: body.Requester,
          PodAddress: media.PodAddress,
          MediaName: media.MediaName || '',
          MediaDescription: media.MediaDescription || '',
          MediaSymbol: media.MediaSymbol,
          Type: media.Type,
          PaymentType: media.PaymentType,
          Copies: media.Copies,
          Royalty: media.Royalty,
          FundingToken: media.FundingToken,
          ReleaseDate: media.ReleaseDate,
          PricePerSecond: media.PricePerSecond,
          Price: media.Price,
          IsRecord: media.IsRecord,
          RecordToken: media.RecordToken,
          RecordPaymentType: media.RecordPaymentType,
          RecordPrice: media.RecordPrice,
          RecordPricePerSecond: media.RecordPricePerSecond,
          RecordCopies: media.RecordCopies,
          RecordRoyalty: media.RecordRoyalty
        }

        if (media.Type === "LIVE_AUDIO_TYPE" || media === "LIVE_VIDEO_TYPE") {
          bodySave.RoomState = 'SCHEDULED'
          bodySave.CountStreamers = 0;
          bodySave.CountWatchers = 0;
          bodySave.ExpectedDuration = 0;
          bodySave.MainStreamer = media.Creator;
          bodySave.RoomName = media.MediaSymbol;
          bodySave.StartedTime = 0;
          bodySave.EndedTime = 0;
          bodySave.StreamingToken = '';
          bodySave.StreamingUrl = '';
          bodySave.TotalWatchers = 0;
          bodySave.Video = media === "LIVE_VIDEO_TYPE";
          bodySave.Watchers = [];
          bodySave.OnlineModerators = [];
          bodySave.Moderators = [];
          bodySave.OnlineStreamers = [];
          bodySave.Streamers = []
          bodySave.LimitedEdition = [];
          bodySave.PriceType = '';
          bodySave.Price = 0;
          bodySave.StartingTime = 0;
          bodySave.EndingTime = 0;
          bodySave.Rewards = '';
        }

        await db.runTransaction(async (transaction) => {
          transaction.set(db.collection(collections.streaming).doc(body.MediaSymbol.replace(/\s/g, '')), bodySave);
        });
      }

      // add txns to media
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.Transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
      updateFirebase(blockchainRes);
      // add txns to pod
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.Transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
      updateFirebase(blockchainRes);
      // add txns to pod
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.Transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
      updateFirebase(blockchainRes);
      // add txns to pod
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.Transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
      updateFirebase(blockchainRes);
      // add txns to pod
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.Transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
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
    const collabs = body.Collabs;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await mediaPod.updateCollabs(podAddress, mediaSymbol, collabs, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
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
          HasPhoto: true,
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

// -------------- CRON JOBS ---------------

// store price daily
exports.storePriceHistory = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Media Pod storePriceHistory() cron job started *********');
    const mediaPodSnaps = await db.collection(collections.mediaPods).get();
    mediaPodSnaps.forEach((doc) => {
      const podData: any = doc.data();
      const price = getMediaPodBuyingAmount(
        podData.AMM,
        podData.FundingTokenPrice,
        podData.MaxPrice,
        podData.MaxSupply,
        podData.SupplyReleased,
        1
      );
      doc.ref.collection(collections.priceHistory).add({
        data: Date.now(),
        price: price,
      });
    });
  } catch (err) {
    console.log(err);
  }
});

// store supply daily
exports.storeSupplyHistory = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Media Pod storeSupplyHistory() cron job started *********');
    const mediaPodSnaps = await db.collection(collections.mediaPods).get();
    mediaPodSnaps.forEach((doc) => {
      const podData: any = doc.data();
      const supply = podData.SupplyReleased ?? 0;
      doc.ref.collection(collections.supplyHistory).add({
        data: Date.now(),
        supply: supply,
      });
    });
  } catch (err) {
    console.log(err);
  }
});
