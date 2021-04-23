import express from 'express';
import { db, firebase } from '../firebase/firebase';
import path from 'path';
import fs from 'fs';
import collections, { buyingOffers, sellingOffers, tokens, user } from '../firebase/collections';
import { updateFirebase, getRateOfChangeAsMap } from '../functions/functions';

const apiKey = 'PRIVI'; //process.env.API_KEY;

export const getMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const docRef = db.collection(collections.mediaOnCommunity).doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const existingData: any = doc.data();
      res.send({ status: true, data: { id, ...existingData } });
    } else {
      throw new Error("Not exist id");
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> getMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const createMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    if (body.media && body.pod && body.community && body.message && body.offer) {
      const newData = await db.collection(collections.mediaOnCommunity).add({
        media: body.media,
        pod: body.pod,
        community: body.community,
        message: body.message,
        oldOffers: [],
        currentOffer: body.offer
      });
      res.send({ sccess: true, data: newData.id });
    } else {
      throw new Error("All fields are required");
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> createMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const acceptMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const docRef = db.collection(collections.mediaOnCommunity).doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({
        "currentOffer.status": "Accept"
      });

      const existingData: any = doc.data();
      const response = {
        ...existingData,
        id: id,
        currentOffer: {
          ...existingData.currentOffer,
          status: "Accept"
        }
      };

      res.send({ success: true, data: response });
    } else {
      throw new Error("Not exist id");
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> acceptMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const declineMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const docRef = db.collection(collections.mediaOnCommunity).doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({
        "currentOffer.status": "Declined"
      });

      const existingData: any = doc.data();
      const response = {
        ...existingData,
        id: id,
        currentOffer: {
          ...existingData.currentOffer,
          status: "Declined"
        }
      };

      res.send({ success: true, data: response });
    } else {
      throw new Error("Not exist id");
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> declineMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const newOfferMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    if (body.from && body.offer && body.status) {
      const docRef = db.collection(collections.mediaOnCommunity).doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const existingData: any = doc.data();
        await docRef.update({
          currentOffer: {
            from: body.from,
            offer: body.offer,
            status: body.status
          },
          oldOffers: firebase.firestore.FieldValue.arrayUnion(existingData.currentOffer)
        });

        const response = {
          ...existingData,
          id: id,
          currentOffer: {
            from: body.from,
            offer: body.offer,
            status: body.status
          },
          oldOffers: [...existingData.oldOffers, existingData.currentOffer]
        };

        res.send({ success: true, data: response });
      } else {
        throw new Error('Not exist id');
      }
    } else {
      throw new Error('All fields are required');
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> newOfferMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const stopSellingMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const id = req.params.id;
    const docRef = db.collection(collections.mediaOnCommunity).doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const existingData: any = doc.data();
      const updatedOffer = {
        ...existingData.currentOffer,
        status: "Declined"
      }
      await docRef.update({
        currentOffer: {},
        oldOffers: firebase.firestore.FieldValue.arrayUnion(updatedOffer),
        stopped: true
      });

      const response = {
        ...existingData,
        id: id,
        currentOffer: {},
        oldOffers: [...existingData.oldOffers, updatedOffer],
        stopped: true
      };

      res.send({ success: true, data: response });
    } else {
      throw new Error('Not exist id');
    }
  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> stopSellingMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};
