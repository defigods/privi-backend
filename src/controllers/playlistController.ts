import express from 'express';
import { db } from '../firebase/firebase';
import collections, { user } from '../firebase/collections';

const apiKey = 'PRIVI'; //process.env.API_KEY;

exports.createPlaylist = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> createPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.getPlaylist = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> getPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.getPlaylists = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> getPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.sharePlayList = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> sharePlayList()', e);
    res.status(500).send({ success: false, error: e });
  }
};
