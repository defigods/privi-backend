import express from 'express';
import { db, firebase } from '../firebase/firebase';
import path from 'path';
import fs from 'fs';
import collections, { buyingOffers, sellingOffers, tokens, user } from '../firebase/collections';
import { updateFirebase, getRateOfChangeAsMap } from '../functions/functions';

const apiKey = 'PRIVI'; //process.env.API_KEY;

export const getMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> getMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const createMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> createMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const acceptMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> acceptMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const declineMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> declineMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const newOfferMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> newOfferMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};

export const stopSellingMediaOnCommunity = async (req: express.Request, res: express.Response) => {
  try {

  } catch (err) {
    console.log('Error in controllers/mediaOnCommunityController -> stopSellingMediaOnCommunity()', err);
    res.send({ success: false, error: err });
  }
};
