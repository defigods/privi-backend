import express from 'express';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import fs from 'fs';
import { generateUniqueId } from '../functions/functions';
import { MediaType } from '../services/StreamingFirebaseRepository';
//import { uploadToFirestoreBucket } from '../functions/firestore'

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

    //check if playlist exists
    const slug = await checkPlaylistAndUpdatesSlug(title.replace(/\s/g, ""));

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
      Slug: slug,
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

const checkPlaylistAndUpdatesSlug = async (slug) => {
  let existingPlaylist = await db.collection(collections.playList).where('Slug', '==', slug).get();

  if (existingPlaylist && existingPlaylist.size === 1) {
    checkPlaylistAndUpdatesSlug(slug + 1);
  } else return slug;
}

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
      const playListSnap = await db.collection(collections.playList).where('Slug', '==', playlistId).get();

      if (!playListSnap.empty && playListSnap.docs[0]) {
        let data = playListSnap.docs[0].data();
        data.id = playListSnap.docs[0].id;

        data.NumVideos = 0;
        data.NumAudios = 0;

        const priviMedias: any[] = await getPlaylistPriviMediaFunction(data.PriviMedias) ?? [];
        priviMedias.forEach((priviMedia) => {
          if (priviMedia.Type === MediaType.Audio) {
            data.NumAudios++;
          } else if (priviMedia.Type === MediaType.Video) {
            data.NumVideos++;
          }
        });

        const ethMedias: any[] = await getPlaylistEthMediaFunction(data.EthMedias) ?? [];
        ethMedias.forEach((priviMedia) => {
          if (priviMedia.type === MediaType.Audio) {
            data.NumAudios++;
          } else if (priviMedia.type === MediaType.Video) {
            data.NumVideos++;
          }
        });

        data.medias = priviMedias.concat(ethMedias) ?? [];

        res.status(200).send({ success: true, data: data })
      }
    } else {
      console.log('Error in controllers/playlistController -> getPlaylist()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (e) {
    console.log('Error in controllers/playlistController -> getPlaylist()', e);
    res.status(500).send({ success: false, error: e });
  }
};

const getPlaylistPriviMediaFunction = async (mediaIds) => {
  const playlistPriviMedias: any[] = [];

  const allMedias = await db.collection(collections.streaming).get();

  if (allMedias && allMedias.docs.length > 0) {
    allMedias.docs.forEach((snap) => {
      if (snap.exists) {
        let data = snap.data()
        if (data.MediaSymbol) {
          mediaIds.forEach((mediaId) => {
            if (mediaId === data.MediaSymbol) {
              playlistPriviMedias.push(data);
              return;
            }
          })
        }
      }
    });
  }
  return playlistPriviMedias;
};


const getPlaylistEthMediaFunction = async (medias) => {
  const playlistEthMedias: any[] = [];

  for (let ethMedia of medias) {
    let mediaRef : any;
    let mediaGet : any;
     if(ethMedia.chain && ethMedia.chain === 'wax') {
      mediaRef = db.collection(collections.waxMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(ethMedia.chain && ethMedia.chain === 'zora') {
      mediaRef = db.collection(collections.zoraMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(ethMedia.chain && ethMedia.chain === 'sorare') {
      mediaRef = db.collection(collections.sorareMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(ethMedia.chain && ethMedia.chain === 'opensea') {
      mediaRef = db.collection(collections.openseaMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(ethMedia.chain && ethMedia.chain === 'mirror') {
      mediaRef = db.collection(collections.mirrorMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(ethMedia.chain && ethMedia.chain === 'foundation') {
      mediaRef = db.collection(collections.foundationMedia).doc(ethMedia.id);
      mediaGet = await mediaRef.get();
    } else if(!ethMedia.chain) {
      mediaRef = db.collection(collections.streaming).doc(ethMedia);
      mediaGet = await mediaRef.get();
    }

    if (mediaGet.exists) {
      const media: any = mediaGet.data();
      media.id = mediaGet.id;
      playlistEthMedias.push(media);
    }
  }

  return playlistEthMedias;
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
        ethMedias.push({ id: mediaId, chain: chainType });
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


export const likePlaylist = async (req: express.Request, res: express.Response) => {
  try {
    const playlistId = req.params.playlistId;
    const body = req.body;

    if (playlistId && body.userId) {
      const playlistRef = db.collection(collections.playList).doc(playlistId);
      const playlistGet = await playlistRef.get();
      if (!playlistGet.exists) throw new Error('playlist does not exist');
      const playlist: any = playlistGet.data();

      let playlistLikes: any[] = [];
      if (playlist.Likes && playlist.Likes.length > 0) {
        playlistLikes = [...playlist.Likes];
      }

      playlistLikes.push(body.userId)

      await playlistRef.update({
        Likes: playlistLikes,
        NumLikes: playlistLikes.length,
      });

      res.send({
        success: true,
        data: {
          Likes: playlistLikes,
          NumLikes: playlistLikes.length,
        },
      });
    } else {
      console.log('Error in controllers/playlistController -> likePlaylist()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/playlistController -> likePlaylist(): ', err);
    res.send({ success: false, error: err });
  }
};

export const removeLikePlaylist = async (req: express.Request, res: express.Response) => {
  try {
    const playlistId = req.params.playlistId;
    const body = req.body;

    if (playlistId && body.userId) {
      const playlistRef = db.collection(collections.playList).doc(playlistId);
      const playlistGet = await playlistRef.get();
      if (!playlistGet.exists) throw new Error('playlist does not exist');

      const playlist: any = playlistGet.data();

      let likes: any[] = [];
      if (playlist.Likes && playlist.Likes.length > 0) {
        likes = playlist.Likes.filter((user) => user != body.userId);

        await playlistRef.update({
          Likes: likes,
          NumLikes: likes.length,
        });

      }

      res.send({
        success: true,
        data: {
          Likes: likes,
          NumLikes: likes.length || 0,
        },
      });
    } else {
      console.log('Error in controllers/playlistController -> removeLikePlaylist()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/playlistController -> removeLikePlaylist(): ', err);
    res.send({ success: false, error: err });
  }
};