import express from 'express';
import { updateFirebase } from '../functions/functions';
import exchange from '../blockchain/exchange';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;

export const createExchange = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const address = data.Address;
    const exchangeToken = data.ExchangeToken;
    const initialAmount = data.InitialAmount;
    const offerToken = data.OfferToken;
    const price = data.Price;
    
    const blockchainRes = await exchange.createExchange(address, exchangeToken, initialAmount, offerToken, price, apiKey);
    if (blockchainRes && blockchainRes.success) {
        updateFirebase(blockchainRes);
        const output = blockchainRes.output;
        const transactions = output.Transactions;
        const exchangeId = Object.keys(output.Exchanges ?? {})[0] ?? '';
        if (exchangeId) {
            let tid = '';
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.exchange)
                .doc(exchangeId)
                .collection(collections.transactions)
                .doc(tid)
                .set({ Transactions: txnArray });
            }
        }
        res.send({success: true});
    }
    else {
        console.log('Error in controllers/exchangeController -> createExchange()', blockchainRes.message);
        res.send({success: false});
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> createExchange()', err);
    res.send({ success: false });
  }
};
