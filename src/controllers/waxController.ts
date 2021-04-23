import axios, { AxiosRequestConfig } from 'axios';
import {
  updateFirebase,
  getRateOfChangeAsMap,
  getRateOfChangeAsList,
  getEmailUidMap,
  getTokenToTypeMap,
  getEmailAddressMap,
  getMarketPrice,
  getUidAddressMap,
} from '../functions/functions';
import express from 'express';
import * as WaxJS from "@waxio/waxjs/dist";

require('dotenv').config();
//const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI'; // just for now

const WAX_NODE_URL = process.env.WAX_NODE_URL || 'https://wax.greymass.com';
const PRIVI_WAX_ACCOUNT = process.env.PRIVI_WAX_ACCOUNT;
const PRIVI_WAX_PRIVATE_KEY = process.env.PRIVI_WAX_PRIVATE_KEY;


module.exports.send = async (req: express.Request, res: express.Response) => {
  try {
    if (!PRIVI_WAX_PRIVATE_KEY || !PRIVI_WAX_ACCOUNT) {
      console.log('Missing env variables - privi wax wallet');
      return res.status(500).send({ success: false});
    }

    const wax = new WaxJS.WaxJS(WAX_NODE_URL, PRIVI_WAX_ACCOUNT, [PRIVI_WAX_PRIVATE_KEY], false);

    if (!wax.api) {
      throw new Error('WAX credentials error');
    }


    const { userId, waxUserAccount, priviUserAddress, waxNetId, action, amount, tokenName, lastUpdateTimeStamp, priviTx, waxTx, random, assetId, priviUserPublicId, description, status } = req.body;

    if (!['SWAP_WAX', 'WITHDRAW_WAX'].includes(action)) {
      return res.status(400).send({ success: false, message: 'action should be either SWAP_WAX or WITHDRAW_WAX'});
    }

    const from = action === 'SWAP_WAX' ? (wax as any).userAccount : waxUserAccount;
    const receiver = action === 'SWAP_WAX' ? waxUserAccount : (wax as any).userAccount;

    const result = await wax.api.transact({
        actions: [{
          account: 'eosio',
          name: 'transfer',
          authorization: [{
            actor: (wax as any).userAccount,
            permission: 'active',
          }],
          data: {
            from,
            receiver,
            quantity: `${amount} ${tokenName}`,
            memo: description
          },
        }]
      }, {
        blocksBehind: 3,
        expireSeconds: 30
      });

    console.log('result', result);

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/waxController -> send()', err);
    res.send({ success: false });
  }
};

