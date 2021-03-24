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

exports.getMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> getMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.addToMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> addToMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.removeFromMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {

    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> removeFromMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.getPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    let playlistId = req.params.playListId;

    if(playlistId) {
      const playListSnap = await db.collection(collections.playList).doc(playlistId).get();
      const playListData : any = playListSnap.data();

      res.status(200).send({ success: true, data: playListData });

    } else {
      console.log('Error in controllers/playlistController -> getPlaylists()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
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
