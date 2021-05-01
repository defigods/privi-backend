import express from 'express';
import { updateFirebase, saveTransactions } from '../functions/functions';
import auction from '../blockchain/auction';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;

export const createAuction = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const mediaSymbol = data.MediaSymbol;
    const tokenSymbol = data.TokenSymbol;
    const owner = data.Owner;
    const bidIncrement = data.BidIncrement;
    const startTime = data.StartTime;
    // const startTime = Math.floor(Date.now()/1000)+10;
    const endTime = data.EndTime;
    const ipfHash = data.IpfHash;

    const blockchainRes = await auction.createAuction(
      mediaSymbol,
      tokenSymbol,
      owner,
      bidIncrement,
      startTime,
      endTime,
      ipfHash,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.streaming).doc(mediaSymbol).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/auctionController -> createAuction()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/auctionController -> createAuction()', err);
    res.send({ success: false });
  }
};

export const placeBid = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const mediaSymbol = data.MediaSymbol;
    const tokenSymbol = data.TokenSymbol;
    const owner = data.Owner;
    const address = data.Address; // bidder address
    const amount = data.Amount;

    const blockchainRes = await auction.placeBid(mediaSymbol, tokenSymbol, owner, address, amount, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.streaming).doc(mediaSymbol).collection(collections.transactions),
        blockchainRes
      );
      // add bid to history
      await db.collection(collections.streaming).doc(mediaSymbol).collection(collections.bidHistory).add({
        date: Date.now(),
        bidderAddress: address,
        price: amount,
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/auctionController -> placeBid()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/auctionController -> placeBid()', err);
    res.send({ success: false });
  }
};

export const cancelAuction = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const mediaSymbol = data.MediaSymbol;
    const tokenSymbol = data.TokenSymbol;
    const owner = data.Owner;

    const blockchainRes = await auction.cancelAuction(mediaSymbol, tokenSymbol, owner, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.streaming).doc(mediaSymbol).collection(collections.transactions),
        blockchainRes
      );
      // remove auctions field from doc
      const mediaSnap = await db.collection(collections.streaming).doc(mediaSymbol).get();
      const mediaData: any = mediaSnap.data();
      delete mediaData.Auctions;
      await mediaSnap.ref.update(mediaData);
      res.send({ success: true });
    } else {
      console.log('Error in controllers/auctionController -> cancelAuction()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/auctionController -> cancelAuction()', err);
    res.send({ success: false });
  }
};

export const withdrawAuction = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const mediaSymbol = data.MediaSymbol;
    const tokenSymbol = data.TokenSymbol;
    const owner = data.Owner;

    const blockchainRes = await auction.withdrawAuction(mediaSymbol, tokenSymbol, owner, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      saveTransactions(
        db.collection(collections.streaming).doc(mediaSymbol).collection(collections.transactions),
        blockchainRes
      );
      res.send({ success: true });
    } else {
      console.log('Error in controllers/auctionController -> withdrawAuction()', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/auctionController -> withdrawAuction()', err);
    res.send({ success: false });
  }
};

export const getAuctionTransactions = async (req: express.Request, res: express.Response) => {
  try {
    const mediaSymbol: any = req.query.mediaSymbol;
    if (!mediaSymbol) {
      console.log('mediaSymbol empty');
      res.send({ success: false });
    }
    const retData: any[] = [];
    const snap = await db
      .collection(collections.streaming)
      .doc(mediaSymbol)
      .collection(collections.transactions)
      .get();
    snap.forEach(doc => {
      const data: any = doc.data();
      const txns = data.Transactions ?? [];
      txns.forEach(txn => {
        const type = txn.Type;
        if (type.toLowerCase().includes('place-bid')) retData.push(txn);
      });
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/auctionController -> getAuctionTransactions()', err);
    res.send({ success: false });
  }
};
