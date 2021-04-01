import express from 'express';
import { db } from '../firebase/firebase';
import collections, { user } from '../firebase/collections';
import fs from 'fs';

const apiKey = 'PRIVI'; //process.env.API_KEY;

export const createPlaylist = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;
    const title = body.Title;
    const description = body.Description;
    const priv = body.Private;
    const token = priv === true ? body.Token : '';
    const price = priv === true ? body.Price : 0;
    db.collection(collections.playList).add({
      Creator: creator,
      Private: priv,
      Title: title,
      Description: description,
      Price: price,
      Token: token,
      EthMedias: [],
      PriviMedias: [],
      Thumbnails: [],
    });
    res.send({ success: true });
  } catch (e) {
    console.log('Error in controllers/playlistController -> createPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const changePlaylistPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const playlistSnap = await db.collection(collections.playList).doc(req.file.originalname).get();
      playlistSnap.ref.update({
        HasPhoto: true,
      });
      let dir = 'uploads/mediaPlaylists/' + 'photos-' + req.file.originalname;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/playlistController -> changePlayListPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/playlistController -> changePlayListPhoto()', err);
    res.send({ success: false });
  }
};

export const getPlaylist = async (req: express.Request, res: express.Response) => {
  try {
    let playlistId = req.params.playListId;

    if (playlistId) {
      const playListSnap = await db.collection(collections.playList).doc(playlistId).get();
      const playListData: any = playListSnap.data();

      res.status(200).send({ success: true, data: { ...playListData, id: playlistId } });
    } else {
      console.log('Error in controllers/playlistController -> getPlaylists()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (e) {
    console.log('Error in controllers/playlistController -> getPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const getMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    if (userId) {
      const userSnap = await db.collection(collections.user).doc(userId).get();
      const userData: any = userSnap.data();

      res.status(200).send({ success: true, data: userData.MyPlaylists || [] });
    } else {
      console.log('Error in controllers/playlistController -> getMyPlaylists()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (e) {
    console.log('Error in controllers/playlistController -> getMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const addToMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> addToMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const removeFromMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> removeFromMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const getPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> getPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const sharePlayList = async (req: express.Request, res: express.Response) => {
  try {
    res.status(200).send({ success: true, data: {} });
  } catch (e) {
    console.log('Error in controllers/playlistController -> sharePlayList()', e);
    res.status(500).send({ success: false, error: e });
  }
};
