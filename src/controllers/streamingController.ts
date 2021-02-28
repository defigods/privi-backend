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
const notificationsController = require('./notificationsController');

//const apiKey = process.env.API_KEY;
const apiKey = "PRIVI"


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
