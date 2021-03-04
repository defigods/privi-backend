import express from 'express';
import social from '../blockchain/social';
import streaming from '../blockchain/streaming';
import {
  updateFirebase,
  getMarketPrice,
  getSellTokenAmount,
  getBuyTokenAmount,
} from '../functions/functions';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const notificationsController = require('./notificationsController');

//const apiKey = process.env.API_KEY;
const apiKey = "PRIVI";
const ORIGIN_DAILY_API_URL = "https://api.daily.co/v1";
const DAILY_API_KEY = 'dd019368c1134baba69c91b9fd6852eab5b2a38d12c61b37459f0eba9c459513';


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
      res.send({ success: true, data: { id: "" } });
    } else {
      console.log(
        'Error in controllers/streaming -> createStreaming(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/streaming -> createStreaming(): ', err);
    res.send({ success: false });
  }
}

/*
 ** Create Video Streaming **
 
 ** req.body **
 StreamingToken
 UserId
 
*/

exports.createVideoStreaming = async (req: express.Request, res: express.Response) => {
  const { StreamingToken, UserId } = req.body;
  const CREATE_ROOM_URL = `${ORIGIN_DAILY_API_URL}/rooms`;
  let dailyResponse;
  try {
    dailyResponse = await axios.post(CREATE_ROOM_URL, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
  } catch(err) {
    res.send({ success: false, message: "Error creating in room" })
  }
  const { data } = dailyResponse;

  try {
    await db.collection(collections.streaming).add({
      Completed: false,
      CountStreamers: 1,
      CountWatchers: 0,
      EndedTime: 0,
      ExpectedDuration: 10,
      Owner: UserId,
      Paused: false,
      PricePerSecond: 12,
      StartedTime: Date.now(),
      Streamers: [ UserId ],
      StreamingToken,
      StreamingUrl: data.url,
      TotalWatchers: 0,
      Video: true,
      Watchers: [],
    });
  } catch(err) {
    res.send({ success: false, message: "Error creating in firebase document"})
  }

  res.send({ success: true, streamingUrl: data.url });
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
