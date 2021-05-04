import express from 'express';
import { updateFirebase, saveTransactions, addZerosToHistory, getRateOfChangeAsMap } from '../functions/functions';
import exchange from '../blockchain/exchange';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import cron from "node-cron";

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;

export const createExchange = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const mediaSymbol = body.MediaSymbol;
    const data = body.Data;
    const address = data.Address;
    const exchangeToken = data.ExchangeToken;
    const initialAmount = data.InitialAmount;
    const offerToken = data.OfferToken;
    const price = data.Price;

    const mediaSnap = await db.collection(collections.streaming).doc(mediaSymbol).get();
    if (mediaSnap.exists) {
      const blockchainRes = await exchange.createExchange(
        address,
        exchangeToken,
        initialAmount,
        offerToken,
        price,
        apiKey
      );
      if (blockchainRes && blockchainRes.success) {
        await updateFirebase(blockchainRes);
        const output = blockchainRes.output;
        const exchangeId = Object.keys(output.Exchanges ?? {})[0] ?? '';
        // save txns
        saveTransactions(
          db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
          blockchainRes
        );
        // add exchangeId to media Exchange list
        const mediaData: any = mediaSnap.data();
        const exchange = mediaData.Exchange ?? [];
        exchange.push(exchangeId);
        await mediaSnap.ref.update({ Exchange: exchange });
        // add zeros to price history
        addZerosToHistory(db.collection(collections.exchange).doc(exchangeId).collection(collections.priceHistory), 'price');
        res.send({ success: true });
      } else {
        console.log('Error in controllers/exchangeController -> createExchange()', blockchainRes.message);
        res.send({ success: false });
      }
    } else {
      console.log('Error in controllers/exchangeController -> createExchange() media doesnt exist');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> createExchange()', err);
    res.send({ success: false });
  }
};

export const placeBuyingOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const address = data.Address;
    const amount = data.Amount;
    const price = data.Price;
    const offerToken = data.OfferToken;
    const blockchainRes = await exchange.placeBuyingOffer(exchangeId, address, amount, price, offerToken, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> placeBuyingOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> placeBuyingOffer()', err);
    res.send({ success: false });
  }
};

export const placeSellingOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const address = data.Address;
    const amount = data.Amount;
    const price = data.Price;
    const offerToken = data.OfferToken;

    const blockchainRes = await exchange.placeSellingOffer(exchangeId, address, amount, price, offerToken, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> placeSellingOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> placeSellingOffer()', err);
    res.send({ success: false });
  }
};

export const buyFromOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const offerId = data.OfferId;
    const address = data.Address;
    const amount = data.Amount;

    const blockchainRes = await exchange.buyFromOffer(exchangeId, offerId, address, amount, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      // user purchased media from sale page
      if (offerId == exchangeId) db.collection(collections.exchange).doc(exchangeId).update({Status: 'Sold', NewOwnerAddress: address});
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> buyFromOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> buyFromOffer()', err);
    res.send({ success: false });
  }
};

export const sellFromOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const offerId = data.OfferId;
    const address = data.Address;
    const amount = data.Amount;

    let offerCreatorAddress;
    const offerSnap = await db.collection(collections.exchange).doc(exchangeId).collection(collections.offers).doc(offerId).get();
    const offerData = offerSnap.data();
    if (offerData) offerCreatorAddress = offerData.CreatorAddress;

    const blockchainRes = await exchange.sellFromOffer(exchangeId, offerId, address, amount, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      // creator sold media to buying offer
      db.collection(collections.exchange).doc(exchangeId).update({Status: 'Sold', NewOwnerAddress: offerCreatorAddress ?? ''});
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> sellFromOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> sellFromOffer()', err);
    res.send({ success: false });
  }
};

export const cancelBuyingOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const offerId = data.OfferId;
    const address = data.Address;
    const blockchainRes = await exchange.cancelBuyingOffer(exchangeId, offerId, address, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      db.collection(collections.exchange)
        .doc(exchangeId)
        .collection(collections.offers)
        .doc(offerId)
        .delete();
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> cancelBuyingOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> cancelBuyingOffer()', err);
    res.send({ success: false });
  }
};

export const cancelSellingOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const exchangeId = data.ExchangeId;
    const offerId = data.OfferId;
    const address = data.Address;
    const blockchainRes = await exchange.cancelSellingOffer(exchangeId, offerId, address, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      db.collection(collections.exchange)
        .doc(exchangeId)
        .collection(collections.offers)
        .doc(offerId)
        .delete();
      // main selling offer cancelled (media sale cancelled)
      if (offerId == exchangeId) db.collection(collections.exchange).doc(exchangeId).update({Status: 'Cancelled'});
      saveTransactions(
        db.collection(collections.exchange).doc(exchangeId).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/exchangeController -> cancelSellingOffer()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/exchangeController -> cancelSellingOffer()', err);
    res.send({ success: false });
  }
};

export const getBuyingOffers = async (req: express.Request, res: express.Response) => {
  try {
    const exchangeId = req.params.exchangeId;
    if (!exchangeId) {
      console.log('No exchangeId provided');
      res.send({success:false});
    }
    const retData:any[] = [];
    const historySnap = await db.collection(collections.exchange).doc(exchangeId).collection(collections.offers).get();
    historySnap.forEach(doc => {
      const data:any = doc.data();
      if (data.Type == 'BUY') retData.push(data)
    });
    res.send({success: true, data: retData});
  } catch (err) {
    console.log('Error in controllers/exchangeController -> getPriceHistory()', err);
    res.send({ success: false });
  }
};

export const getPriceHistory = async (req: express.Request, res: express.Response) => {
  try {
    const exchangeId = req.params.exchangeId;
    if (!exchangeId) {
      console.log('No exchangeId provided');
      res.send({success:false});
    }
    const retData:any[] = [];
    const historySnap = await db.collection(collections.exchange).doc(exchangeId).collection(collections.priceHistory).get();
    historySnap.forEach(doc => retData.push(doc.data()));
    res.send({success: true, data: retData});
  } catch (err) {
    console.log('Error in controllers/exchangeController -> getPriceHistory()', err);
    res.send({ success: false });
  }
};


//////////////////////// CRONS ////////////////////////

// save the highest price among the offers made in that day
exports.storeDailyBuyOfferPrice = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Exchange Controller storeDailyBuyOfferPrice() cron job started *********');
    const exchangesSnap = await db.collection(collections.exchange).get();
    const rateOfChange = await getRateOfChangeAsMap();
    for (const exchangeDoc of exchangesSnap.docs) {
      let highestPrice = 0; // in initial selling offer token
      const exchangeData:any = exchangeDoc.data();
      const initialOfferToken = exchangeData.OfferToken;
      const offersSnap = await exchangeDoc.ref.collection(collections.offers).get();
      offersSnap.forEach(offerDoc => {
        const offerData = offerDoc.data();
        if (offerData && offerData.Type == 'BUY') {
          const date = offerData.Date;  // sec
          const currDate = Math.floor(Date.now()/1000);
          const lastDayDate = currDate - (24*3600);
          const offerPrice = offerData.Price ?? 0;
          const offerToken = offerData.OfferToken;
          let rate = 1;
          if (offerToken && initialOfferToken && rateOfChange[initialOfferToken] && rateOfChange[offerToken]) rate = rateOfChange[offerToken]/rateOfChange[initialOfferToken];
          if (date <= currDate && date >= lastDayDate) {
            const offerConvertedPrice = offerPrice*rate;
            highestPrice = Math.max(offerConvertedPrice, highestPrice); 
          }
        }
      });
      exchangeDoc.ref.collection(collections.priceHistory).add({price: highestPrice, date: Date.now()});
    }
  } catch (err) {
    console.log(err);
  }
});