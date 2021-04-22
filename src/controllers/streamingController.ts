import axios from 'axios';
import express from 'express';
import mediaPod from '../blockchain/mediaPod';
import collections from '../firebase/collections';
import { db, firebase } from '../firebase/firebase';
import { isUserValidForLiveStream, updateFirebase } from '../functions/functions';
import { dailySteamingService } from '../services/DailyStreamingService';
import { liveStreamingService } from '../services/LiveStreamingService';
const fetch = require('node-fetch');

//const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI';
const ORIGIN_DAILY_API_URL = 'https://api.daily.co/v1';
const DAILY_API_KEY = 'e93f4b9d62e8f5428297778f56bf8a9417b6a5343d0d4a961e0451c893ea8cba';

// Daily API URL
const RECORDING_URL = `${ORIGIN_DAILY_API_URL}/recordings`;

enum ROOM_STATE {
  COMPLETED = 'COMPLETED',
  SCHEDULED = 'SCHEDULED',
  GOING = 'GOING',
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

    let ERR_MSG = ''; // reusable error message placeholder for this function

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
      console.log('Error in controllers/streaming -> enterMediaLiveStreaming(): success = false.', ERR_MSG);
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
      console.log('Error in controllers/streaming -> enterMediaStreaming(): success = false.', blockchainRes.message);
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
      console.log('Error in controllers/streaming -> exitMediaStreaming(): success = false.', blockchainRes.message);
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

exports.joinStreaming = async (req: express.Request, res: express.Response) => {
  const { streamingId } = req.body;
  const userId = req.body.priviUser.id;

  const result = await liveStreamingService.joinStreaming({ streamingId, userId });

  res.send(result);
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

// TODO: Remove this endpoint - create is handled by joinStreaming
exports.createStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, isRecord, UserId, IsProtected, ProtectKey } = req.body;

  const docSnap = await db.collection(collections.streaming).doc(DocId).get();
  const streamingData = docSnap.data();

  // Check the User is MainStreamer of this streaming data
  if (streamingData && UserId === streamingData?.MainStreamer) {
    if (streamingData.RoomState === ROOM_STATE.SCHEDULED) {
      const roomName = DocId;

      let { roomUrl } = await dailySteamingService.createRoom({ roomName, enableRecording: false });

      try {
        docSnap.ref.update({
          RoomName: roomName,
          StreamingUrl: roomUrl,
          StartedTime: Date.now(),
          RoomState: ROOM_STATE.GOING,
        });
        let resData = docSnap.data();
        console.log(resData);

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

        res.send({ success: true, StreamingUrl: roomUrl, data: resData });
      } catch (err) {
        console.log(err);
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

exports.addComment = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, Comment } = req.body;

  if (DocId) {
    const mediaCollections = [
      { collection: collections.streaming, blockchain: 'Streaming' },
      { collection: collections.waxMedia, blockchain: 'WaxMedia' },
      { collection: collections.zoraMedia, blockchain: 'ZoraMedia' },
      { collection: collections.openseaMedia, blockchain: 'OpenseaMedia' },
      { collection: collections.mirrorMedia, blockchain: 'MirrorMedia' },
      { collection: collections.foundationMedia, blockchain: 'FoundationMedia' },
      { collection: collections.topshotMedia, blockchain: 'TopshotMedia' },
      { collection: collections.sorareMedia, blockchain: 'SorareMedia' },
      { collection: collections.showtimeMedia, blockchain: 'ShowtimeMedia' }
    ];

    let i, docSnap;
    for (i = 0; i < mediaCollections.length; i++) {
      docSnap = await db.collection(mediaCollections[i].collection).doc(DocId).get();
      if (docSnap.exists) {
        break;
      }
    }

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
  const roomName = req.query.roomNumber;
  try {
    const GET_RECORDING_URL = `${RECORDING_URL}?room_name=${roomName}`;
    let resp = await axios.get(GET_RECORDING_URL, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });
    res.send({ success: true, data: resp });
  } catch (e) {
    res.send({ success: false, message: 'Failed to get recording', err: e });
  }
};

exports.endStreaming = async (req: express.Request, res: express.Response) => {
  const { streamingId } = req.body;
  const userId = req.body.priviUser.id;

  return await liveStreamingService.endStreamingAsMainStreamer({ streamingId, userId });
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

exports.registerStreamingParticipant = async (req: express.Request, res: express.Response) => {
  const { DocId, UserId, ParticipantType, Room, IsAllowed } = req.body;

  try {
    const registerParticipantRef = await db.collection(collections.liveStream).add({
      UserId: UserId,
      ParticipantType: ParticipantType,
      Room,
    });

    res.send({ success: true, DocId: registerParticipantRef.id });
  } catch (err) {
    res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
  }
};

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
