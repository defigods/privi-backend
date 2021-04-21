import express from 'express';
import social from '../blockchain/social';
import mediaPod from '../blockchain/mediaPod';
import { updateFirebase, getAddresUidMap, isUserValidForLiveStream } from '../functions/functions';
import collections, { medias, streaming } from '../firebase/collections';
import { db, firebase } from '../firebase/firebase';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import fs from 'fs';
import path from 'path';
import axios from 'axios';
const secretKey = require('secret-key');
const fetch = require('node-fetch');

//const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI';
const ORIGIN_DAILY_API_URL = 'https://api.daily.co/v1';
const DAILY_API_KEY = 'e93f4b9d62e8f5428297778f56bf8a9417b6a5343d0d4a961e0451c893ea8cba';

// Daily API URL
const ROOM_URL = `${ORIGIN_DAILY_API_URL}/rooms`;
const MEETING_TOKENS_URL = `${ORIGIN_DAILY_API_URL}/meeting-tokens`;
const RECORDING_URL = `${ORIGIN_DAILY_API_URL}/recordings`

enum ROOM_STATE {
  COMPLETED = 'COMPLETED',
  SCHEDULED = 'SCHEDULED',
  GOING = 'GOING',
}

enum PRICE_TYPE {
  FREE = 'FREE', // Price = 0
  STREAMING = 'STREAMING', // Pirce is just PricePerSecond
  FIXED = 'FIXED', // Price is TotalPrice
}

enum ERROR_MSG {
  PERMISSION_ERROR = "You don't have right permission",
  FIRESTORE_ERROR = 'Error in interacting Firestore',
  DAILY_ERROR = 'Error in interacting streaming service',
}
// ----------------------------------- POST -------------------------------------------

// streamer starts the live streaming
exports.initiateMediaLiveStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await mediaPod.initiateMediaLiveStreaming(podAddress, mediaSymbol, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes); // update media inside pod obj
      // add media in an outer colection "Streaming"
      const output = blockchainRes.output;
      const updateMedias = output.UpdateMedias;
      let mediaSymbol: string = '';
      let mediaObj: any = null;
      for ([mediaSymbol, mediaObj] of Object.entries(updateMedias)) {
        db.collection(collections.streaming).doc(mediaSymbol).set(mediaObj);
        const streamerPrortions = mediaObj.StreamingProportions;
        const streamerAddresses = Object.keys(streamerPrortions);
        // add the streamer docs for accumulated price tracking
        streamerAddresses.forEach((streamerAddress) => {
          db.collection(collections.streaming)
            .doc(mediaSymbol)
            .collection(collections.streamers)
            .doc(streamerAddress)
            .set({
              AccumulatedAmount: 0,
              PricePerSecond: 0,
              LastUpdate: Date.now(),
            });
        });
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/streaming -> initiateMediaLiveStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> initiateMediaLiveStreaming(): ', err);
    res.send({ success: false });
  }
};


// a listener joins the streaming
exports.enterMediaLiveStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const listener = body.Listener; // userId
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const hash = body.Hash;
    const signature = body.Signature;

    let ERR_MSG = ""; // reusable error message placeholder for this function

    const blockchainRes = await mediaPod.enterMediaLiveStreaming(
      listener,
      podAddress,
      mediaSymbol,
      hash,
      signature,
      apiKey
    );

    //  validate the user if they can access the room.
    if (!isUserValidForLiveStream(listener, mediaSymbol)) {
      ERR_MSG = 'User not allowed in this live stream session';
      console.log(
        'Error in controllers/streaming -> enterMediaLiveStreaming(): success = false.',
        ERR_MSG
      );
      res.send({ success: false, error: ERR_MSG });
    }


    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes); // update media inside pod
      // update media in "Streaming"
      const output = blockchainRes.output;
      const updateStreaming = output.UpdateStreaming;
      let totalPricePerSecond = 0;
      let streamingId = '';
      let streamingObj: any = null;
      for ([streamingId, streamingObj] of Object.entries(updateStreaming)) {
        const receiverAddress = streamingObj.ReceiverAddress;
        const pricePerSecond = streamingObj.AmountPerPeriod; // price per second
        totalPricePerSecond += pricePerSecond;
        // update the receiver (streamers)
        if (receiverAddress && pricePerSecond) {
          db.collection(collections.streaming)
            .doc(mediaSymbol)
            .collection(collections.streamers)
            .doc(receiverAddress)
            .get()
            .then((streamerSnap) => {
              // store curr accumulated price, update LastUpadte field and pricePerSecond
              const data: any = streamerSnap;
              let newAccumulatedAmount = data.AccumulatedAmount ?? 0;
              let newLastUpdate = data.LastUpdate ?? Date.now();
              let newPricePerSecond = data.PricePerSecond ?? 0;
              const timeDiff = Math.floor((Date.now() - newLastUpdate) / 1000); // in secs
              newAccumulatedAmount += newPricePerSecond * timeDiff;
              newLastUpdate = Date.now();
              newPricePerSecond += pricePerSecond;
              streamerSnap.ref.update({
                AccumulatedAmount: newAccumulatedAmount,
                PricePerSecond: newPricePerSecond,
                LastUpdate: newLastUpdate,
              });
            });
        }
        db.collection(collections.streaming)
          .doc(mediaSymbol)
          .collection(collections.streamingListeners)
          .doc(listener)
          .collection(collections.streamings)
          .doc(streamingId)
          .set(streamingObj, { merge: true });
      }
      // update listener (watcher)
      await db
        .collection(collections.streaming)
        .doc(mediaSymbol)
        .collection(collections.streamingListeners)
        .doc(listener)
        .set({
          JoinedAt: Date.now(),
          PricePerSecond: totalPricePerSecond,
        });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/streaming -> enterMediaLiveStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> enterMediaLiveStreaming(): ', err);
    res.send({ success: false });
  }
};

// a listener leaves the streaming
exports.exitMediaLiveStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const listener = body.Listener;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const blockchainRes = await mediaPod.exitMediaLiveStreaming(listener, podAddress, mediaSymbol, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // delete listener doc inside media and updating streamer doc fields
      const listenerStreamingSnap = await db
        .collection(collections.streaming)
        .doc(mediaSymbol)
        .collection(collections.streamingListeners)
        .doc(listener)
        .collection(collections.streamings)
        .get();
      listenerStreamingSnap.forEach((doc) => {
        const data: any = doc.data();
        const receiverAddress = data.ReceiverAddress;
        const pricePerSecond = data.AmountPerPeriod; // price per second
        // update the receivers (streamers)
        if (receiverAddress && pricePerSecond) {
          db.collection(collections.streaming)
            .doc(mediaSymbol)
            .collection(collections.streamers)
            .doc(receiverAddress)
            .get()
            .then((streamerSnap) => {
              // store curr accumulated price, update LastUpadte field and pricePerSecond
              const data: any = streamerSnap;
              let newAccumulatedAmount = data.AccumulatedAmount ?? 0;
              let newLastUpdate = data.LastUpdate ?? Date.now();
              let newPricePerSecond = data.PricePerSecond ?? 0;
              const timeDiff = Math.floor((Date.now() - newLastUpdate) / 1000); // in secs
              newAccumulatedAmount += newPricePerSecond * timeDiff;
              newLastUpdate = Date.now();
              newPricePerSecond -= pricePerSecond;
              streamerSnap.ref.update({
                AccumulatedAmount: newAccumulatedAmount,
                PricePerSecond: newPricePerSecond,
                LastUpdate: newLastUpdate,
              });
            });
        }
        doc.ref.delete();
      });
      db.collection(collections.streaming)
        .doc(mediaSymbol)
        .collection(collections.streamingListeners)
        .doc(listener)
        .delete();
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/streaming -> exitMediaLiveStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> exitMediaLiveStreaming(): ', err);
    res.send({ success: false });
  }
};


// a listener joins the streaming
exports.enterMediaStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const listener = body.Listener; // userId
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await mediaPod.enterMediaLiveStreaming(
      listener,
      podAddress,
      mediaSymbol,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes); // update media inside pod
      // update media in "Streaming"
      const output = blockchainRes.output;
      const updateStreaming = output.UpdateStreaming;
      let totalPricePerSecond = 0;
      let streamingId = '';
      let streamingObj: any = null;

      console.log(output, output.UpdateMedias, updateStreaming);

      // update listener (watcher)
      await db
        .collection(collections.streaming)
        .doc(mediaSymbol)
        .collection(collections.streamingListeners)
        .doc(listener)
        .set({
          JoinedAt: Date.now(),
          PricePerSecond: totalPricePerSecond,
        });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/streaming -> enterMediaStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> enterMediaStreaming(): ', err);
    res.send({ success: false });
  }
};

// a listener leaves the streaming
exports.exitMediaStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const listener = body.Listener;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const blockchainRes = await mediaPod.exitMediaLiveStreaming(listener, podAddress, mediaSymbol, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // delete listener doc inside media and updating streamer doc fields

      db.collection(collections.streaming)
        .doc(mediaSymbol)
        .collection(collections.streamingListeners)
        .doc(listener)
        .delete();
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/streaming -> exitMediaStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> exitMediaStreaming(): ', err);
    res.send({ success: false });
  }
};

// viewer joins to the steaming (a call per viewer)
exports.initiateStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const sender = body.SenderAddress;
    const receiver = body.ReceiverAddress;
    const amountPeriod = body.AmountPerPeriod;
    const token = body.StreamingToken;
    const startDate = body.StartingDate;
    const endDate = body.EndingDate;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await mediaPod.createStreaming(
      sender,
      receiver,
      amountPeriod,
      token,
      startDate,
      endDate,
      hash,
      signature,
      apiKey
    );

    if (blockchainRes && blockchainRes.success) {
      res.send({ success: true });
    } else {
      console.log('Error in controllers/streaming -> createStreaming(): success = false.', blockchainRes.message);
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> createStreaming(): ', err);
    res.send({ success: false });
  }
};

/*
 ** Schedule Streaming **
 
 ** Request Body **
  StreamingToken,
  UserId, // MainStreamer
  Moderators,
  Streamers,
  LimitedEdition,
  ExpectedDuration,
  PriceType,
  Price,
  StartingTime,
  EndingTime,
  Rewards,
  Video
 
 ** Response **
  success: API call succeed or not
  docId: Firebase document id

 ** **
*/

exports.scheduleStreaming = async (req: express.Request, res: express.Response) => {
  const {
    StreamingToken,
    UserId, // MainStreamer
    Moderators,
    Streamers,
    LimitedEdition,
    ExpectedDuration,
    PriceType,
    Price,
    StartingTime,
    EndingTime,
    Rewards,
    Video
  } = req.body;


  try {
    const collectionRef = await db.collection(collections.streaming).add({
      RoomState: ROOM_STATE.SCHEDULED,
      CountStreamers: 0,
      CountWatchers: 0,
      ExpectedDuration,
      MainStreamer: UserId,
      RoomName: '',
      StartedTime: 0,
      EndedTime: 0,
      StreamingToken,
      StreamingUrl: '',
      TotalWatchers: 0,
      Video: Video || true,
      Watchers: [],
      OnlineModerators: [],
      Moderators,
      OnlineStreamers: [],
      Streamers,
      LimitedEdition,
      PriceType,
      Price,
      StartingTime,
      EndingTime,
      Rewards,
      Comments: []
    });
    res.send({ success: true, DocId: collectionRef.id });
  } catch (err) {
    res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
  }
};

/*
 ** Create Streaming **
 
 ** Request Body **
 DocId
 UserId
 
 ** Response **
 success: API call succeed or not
 streamingUrl: Daily Streaming URL which users can join

 ** **
*/

exports.createStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, isRecord, UserId, IsProtected, ProtectKey } = req.body;
  const docSnap = await db.collection(collections.streaming).doc(DocId).get();
  const streamingData = docSnap.data();

  // Check the User is MainStreamer of this streaming data
  if (streamingData && UserId === streamingData?.MainStreamer) {
    if (streamingData.RoomState === ROOM_STATE.SCHEDULED) {

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DAILY_API_KEY}`
        },
        body: JSON.stringify({
          //privacy: 'private',
          name: DocId,
          properties: { enable_recording: 'cloud' }
        })
      };

      let dailyResponse;
      await fetch(ROOM_URL, options)
        .then(res => res.json())
        .then(json => {
          dailyResponse = json;
          return;
        })
        .catch(err => {
          res.send({ success: false, message: ERROR_MSG.DAILY_ERROR });
        }
        )

      let data = dailyResponse;

      console.log('data aqui', data);

      try {
        docSnap.ref.update({
          RoomName: data.name,
          StreamingUrl: data.url,
          StartedTime: Date.now(),
          RoomState: ROOM_STATE.GOING,
        });
        let resData = docSnap.data();
        console.log(resData)

        // Blockchain Integration part

        // try {
        //   const body = req.body;
        //   const podAddress = body.PodAddress;
        //   const mediaSymbol = body.MediaSymbol;
        //   const hash = body.Hash;
        //   const signature = body.Signature;
        //   const blockchainRes = await mediaPod.initiateMediaLiveStreaming(
        //     podAddress,
        //     mediaSymbol,
        //     hash,
        //     signature,
        //     apiKey
        //   );
        //   if (blockchainRes && blockchainRes.success) {
        //     updateFirebase(blockchainRes); // update media inside pod obj
        //     // add media in an outer colection "Streaming"
        //     const output = blockchainRes.output;
        //     const updateMedias = output.UpdateMedias;
        //     let mediaSymbol: string = '';
        //     let mediaObj: any = null;
        //     for ([mediaSymbol, mediaObj] of Object.entries(updateMedias)) {
        //       db.collection(collections.streaming).doc(mediaSymbol).set(mediaObj);
        //       const streamerPrortions = mediaObj.StreamingProportions;
        //       const streamerAddresses = Object.keys(streamerPrortions);
        //       // add the streamer docs for accumulated price tracking
        //       streamerAddresses.forEach((streamerAddress) => {
        //         db.collection(collections.streaming)
        //           .doc(mediaSymbol)
        //           .collection(collections.streamers)
        //           .doc(streamerAddress)
        //           .set({
        //             AccumulatedAmount: 0,
        //             PricePerSecond: 0,
        //             LastUpdate: Date.now(),
        //           });
        //       });
        //     }
        //     res.send({ success: true, StreamingUrl: data.url, data: resData });
        //   } else {
        //     console.log(
        //       'Error in controllers/streaming -> initiateMediaLiveStreaming(): success = false.',
        //       blockchainRes.message
        //     );
        //     res.send({ success: false, error: blockchainRes.message });
        //   }
        // } catch (err) {
        //   console.log('Error in controllers/streaming -> initiateMediaLiveStreaming(): ', err);
        //   res.send({ success: false });
        // }

        /// End Blockchain Integration Part.
        console.log(data.url)
        res.send({ success: true, StreamingUrl: data.url, data: resData });
      } catch (err) {
        console.log(err)
        res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
      }
    } else if (streamingData.RoomState === ROOM_STATE.GOING) {
      res.send({ success: true, StreamingUrl: streamingData.StreamingUrl, data: streamingData });
    } else {
      res.send({ success: false, message: 'This streaming is not scheduled' });
    }
  } else {
    res.send({ success: false, message: 'You re not the main streamer' });
  }
};

exports.editStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, UserId, UpdatedStreamingMedia } = req.body;

  if (DocId && UserId) {
    const docSnap = await db.collection(collections.streaming).doc(DocId).get();
    await docSnap.ref.update(UpdatedStreamingMedia);

    res.send({ success: true, data: UpdatedStreamingMedia })
  } else {
    res.send({ success: false, message: 'Info is missing' });
  }
};

exports.addComment = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, UserId, Comment } = req.body;

  if (DocId && UserId) {
    const docSnap = await db.collection(collections.streaming).doc(DocId).get();

    await docSnap.ref.update({
      Comments: firebase.firestore.FieldValue.arrayUnion(Comment)
    });

    res.send({ success: true, data: Comment })
  } else {
    res.send({ success: false, message: 'Info is missing' });
  }
};

exports.getStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, UserId } = req.body;

  if (DocId && UserId) {
    const docSnap = await db.collection(collections.streaming).doc(DocId).get();
    const streamingData: any = docSnap.data();

    console.log(streamingData.StreamingUrl);
    res.send({ success: true, StreamingUrl: streamingData.StreamingUrl, data: streamingData });

  } else {
    res.send({ success: false, message: 'Info is missing' });
  }
};

/*
 ** End Video Streaming **
 
 ** Request Body **
 DocId
 UserId

 ** Response **
 success
 message

 ** **
*/

exports.getRecording = async (req: express.Request, res: express.Response) => {
  const roomName = req.query.roomNumber
  try {
    const GET_RECORDING_URL = `${RECORDING_URL}?room_name=${roomName}`
    let resp = await axios.get(GET_RECORDING_URL, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    })
    res.send({ success: true, data: resp })
  } catch (e) {
    res.send({ success: false, message: 'Failed to get recording', err: e });
  }
}

exports.endStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, UserId } = req.body;
  const docRef = await db.collection(collections.streaming).doc(DocId);
  const streamingData = (await docRef.get()).data();

  // Check the User is MainStreamer of this streaming data
  if (streamingData && UserId === streamingData?.MainStreamer) {
    // Delete Room From Daily.co
    try {
      const DELETE_ROOM_URL = `${ROOM_URL}/${streamingData.RoomName}`;
      await axios.delete(DELETE_ROOM_URL, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });
    } catch (err) {
      res.send({ success: false, message: 'Error Deleting Room in Daily' });
    }

    // Update the Streaming data
    await docRef.update({ RoomState: ROOM_STATE.COMPLETED, EndedTime: Date.now() });

    res.send({ success: true, message: 'Streaming Data Updated!' });
  } else {
    res.send({ success: false, message: 'This User is not a MainStreamer of this meeting!' });
  }
};

exports.getMeetingToken = async (req: express.Request, res: express.Response) => {
  const roomName = req.query.roomName
  const docId = req.query.docId as string;

  const docRef = await db.collection(collections.streaming).doc(docId)

  res.send({ success: true, data: docRef });
};

exports.generateMeetingToken = async (req: express.Request, res: express.Response) => {
  const roomName = req.query.roomName
  const docId = req.query.docId as string;

  try {

    let resp = await axios.post(MEETING_TOKENS_URL, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            enable_screenshare: true,
            start_cloud_recording: true
          }
        })
      },
    })

    //  persis to collection
    const docRef = await db.collection(collections.streaming).doc(docId);
    docRef.set({
      ProtectKey: resp.data
    });
    const streamingData = (await docRef.get()).data();
    res.send({ success: true, data: resp })
  } catch (e) {
    res.send({ success: false, message: 'Failed to get recording', err: e });
  }
};

exports.validateMeetingToken = async (req: express.Request, res: express.Response) => {

};

/*
 ** List Streaming **
 ** GET METHOD **
 
 ** Request Body **

 ** Response **
 success
 streamings

 ** **
*/
exports.listStreaming = async (req: express.Request, res: express.Response) => {
  try {
    const collectionRef = await db.collection(collections.streaming).get();
    let streamings = {};
    collectionRef.docs.forEach((doc) => {
      streamings[doc.id] = { ...doc.data() };
    });
    res.send({ success: true, streamings });
  } catch (err) {
    res.send({ success: false, message: 'Error in getting firestore data' });
  }
};

exports.generateProtectKey = async (req: express.Request, res: express.Response) => {
  //  generate secret key.
  try {
    let key = { data: "" };

    key.data = secretKey.create('1EEA6DC-JAM4DP2-PHVYPBN-V0XCJ9X');
    key.data = '1EEA6DC-JAM4DP2-PHVYPBN-V0XCJ9X';//temporary
    res.send({ success: true, key });
  } catch (err) {
    res.send({ success: false, message: 'Error in getting firestore data' });
  }

};

exports.validateProtectKey = async (req: express.Request, res: express.Response) => {
  const { DocId, ProtectKey } = req.body;
  try {
    let key = { data: "" };
    const docRef = await db.collection(collections.streaming).doc(DocId);
    const streamingData = (await docRef.get()).data();

    if (streamingData?.ProtectKey == ProtectKey) { // validate.
      res.send({ success: true, docRef });
    }

    res.send({ success: false, message: "Invalid Protect Key" });
  } catch (err) {
    res.send({ success: false, message: 'Error in getting firestore data' });
  }

};

exports.registerStreamingParticipant = async (req: express.Request, res: express.Response) => {
  const { DocId, UserId, ParticipantType, Room, IsAllowed } = req.body;

  try {
    const registerParticipantRef = await db.collection(collections.liveStream).add({
      UserId: UserId,
      ParticipantType: ParticipantType,
      Room
    });

    res.send({ success: true, DocId: registerParticipantRef.id });

  } catch (err) {

    res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
  }
}


// ----------------------------------- GETS -------------------------------------------
// get social pools
// exports.getSocialTokens = async (req: express.Request, res: express.Response) => {
//   try {
//     const { address, userId } = req.query;
//     const retData: any[] = [];
//     // get those social tokens which the user is the creator or has some balance
//     const blockchainRes = await coinBalance.getBalancesByType(address, collections.socialToken, 'PRIVI');
//     if (blockchainRes && blockchainRes.success) {
//       const balances = blockchainRes.output;
//       const socialSnap = await db.collection(collections.socialPools).get();
//       socialSnap.forEach((doc) => {
//         const data: any = doc.data();
//         const balance = balances[data.TokenSymbol] ? balances[data.TokenSymbol].Amount : 0;
//         if (balance || data.Creator == userId) {
//           let marketPrice = getMarketPrice(
//             data.AMM,
//             data.SupplyReleased,
//             data.InitialSupply,
//             data.TargetPrice,
//             data.TargetSupply
//           );
//           retData.push({
//             ...data,
//             MarketPrice: marketPrice,
//             UserBalance: balance,
//           });
//         }
//       });
//       res.send({ success: true, data: retData });
//     } else {
//       console.log(
//         'Error in controllers/socialController -> getSocialPools(): blockchain = false ',
//         blockchainRes.message
//       );
//       res.send({ success: false });
//     }
//   } catch (err) {
//     console.log('Error in controllers/socialController -> getSocialPools(): ', err);
//     res.send({ success: false });
//   }
// };
