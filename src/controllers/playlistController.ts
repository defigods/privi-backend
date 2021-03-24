import express from 'express';
import { db } from '../firebase/firebase';
import collections, { user } from '../firebase/collections';
import fs from "fs";

const apiKey = 'PRIVI'; //process.env.API_KEY;

exports.createPlaylist = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;
    const title = body.Title;
    const description = body.Description;
    const hasPhoto = body.HasPhoto;
    const ethMedias = body.EthMedias;
    const priviMedias = body.PriviMedias;
    db.collection(collections.playList).add({
      Creator: creator,
      HasPhoto: hasPhoto,
      Title: title,
      Description: description,
      EthMedias: ethMedias,
      PriviMedias: priviMedias
    });
    res.send({ success: true });
  } catch (e) {
    console.log('Error in controllers/playlistController -> createPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

exports.changePlaylistPhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      const playlistSnap = await db.collection(collections.playList).doc(req.file.originalname).get();
      playlistSnap.ref.update({
        HasPhoto: true,
      });
      let dir = "uploads/mediaPlaylists/" + "photos-" + req.file.originalname;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/playlistController -> changePlayListPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/playlistController -> changePlayListPhoto()",
      err
    );
    res.send({ success: false });
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
