import express from 'express';
import social from '../blockchain/social';
import streaming from '../blockchain/streaming';
import { updateFirebase, getMarketPrice, getSellTokenAmount, getBuyTokenAmount } from '../functions/functions';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

//const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI';
const ORIGIN_DAILY_API_URL = 'https://api.daily.co/v1';
const DAILY_API_KEY = 'dd019368c1134baba69c91b9fd6852eab5b2a38d12c61b37459f0eba9c459513';

// Daily API URL
const ROOM_URL = `${ORIGIN_DAILY_API_URL}/rooms`;

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

// user stakes in a token
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

    const blockchainRes = await streaming.createStreaming(
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
      res.send({ success: true, data: { id: '' } });
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
 ** Schedule Video Streaming **
 
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
 
 ** Response **
  success: API call succeed or not
  docId: Firebase document id

 ** **
*/

exports.scheduleVideoStreaming = async (req: express.Request, res: express.Response) => {
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
      Video: true,
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
    });
    res.send({ success: true, DocId: collectionRef.id });
  } catch (err) {
    res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
  }
};

/*
 ** Create Video Streaming **
 
 ** Request Body **
 DocId
 UserId
 
 ** Response **
 success: API call succeed or not
 streamingUrl: Daily Streaming URL which users can join

 ** **
*/

exports.createVideoStreaming = async (req: express.Request, res: express.Response) => {
  // Get the document from Firestore
  const { DocId, UserId } = req.body;
  const docRef = await db.collection(collections.streaming).doc(DocId);
  const streamingData = (await docRef.get()).data();

  // Check the User is MainStreamer of this streaming data
  if (streamingData && UserId === streamingData?.MainStreamer) {
    if (streamingData.RoomState === ROOM_STATE.SCHEDULED) {
      let dailyResponse;
      try {
        dailyResponse = await axios.post(
          ROOM_URL,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${DAILY_API_KEY}`,
            },
          }
        );
      } catch (err) {
        res.send({ success: false, message: ERROR_MSG.DAILY_ERROR });
      }

      const { data } = dailyResponse;

      try {
        await docRef.update({
          RoomName: data.name,
          StreamingUrl: data.url,
          StartedTime: Date.now(),
          RoomState: ROOM_STATE.GOING,
        });
        let resData = (await docRef.get()).data();
        res.send({ success: true, StreamingUrl: data.url, data: resData });
      } catch (err) {
        res.send({ success: false, message: ERROR_MSG.FIRESTORE_ERROR });
      }
    } else {
      res.send({ success: false, message: 'This streaming is not scheduled' });
    }
  } else {
    res.send({ success: false, message: ERROR_MSG.PERMISSION_ERROR });
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

exports.endVideoStreaming = async (req: express.Request, res: express.Response) => {
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
    const streamings = collectionRef.docs.map((doc) => {
      return {
        [doc.id]: doc.data(),
      };
    });

    res.send({ success: true, streamings });
  } catch (err) {
    res.send({ success: false, message: 'Error in getting firestore data' });
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
