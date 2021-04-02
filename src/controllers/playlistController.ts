import express from 'express';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import fs from 'fs';
import { generateUniqueId } from '../functions/functions';

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

    const uid = generateUniqueId();

    db.collection(collections.playList).doc(uid).set({
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

    //update user playlist list aswell
    const userSnap = await db.collection(collections.user).doc(creator).get();
    const userData: any = userSnap.data();

    let myPlaylists = [] as any;
    if (userData.myPlaylists && userData.myPlaylists.length > 0) {
      myPlaylists = [...userData.myPlaylists];
    }
    myPlaylists.push(uid);

    db.collection(collections.user).doc(creator).update({
      myPlaylists: myPlaylists,
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
      console.log('Error in controllers/playlistController -> getPlaylist()', "There's no id...");
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
      const playlists = await db.collection(collections.playList).where('Creator', '==', userId).get();
      const myPlaylists = [] as any;

      if (!playlists.empty) {
        for (const doc of playlists.docs) {
          let data = doc.data();
          data.id = doc.id;
          myPlaylists.push(data);
        }
      }

      res.status(200).send({ success: true, data: myPlaylists || [] });
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
    const body = req.body;
    const playlistIds = body.PlaylistIds;
    const chainType = body.ChainType;
    const mediaId = body.MediaId;
    const thumbnail = body.Thumbnail;

    //for each playlist
    playlistIds.forEach(async (playlistId) => {
      //update playlist
      const playlistSnap = await db.collection(collections.playList).doc(playlistId).get();
      const playlistData: any = playlistSnap.data();

      let ethMedias = playlistData.EthMedias;
      let priviMedias = playlistData.PriviMedias;
      let thumbnails = playlistData.Thumbnails;

      //add media to its respectful list
      if (chainType === 'PRIVI' && !priviMedias.includes(mediaId)) {
        priviMedias.push(mediaId);
      } else if (!ethMedias.includes(mediaId)) {
        ethMedias.push(mediaId);
      }

      //add thumbnail (if sent and list doesn't already have 4 thumbnails)
      if (thumbnails.length < 4 && thumbnail && thumbnail !== '') {
        thumbnails.push(thumbnail);
      }

      db.collection(collections.playList).doc(playlistId).update({
        EthMedias: ethMedias,
        PriviMedias: priviMedias,
        Thumbnails: thumbnails,
      });
    });

    res.status(200).send({ success: true });
  } catch (e) {
    console.log('Error in controllers/playlistController -> addToMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const removeFromMyPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const playlistId = body.PlaylistId;
    const mediaId = body.MediaId;

    //update playlist
    const playlistSnap = await db.collection(collections.playList).doc(playlistId).get();
    const playlistData: any = playlistSnap.data();

    let ethMedias = playlistData.EthMedias;
    let priviMedias = playlistData.PriviMedias;

    if (ethMedias.includes(mediaId) || priviMedias.includes(mediaId)) {
      if (ethMedias.includes(mediaId)) {
        ethMedias.splice(ethMedias.findIndex(mediaId), 1);
      } else {
        priviMedias.splice(ethMedias.findIndex(mediaId), 1);
      }

      db.collection(collections.playList).doc(playlistId).update({
        EthMedias: ethMedias,
        PriviMedias: priviMedias,
      });

      res.status(200).send({ success: true, data: {} });
    } else {
      res.status(500).send({ success: false, message: 'media not found' });
    }
  } catch (e) {
    console.log('Error in controllers/playlistController -> removeFromMyPlaylists()', e);
    res.status(500).send({ success: false, error: e });
  }
};

export const getPlaylists = async (req: express.Request, res: express.Response) => {
  try {
    const playlistsCollection = await db.collection(collections.playList).get();
    const playlists = [] as any;

    if (!playlistsCollection.empty) {
      for (const doc of playlistsCollection.docs) {
        let data = doc.data();
        data.id = doc.id;
        playlists.push(data);
      }

      res.status(200).send({ success: true, data: playlists || [] });
    } else {
      console.log('Error in controllers/playlistController -> getPlaylists()');
      res.send({ success: false, error: 'No playlists found' });
    }
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
