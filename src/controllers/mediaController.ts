import express from 'express';
import { db, firebase } from '../firebase/firebase';
import path from 'path';
import fs from 'fs';
import collections, { user } from '../firebase/collections';
import mediaPod from '../blockchain/mediaPod';
import media from '../blockchain/media';
import fractionaliseMedia from '../blockchain/fractionaliseMedia';
import { generateUniqueId, updateFirebase } from '../functions/functions';
const FieldValue = require('firebase-admin').firestore.FieldValue;

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;


export const registerMediaView = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const mediaRef = db.collection(collections.medias).doc(body.mediaId);
    const mediaData: any = mediaRef.get();

    await mediaRef.update({
      totalViews: mediaData.totalViews ?? 0 + 1,
    });

    res.send({
      success: true,
      data: {
        totalViews: mediaData.totalViews ?? 0 + 1,
      },
    });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> sumTotalViews()', err);
    res.send({ success: false });
  }
};

export const getEthMedia = async (req: express.Request, res: express.Response) => {
  try {
    const docsSnap = (await db.collection(collections.ethMedia).get()).docs;
    const data = docsSnap.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media' });
  }
};

const MEDIA_PAGE_SIZE = 30;

export const getMedias = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body; // filters
    // pagination vars
    // const pagination: number = +req.params.pagination ?? 1;
    // const prevLastId: string = req.params.lastId ?? 'null'; // could be:  MediaName or title for scrapped media
    // const isPrevLastIdPrivi: boolean = req.params.isLastIdPrivi == "false" ? false : true;
    const pagination: number = body.pagination ?? 1;
    const prevLastId: string = body.lastId ?? 'null'; // could be:  MediaName or title for scrapped media
    const isPrevLastIdPrivi: boolean = body.isLastIdPrivi ?? true;
    // filter vars
    const blockChains = body.blockChains ?? [];
    const mediaTypes = body.mediaTypes ?? [];
    const status = body.status;
    let searchValue: string = body.searchValue ?? '';
    const collection = body.collection ?? '';
    // ret vars
    let availableSize = MEDIA_PAGE_SIZE;
    let medias: any[] = [];
    // --- PRIVI Medias ---
    // if the last media was from eth then means the privi medias are already retrieved
    if (isPrevLastIdPrivi && blockChains.includes('PRIVI')) {
      let priviMediaQuery = db.collection(collections.streaming).orderBy('MediaName', 'asc');
      if (prevLastId != 'null') {
        priviMediaQuery = priviMediaQuery.where('MediaName', '>', prevLastId);
      }
      // 1. filter with query and limit with pagination size
      if (searchValue) {
        const lastChar = String.fromCharCode(searchValue.charCodeAt(searchValue.length - 1) + 1);
        const searchValueEnd = searchValue.replace(/.$/, lastChar);
        priviMediaQuery = priviMediaQuery.where('MediaName', '>=', searchValue).where('MediaName', '<', searchValueEnd);
      }
      // 2. filter by media types
      if (mediaTypes.length < 7) {
        // otherwise means it's ALL, so no filter needed for this field
        priviMediaQuery = priviMediaQuery.where('Type', 'in', mediaTypes);
      }
      // 3. get data from query
      const mediaSnap: any = await priviMediaQuery.get();
      const docs = mediaSnap.docs ?? [];
      const now = Math.floor(Date.now() / 1000); // filtering by release date
      for (let i = 0; i < docs.length && availableSize > 0; i++) {
        const doc = docs[i];
        const data = doc.data();
        // 4. filtering by release date
        const releaseDate = data.ReleaseDate ?? 0;
        console.log(doc.id, releaseDate, now, releaseDate && releaseDate < now)
        if (releaseDate && releaseDate < now) {
          medias.push({
            id: doc.id,
            blockchain: 'PRIVI',
            ...data,
          });
          // update availabeSize
          availableSize--;
        }
      }
    }
    // -- ETH Medias --
    // convert blockchain list to lower case
    const otherBlockchainsList = blockChains.filter((blockchain) => blockchain !== 'PRIVI');
    // loop through otherBlockainsList and stop if available size runs out
    for (let i = 0; i < otherBlockchainsList.length && availableSize > 0; i++) {
      const blockchain = otherBlockchainsList[i];
      // get the current mediaCollection
      let ethMediaCollection;
      switch (blockchain) {
        case 'WAX':
          ethMediaCollection = collections.waxMedia;
          break;
        case 'Zora':
          ethMediaCollection = collections.zoraMedia;
          break;
        case 'Opensea':
          ethMediaCollection = collections.openseaMedia;
          break;
        case 'Mirror':
          ethMediaCollection = collections.mirrorMedia;
          break;
        case 'Topshot':
          ethMediaCollection = collections.topshotMedia;
          break;
        case 'Sorare':
          ethMediaCollection = collections.sorareMedia;
          break;
        case 'Foundation':
          ethMediaCollection = collections.foundationMedia;
          break;
        case 'Showtime':
          ethMediaCollection = collections.showtimeMedia;
          break;
      }
      // if it matches one of the options above then query the data
      if (ethMediaCollection) {
        let ethMediaQuery = db.collection(ethMediaCollection).orderBy('title', 'asc');
        // if last media was ETH
        if (!isPrevLastIdPrivi && prevLastId != 'null') {
          ethMediaQuery = ethMediaQuery.where('title', '>', prevLastId);
        }
        // 1. filter with query and limit with pagination size
        if (searchValue) {
          const lastChar = String.fromCharCode(searchValue.charCodeAt(searchValue.length - 1) + 1);
          const searchValueEnd = searchValue.replace(/.$/, lastChar);
          ethMediaQuery = ethMediaQuery.where('title', '>=', searchValue).where('title', '<', searchValueEnd);
        }
        // 2. filter by media types
        if (mediaTypes.length < 7) {
          // otherwise means it's ALL, so no filter needed for this field
          ethMediaQuery = ethMediaQuery.where('type', 'in', mediaTypes);
        }
        // 3. filter by collection
        if (collection) {
          ethMediaQuery = ethMediaQuery.where('collection', '==', collection);
        }
        // 4. filter by status
        if (status) {
          // empty value means no need to filter
          ethMediaQuery = ethMediaQuery.where('status', 'array-contains', status);
        }
        // 5. pagination limit
        ethMediaQuery = ethMediaQuery.limit(availableSize);
        // 6. get data from query
        const ethSnap = await ethMediaQuery.get();
        ethSnap.forEach((doc) => {
          const data = doc.data();
          medias.push({
            id: doc.id,
            blockchain: 'ETH',
            ...data,
          });
          // update availabeSize
          availableSize--;
        });
      }
    }

    // prepare return data
    let lastId = 'null';
    let isLastIdPrivi = true;
    let hasMore = medias.length == MEDIA_PAGE_SIZE;
    if (medias.length > 0) {
      isLastIdPrivi = medias[medias.length - 1].blockchain == 'PRIVI';
      if (isLastIdPrivi) lastId = medias[medias.length - 1].MediaName;
      else lastId = medias[medias.length - 1].title;
    }
    const retData = {
      data: medias,
      lastId: lastId,
      isLastIdPrivi: isLastIdPrivi,
      hasMore: hasMore,
    };
    // return data to frontend
    res.send({ success: true, ...retData });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, error: e });
  }
};

export const getMedia = async (req: express.Request, res: express.Response) => {
  try {
    const mediaId = req.params.mediaId;

    if (mediaId) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      if (mediaGet.exists) {
        res.status(200).send({ success: true, data: { ...media, id: mediaId } });
      } else {
        res.status(200).send({ success: false, error: 'Media not found' });
      }
    } else {
      res.status(200).send({ success: false, error: 'Id not provided...' });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, error: e });
  }
};

const mediaTypeFilter = (media: any, mediaTypes: string[]) => {
  return new Promise((resolve, reject) => {
    try {
      if (mediaTypes && mediaTypes.length > 0) {
        let filterMedia = mediaTypes.some((typ) => typ === media.Type);

        if (filterMedia) {
          resolve(media);
        } else {
          resolve(false);
        }
      } else {
        resolve(media);
      }
    } catch (e) {
      reject(e);
    }
  });
};

export const getEthMediaItem = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const docRef = db.collection(collections.ethMedia).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).send({ success: false, message: 'Invalid document id' });

    const data = { id: doc.id, ...doc.data() };

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media item' });
  }
};

export const changeMediaPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getDigitalArt/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeMediaAudio = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getAudio/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaPodPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaPodPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeMediaVideo = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getVideo/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaVideo()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaVideo(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeMediaBlog = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    if (req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.editorPages = body.editorPages || [];
      mediaEdited.IsUploaded = true;

      /*mediaEdited.mainHashtag = body.mainHashtag || '';
      mediaEdited.hashtags = body.hashtags || [];
      mediaEdited.schedulePost = body.schedulePost || Date.now(); // integer timestamp eg 1609424040000
      mediaEdited.description = body.description || '';
      mediaEdited.descriptionArray = body.descriptionArray || [];
      mediaEdited.author = body.author || '';
      mediaEdited.selectedFormat = body.selectedFormat || 0; // 0 story 1 wall post
      mediaEdited.hasPhoto = body.hasPhoto || false;*/
      await mediasRef.update(mediaEdited);

      res.send({ success: true, data: '/media/getBlog/:mediaId/:pagination' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaBlog()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaBlog(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeMediaBlogVideo = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.file.originalname && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      if (mediaEdited.videosId && mediaEdited.videosId.length > 0) {
        mediaEdited.videosId.push(req.file.originalname);
      } else {
        mediaEdited.videosId = [req.file.originalname];
      }

      await mediasRef.update(mediaEdited);

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaBlogVideo()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaBlogVideo(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaPhoto = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      await getMediaInternal(mediaId, '.png', 'image', res);
    } else {
      console.log('Error in controllers/mediaController -> getMediaPhoto()', "There's no id...");
      res.sendStatus(400);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getMediaPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaAudio = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      // await getMedia(mediaId, '.mp3', 'audio', res);
      const directoryPath = path.join('uploads', 'media');
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', 'audio');
      let raw = fs.createReadStream(path.join('uploads', 'media', mediaId + '.mp3'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/mediaController -> getMediaPhoto()', "There's no id...");
      res.sendStatus(400);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getMediaPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaVideo = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      await getMediaInternal(mediaId, '.mp4', 'video', res);
    } else {
      console.log('Error in controllers/mediaController -> getMediaPhoto()', "There's no id...");
      res.sendStatus(400);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getMediaPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaBlog = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    let mediaPod = req.params.mediaPod;
    let pagination = req.params.pagination;

    if (mediaId && mediaPod && pagination) {
      const mediasRef = db.collection(collections.mediaPods).doc(mediaPod).collection(collections.medias).doc(mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      res.send({
        success: true,
        data: {
          actualPage: pagination,
          totalPages: media.totalPages,
          page: media.editorPages[pagination],
        },
      });
    } else {
      console.log('Error in controllers/mediaController -> getMediaBlog()', "There's no id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getMediaBlog(): ', err);
    res.send({ success: false, error: err });
  }
};

const getMediaInternal = (mediaId: string, extension: string, type: string, res: express.Response) => {
  return new Promise((resolve, reject) => {
    try {
      const directoryPath = path.join('uploads', 'media');
      console.log('path', directoryPath);
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        console.log('files in getMedia');
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', type);
      let raw = fs.createReadStream(path.join('uploads', 'media', mediaId + extension));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
};

export const editMedia = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod && params.mediaId && body.media) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.media.Creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if (body.media.SavedCollabs && body.media.SavedCollabs.length > 0) {
        if (media.SavedCollabs && media.SavedCollabs.length > 0) {
          let newCollabs: any[] = [];
          for (let bodyCollab of body.media.SavedCollabs) {
            let isInBD: boolean = false;
            for (let mediaCollab of media.SavedCollabs) {
              if (bodyCollab.id === mediaCollab.id) {
                isInBD = true;
              }
            }
            if (!isInBD) {
              newCollabs.push(bodyCollab);
            }
          }

          for (let collab of newCollabs) {
            await notificationsController.addNotification({
              userId: collab.id,
              notification: {
                type: 104,
                typeItemId: 'user',
                itemId: body.media.Creator,
                follower: user.firstName,
                pod: params.mediaPod,
                comment: '',
                token: params.mediaId,
                amount: '',
                onlyInformation: false,
                otherItemId: mediasGet.id,
              },
            });
          }
        } else {
          for (let collab of body.media.SavedCollabs) {
            await notificationsController.addNotification({
              userId: collab.id,
              notification: {
                type: 104,
                typeItemId: 'user',
                itemId: body.media.Creator,
                follower: user.firstName,
                pod: params.mediaPod,
                comment: '',
                token: params.mediaId,
                amount: '',
                onlyInformation: false,
                otherItemId: mediasGet.id,
              },
            });
          }
        }
      }

      await mediasRef.update(body.media);

      res.send({ success: true, data: body.media });
    } else {
      console.log('Error in controllers/mediaController -> editMedia()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> editMedia()', err);
    res.send({ success: false, error: err });
  }
};

export const removeCollab = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod && params.mediaId && body.RemovedCollab && body.Creator) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.Creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if (body.RemovedCollab.status === 'Accepted') {
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;

        const collabs = body.Collabs;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.updateCollabs(podAddress, mediaSymbol, collabs, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
          updateFirebase(blockchainRes);

          await notificationsController.addNotification({
            userId: body.RemovedCollab.id,
            notification: {
              type: 107,
              typeItemId: 'user',
              itemId: body.Creator,
              follower: user.firstName,
              pod: params.mediaPod,
              comment: '',
              token: params.mediaId,
              amount: '',
              onlyInformation: false,
              otherItemId: mediasGet.id,
            },
          });
        } else {
          console.log('Error in controllers/mediaPodController -> removeCollab(): ', blockchainRes.message);
          res.send({ success: false, error: blockchainRes.message });
          return;
        }
      } else {
        const userCollabRef = db.collection(collections.user).doc(body.RemovedCollab.id);
        const userCollabGet = await userCollabRef.get();
        const userCollab: any = userCollabGet.data();

        let notificationIndex = userCollab.notifications.findIndex(
          (not) => not.type === 104 && not.pod === media.MediaSymbol
        );

        if (notificationIndex !== -1) {
          await notificationsController.removeNotification({
            userId: body.RemovedCollab.id,
            notificationId: userCollab.notifications[notificationIndex].id,
          });
        }
      }

      let collabIndex = media.SavedCollabs.findIndex((collab) => collab.id === body.RemovedCollab.id);
      media.SavedCollabs.splice(collabIndex, 1);

      let sumShare: number = 0;
      for (let collab of media.SavedCollabs) {
        if (collab.id !== body.Creator) {
          sumShare += collab.share;
        }
      }

      if (sumShare < 100) {
        let creatorIndex = media.SavedCollabs.findIndex((coll) => coll.id === body.Creator);
        let usr = {
          firstName: user.firstName,
          id: body.Creator,
          share: 100 - sumShare,
          status: 'Creator',
        };
        if (creatorIndex === -1) {
          media.SavedCollabs.push(usr);
        } else {
          media.SavedCollabs[creatorIndex] = usr;
        }
      }

      await mediasRef.update(media);

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> removeCollab()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> removeCollab()', err);
    res.send({ success: false, error: err });
  }
};

export const refuseCollab = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId,
      });

      if (media.SavedCollabs && media.SavedCollabs.length > 0) {
        let collabIndex = media.SavedCollabs.findIndex((collab) => collab.id === body.userId);
        if (media.SavedCollabs[collabIndex].status === 'Requested') {
          media.SavedCollabs.splice(collabIndex, 1);
          await mediasRef.update(media);

          await notificationsController.addNotification({
            userId: body.creator,
            notification: {
              type: 105,
              typeItemId: 'user',
              itemId: body.userId,
              follower: user.firstName,
              pod: params.mediaPod,
              comment: '',
              token: params.mediaId,
              amount: '',
              onlyInformation: false,
              otherItemId: mediasGet.id,
            },
          });
        }
      } else {
        console.log('Error in controllers/mediaController -> refuseCollab()', 'Missing data');
        res.send({ success: false, error: 'Collab status was not Pending' });
        return;
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> refuseCollab()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> refuseCollab()', err);
    res.send({ success: false, error: err });
  }
};

export const acceptCollab = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId,
      });

      if (media.SavedCollabs && media.SavedCollabs.length > 0) {
        let collabIndex = media.SavedCollabs.findIndex((collab) => collab.id === body.userId);
        if (media.SavedCollabs[collabIndex].status === 'Requested') {
          let mediaCopy = { ...media };
          mediaCopy.SavedCollabs[collabIndex].status = 'Accepted';
          await mediasRef.update(mediaCopy);

          await notificationsController.addNotification({
            userId: body.creator,
            notification: {
              type: 106,
              typeItemId: 'user',
              itemId: body.userId,
              follower: user.firstName,
              pod: params.mediaPod,
              comment: media.SavedCollabs,
              token: params.mediaId,
              amount: '',
              onlyInformation: false,
              otherItemId: mediasGet.id,
            },
          });
          res.send({ success: true, data: mediaCopy });
        } else {
          console.log('Error in controllers/mediaController -> acceptCollab()', 'Collab status was not Requested');
          res.send({ success: false, error: 'Collab status was not Requested' });
        }
      }
    } else {
      console.log('Error in controllers/mediaController -> acceptCollab()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> acceptCollab()', err);
    res.send({ success: false, error: err });
  }
};

export const signTransactionAcceptCollab = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let collabIndex = media.SavedCollabs.findIndex((collab) => collab.id === body.userId);
      if (media.SavedCollabs[collabIndex] && media.SavedCollabs[collabIndex].status === 'Accepted') {
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;

        const collabs = body.Collabs;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.updateCollabs(podAddress, mediaSymbol, collabs, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
          console.log(blockchainRes);
          updateFirebase(blockchainRes);

          await notificationsController.removeNotification({
            userId: body.userId,
            notificationId: body.notificationId,
          });

          res.send({ success: true });
        } else {
          console.log('Error in controllers/mediaPodController -> removeCollab(): ', blockchainRes.message);
          res.send({ success: false, error: blockchainRes.message });
        }
      } else {
        console.log('Error in controllers/mediaController -> refuseCollab()', 'Collab status was not Accepted');
        res.send({ success: false, error: 'Collab status was not Accepted' });
      }
    } else {
      console.log('Error in controllers/mediaController -> refuseCollab()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> refuseCollab()', err);
    res.send({ success: false, error: err });
  }
};

export const changeMediaMainPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(req.params.mediaPod)
        .collection(collections.medias)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.HasPhoto = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaMainPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaMainPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaMainPhoto = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      const directoryPath = path.join('uploads', 'mediaMainPhoto', mediaId);
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          //console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'mediaMainPhoto', mediaId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/mediaController -> getMediaMainPhoto()', "There's no id...");
      res.sendStatus(400);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getMediaMainPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const getUserMediaInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    if (userId) {
      const mediaUserGet = await db.collection(collections.mediaUsers).where('user', '==', userId).get();

      if (!mediaUserGet.empty) {
        let userData: any = { ...mediaUserGet.docs[0].data() };
        userData.docId = mediaUserGet.docs[0].id;

        res.send({
          success: true,
          data: userData,
        });
      } else {
        console.log('Error in controllers/mediaController -> getUserMediaInfo()', 'User not found...');
        res.sendStatus(400);
        res.send({ success: false });
      }
    } else {
      console.log('Error in controllers/mediaController -> getUserMediaInfo()', "There's no id...");
      res.sendStatus(400);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getUserMediaInfo(): ', err);
    res.send({ success: false, error: err });
  }
};

export const fractionalizeMedia = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if (params && body && params.mediaPod) {
      const mediasRef = db
        .collection(collections.mediaPods)
        .doc(params.mediaPod)
        .collection(collections.medias)
        .doc(body.mediaId);

      // To send notification after fractionalizing if necessary (tweak fields!)
      // await notificationsController.addNotification({
      //   userId: params.mediaId,
      //   notification: {
      //     type: "",
      //     typeItemId: 'user',
      //     itemId: body.media.Creator,
      //     follower: user.firstName,
      //     pod: params.mediaPod,
      //     comment: '',
      //     token: params.mediaId,
      //     amount: '',
      //     onlyInformation: false,
      //     otherItemId: mediasGet.id,
      //   },
      // });

      await mediasRef.update({
        Fractionalized: true,
        FractionalizeInfo: {
          Fraction: body.fraction,
          FractionPrice: body.fractionPrice,
          FractionPriceToken: body.fractionPriceToken,
          BuyBackPrice: body.buyBackPrice,
          BuyBackPriceToken: body.buyBackPriceToken,
          InterestRate: body.interestRate,
        },
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> fractionalizeMedia()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> fractionalizeMedia()', err);
    res.send({ success: false, error: err });
  }
};

export const likeMedia = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    let body = req.body;

    if (mediaId && body.userId) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      let likes: any[] = [];
      if (media.Likes && media.Likes.length > 0) {
        likes = [...media.Likes];
      }

      let likeIndex = likes.findIndex((user) => user === body.userId);
      if (likeIndex === -1) {
        likes.push(body.userId);
      }

      await mediaRef.update({
        Likes: likes,
        NumLikes: likes.length,
      });

      const userSnap = await db.collection(collections.user).doc(body.userId).get();
      const userData: any = userSnap.data();

      await notificationsController.addNotification({
        userId: media.Requester,
        notification: {
          type: 108,
          typeItemId: 'user',
          itemId: body.userId,
          follower: userData.firstName,
          pod: '',
          comment: '',
          token: mediaId,
          amount: 0,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      if (media.Collabs && media.Collabs !== {}) {
        let collabs: any[] = Object.keys(media.Collabs);

        for (let collab of collabs) {
          await notificationsController.addNotification({
            userId: collab,
            notification: {
              type: 108,
              typeItemId: 'user',
              itemId: body.userId,
              follower: userData.firstName,
              pod: '',
              comment: '',
              token: mediaId,
              amount: 0,
              onlyInformation: false,
              otherItemId: '',
            },
          });
        }
      }

      res.send({
        success: true,
        data: {
          Likes: likes,
          NumLikes: likes.length,
        },
      });
    } else {
      console.log('Error in controllers/mediaController -> likeMedia()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> likeMedia(): ', err);
    res.send({ success: false, error: err });
  }
};

export const removeLikeMedia = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    let body = req.body;

    if (mediaId && body.userId) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      let likes: any[] = [];
      if (media.Likes && media.Likes.length > 0) {
        likes = [...media.Likes];
        let likeIndex = likes.findIndex((user) => user === body.userId);
        if (likeIndex !== -1) {
          likes.splice(likeIndex, 1);
        }

        await mediaRef.update({
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
      console.log('Error in controllers/mediaController -> removeLikeMedia()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> removeLikeMedia(): ', err);
    res.send({ success: false, error: err });
  }
};

export const shareMedia = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    let body = req.body;

    if (mediaId && body.userId && body.Users) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      mediaRef.update({ shareCount: FirebaseFirestore.FieldValue.increment(1) });
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      const userSnap = await db.collection(collections.user).doc(body.userId).get();
      const userData: any = userSnap.data();

      let mappingShare: any = {};
      for (let usr of body.Users) {
        mappingShare[usr] = {
          Saw: false,
          Paid: false,
        };

        await notificationsController.addNotification({
          userId: usr,
          notification: {
            type: 110,
            typeItemId: 'user',
            itemId: body.userId,
            follower: userData.firstName,
            pod: '',
            comment: '',
            token: mediaId,
            amount: 0,
            onlyInformation: false,
            otherItemId: '',
          },
        });
      }

      const shareMediaRef = db
        .collection(collections.streaming)
        .doc(mediaId)
        .collection(collections.shareStreaming)
        .doc(body.userId);
      const shareMediaGet = await shareMediaRef.get();

      if (shareMediaGet.exists) {
        const shareMedia: any = shareMediaGet.data();

        let sharedUser: any = { ...shareMedia };
        let shareKeys = Object.keys(mappingShare);
        for (let usrShared of shareKeys) {
          if (!sharedUser || !sharedUser[usrShared] || sharedUser[usrShared] === {}) {
            sharedUser[usrShared] = mappingShare[usrShared];
          }
        }
        await shareMediaRef.update(sharedUser);
      } else {
        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.set(
            db.collection(collections.streaming).doc(mediaId).collection(collections.shareStreaming).doc(body.userId),
            mappingShare
          );
        });
      }

      await notificationsController.addNotification({
        userId: media.Requester,
        notification: {
          type: 109,
          typeItemId: 'user',
          itemId: body.userId,
          follower: userData.firstName,
          pod: '',
          comment: '',
          token: mediaId,
          amount: 0,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      if (media.Collabs && media.Collabs !== {}) {
        let collabs: any[] = Object.keys(media.Collabs);

        for (let collab of collabs) {
          await notificationsController.addNotification({
            userId: collab,
            notification: {
              type: 109,
              typeItemId: 'user',
              itemId: body.userId,
              follower: userData.firstName,
              pod: '',
              comment: '',
              token: mediaId,
              amount: 0,
              onlyInformation: false,
              otherItemId: '',
            },
          });
        }
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> likeMedia()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> likeMedia(): ', err);
    res.send({ success: false, error: err });
  }
};

export const shareMediaToSocial = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    if (mediaId) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      if (mediaRef) {
        await mediaRef.update({ shareCount: FieldValue.increment(1) });
        res.send({ success: true });
      } else {
        console.log('Error in controllers/mediaController -> shareMediaToSocial()', "There's no document...");
        res.send({ success: false, error: "There's no document..." });
      }
    } else {
      console.log('Error in controllers/mediaController -> shareMediaToSocial()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> shareMediaToSocial(): ', err);
    res.send({ success: false, error: err });
  }
};

export const addOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const communityAddress = body.CommunityAddress;
    const paymentDate = body.PaymentDate;
    const token = body.Token;
    const amount = body.Amount;
    const status = body.Status;

    db.collection(collections.mediaPods)
      .doc(podAddress)
      .collection(collections.medias)
      .doc(mediaSymbol)
      .collection(collections.communityMarketings)
      .doc(communityAddress)
      .set({
        PaymentDate: paymentDate,
        Token: token,
        Amount: amount,
        Status: status,
      });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/mediaController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

export const changeOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const action = body.Action;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const communityAddress = body.CommunityAddress;
    const token = body.Token;
    const amount = body.Amount;
    switch (action) {
      case 'DELETE':
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.communityMarketings)
          .doc(communityAddress)
          .delete();
        break;
      case 'PENDING':
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.communityMarketings)
          .doc(communityAddress)
          .update({
            Status: 'PENDING',
            Token: token,
            Amount: amount,
          });
        break;
      case 'DECLINE':
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.communityMarketings)
          .doc(communityAddress)
          .update({
            Status: 'DECLINED',
          });
        break;
      case 'ACCEPT':
        db.collection(collections.mediaPods)
          .doc(podAddress)
          .collection(collections.medias)
          .doc(mediaSymbol)
          .collection(collections.communityMarketings)
          .doc(communityAddress)
          .update({
            Status: 'ACCEPTED',
          });
        const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
        const data: any = communitySnap.data();
        const marketingMedia = data.MarketingMedia ?? [];
        if (!marketingMedia.find((mediaObj) => mediaObj.MediaSymbol && mediaObj.MediaSymbol == mediaSymbol)) {
          marketingMedia.push({
            PodAddress: podAddress,
            MediaSymbol: mediaSymbol,
          });
        }
        communitySnap.ref.update({
          MarketingMedia: marketingMedia,
        });
        break;
    }
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/mediaController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

export const signTransactionAcceptOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
  } catch (err) {
    console.log('Error in controllers/mediaController -> signTransactionAcceptOffer()', err);
    res.send({ success: false, error: err });
  }
};

export const createChatMarketingMediaCommunities = (mediaSymbol, communityId, mediaCreatorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const mediaRef = db.collection(collections.streaming).doc(mediaSymbol);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      const communityRef = db.collection(collections.community).doc(communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let collabs = Object.keys(media.Collabs);

      let users: any[] = [];

      const creatorSnap = await db.collection(collections.user).doc(mediaCreatorId).get();
      const creatorData: any = creatorSnap.data();

      if (creatorSnap.exists) {
        users.push({
          type: 'Media Creator',
          userId: mediaCreatorId,
          userName: creatorData.firstName,
          userConnected: false,
          lastView: Date.now(),
        });
      }

      for (let collab of collabs) {
        const userSnap = await db.collection(collections.user).doc(collab).get();
        const userData: any = userSnap.data();

        if (userSnap.exists) {
          users.push({
            type: 'Media Collab',
            userId: collab,
            userName: userData.firstName,
            userConnected: false,
            lastView: null,
          });
        }
      }

      const creatorCommunitySnap = await db.collection(collections.user).doc(community.Creator).get();
      const creatorCommunityData: any = creatorCommunitySnap.data();

      users.push({
        type: 'Community Creator',
        userId: mediaCreatorId,
        userName: creatorCommunityData.firstName,
        userConnected: false,
        lastView: null,
      });

      if (creatorCommunityData.Admins && creatorCommunityData.Admins.length > 0) {
        let arrayFiltered = creatorCommunityData.Admins.filter((admin) => admin.status === 'Accepted');
        if (arrayFiltered && arrayFiltered.length > 0) {
          for (let communityAdmin of arrayFiltered) {
            const userSnap = await db.collection(collections.user).doc(communityAdmin.userId).get();
            const userData: any = userSnap.data();
            users.push({
              type: 'Community Admin',
              userId: communityAdmin.userId,
              userName: userData.firstName,
              userConnected: false,
              lastView: null,
            });
          }
        }
      }

      let obj: any = {
        name: media.MediaName + ' & ' + community.Name,
        users: users,
        mediaId: media.MediaSymbol,
        communityId: communityGet.id,
        created: Date.now(),
        lastMessage: null,
        lastMessageDate: null,
        messages: [],
      };

      await db
        .collection(collections.marketingMediaCommunityChat)
        .doc(media.MediaSymbol + communityGet.id)
        .set(obj);

      let dir = 'uploads/marketingMediaCommunity/' + media.MediaSymbol + communityGet.id;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      obj.id = media.MediaSymbol + communityGet.id;
      resolve(obj);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

export const getChatsMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const mediaId = req.params.mediaId;
    const userId = req.params.userId;

    let isAllowed = await checkIfHasPermissions(userId, mediaId);

    if (isAllowed) {
      const allChats: any[] = [];
      const marketingMediaCommunityChatSnap = await db
        .collection(collections.marketingMediaCommunityChat)
        .where('mediaId', '==', mediaId)
        .get();
      marketingMediaCommunityChatSnap.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        allChats.push(data);
      });

      let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

      res.send({
        success: true,
        data: sortChats,
      });
    } else {
      console.log('Error in controllers/mediaController -> getChatsMediaMarketing()', 'Non permissions');
      res.send({ success: false, error: 'Non permissions' });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsMediaMarketing()', err);
    res.send({ success: false, error: err });
  }
};

const checkIfHasPermissions = (userId: string, mediaId: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      let arrayCollabs: any[] = Object.keys(media.Collabs);

      console.log(
        media,
        userId,
        media.Requester === userId,
        media.MainStreamer === userId,
        arrayCollabs.some((collab) => collab === userId)
      );

      if (
        media.Requester === userId ||
        media.MainStreamer === userId ||
        arrayCollabs.some((collab) => collab === userId)
      ) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (e) {
      reject(e);
    }
  });
};

export const getChatsCommunityMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const communityId = req.params.communityId;
    const userId = req.params.userId;

    const allChats: any[] = [];
    const marketingMediaCommunityChatSnap = await db
      .collection(collections.marketingMediaCommunityChat)
      .where('communityId', '==', communityId)
      .get();
    marketingMediaCommunityChatSnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allChats.push(data);
    });

    let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

    res.send({
      success: true,
      data: sortChats,
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsCommunityMarketing()', err);
    res.send({ success: false, error: err });
  }
};

export const getMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const mediaId = req.params.mediaId;
    const podAddress = req.params.podAddress;

    const allMarketing: any[] = [];
    const marketingMediaCommunitySnap = await db
      .collection(collections.mediaPods)
      .doc(podAddress)
      .collection(collections.medias)
      .doc(mediaId)
      .collection(collections.communityMarketings)
      .get();
    marketingMediaCommunitySnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allMarketing.push(data);
    });

    // let sortMarketing = allMarketing.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

    res.send({
      success: true,
      data: allMarketing,
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsMediaMarketing()', err);
    res.send({ success: false, error: err });
  }
};

export const getCommunityMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const communityId = req.params.communityId;

    const allChats: any[] = [];
    const marketingMediaCommunityChatSnap = await db
      .collection(collections.marketingMediaCommunityChat)
      .where('communityId', '==', communityId)
      .get();
    marketingMediaCommunityChatSnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allChats.push(data);
    });

    let sortChats = allChats.sort((a, b) => (b.created > a.created ? 1 : a.created > b.created ? -1 : 0));

    res.send({
      success: true,
      data: sortChats,
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsCommunityMarketing()', err);
    res.send({ success: false, error: err });
  }
};

export const createChatMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    let mediaId = req.params.mediaId;
    let communityId = req.params.communityId;

    if (userId && mediaId && communityId) {
      let chat = await createChatMediaMarketingFunction(userId, mediaId, communityId);

      res.send({
        success: true,
        data: chat,
      });
    } else {
      console.log('Error in controllers/mediaController -> createChatMediaMarketing(): Missing info');
      res.send({
        success: false,
        error: 'Error in controllers/mediaController -> createChatMediaMarketing(): Missing info',
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> createChatMediaMarketing() ' + e);
    res.send({
      success: false,
      error: 'Error in controllers/mediaController -> createChatMediaMarketing() ' + e,
    });
  }
};

export const createChatMediaMarketingFunction = (userId, mediaId, communityId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let room: string = mediaId + communityId;

      const chatQuery = await db.collection(collections.marketingMediaCommunityChat).doc(room).get();
      if (!chatQuery.exists) {
        let data: any = chatQuery.data();
        data.id = chatQuery.id;
        resolve(data);
      } else {
        let users: any[] = [];

        const mediaRef = db.collection(collections.streaming).doc(mediaId);
        const mediaGet = await mediaRef.get();
        const media: any = mediaGet.data();

        const requesterSnap = await db.collection(collections.user).doc(media.Requester).get();
        const requesterData: any = requesterSnap.data();

        users.push({
          type: 'Media Creator',
          userId: media.Requester,
          userName: requesterData.firstName,
          userConnected: false,
          lastView: null,
        });

        let arrayCollabs: any[] = Object.keys(media.Collabs);

        for (let collab of arrayCollabs) {
          const userSnap = await db.collection(collections.user).doc(collab).get();
          const userData: any = userSnap.data();

          users.push({
            type: 'Media Collab',
            userId: collab,
            userName: userData.firstName,
            userConnected: false,
            lastView: null,
          });
        }

        const communitySnap = await db.collection(collections.community).doc(communityId).get();
        const communityData: any = communitySnap.data();

        const creatorSnap = await db.collection(collections.user).doc(communityData.Creator).get();
        const creatorData: any = creatorSnap.data();

        users.push({
          type: 'Community Creator',
          userId: communityData.Creator,
          userName: creatorData.firstName,
          userConnected: false,
          lastView: null,
        });

        if (communityData.Admins && communityData.Admins.length > 0) {
          let admins = communityData.Admins.filter((admin) => admin.status === 'Accepted');

          for (let admin of admins) {
            const userSnap = await db.collection(collections.user).doc(admin.userId).get();
            const userData: any = userSnap.data();

            users.push({
              type: 'Community Admin',
              userId: admin.userId,
              userName: userData.firstName,
              userConnected: false,
              lastView: null,
            });
          }
        }

        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.marketingMediaCommunityChat).doc(room), {
            users: users,
            created: Date.now(),
            room: room,
            lastMessage: null,
            lastMessageDate: null,
            messages: [],
            mediaId: mediaId,
            communityId: communityId,
          });
        });
        resolve({
          users: users,
          created: Date.now(),
          room: room,
          lastMessage: null,
          lastMessageDate: null,
          messages: [],
          mediaId: mediaId,
          mediaName: media.MediaName,
          communityId: communityId,
          communityName: communityData.Name,
        });
      }
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

export const getMessagesMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    let mediaId = req.params.mediaId;
    let communityId = req.params.communityId;

    if (userId && mediaId && communityId) {
      const chatQuery = await db
        .collection(collections.marketingMediaCommunityChat)
        .doc(mediaId + communityId)
        .get();
      let messages: any[] = [];

      if (chatQuery.exists) {
        let data = chatQuery.data();

        if (data && data.messages && data.messages.length > 0) {
          for (let i = 0; i < data.messages.length; i++) {
            const messageGet = await db
              .collection(collections.marketingMediaCommunityMessage)
              .doc(data.messages[i])
              .get();
            messages.push(messageGet.data());

            if (i === data.messages.length - 1) {
              res.status(200).send({
                success: true,
                data: messages,
              });
            }
          }
        } else {
          res.status(200).send({
            success: true,
            data: messages,
          });
        }
      } else {
        res.status(200).send({
          success: false,
          error: 'Error in controllers/mediaController -> getMessagesMediaMarketing(): Wrong Chat Room Provided',
        });
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/mediaController -> getMessagesMediaMarketing(): Non Chat Room Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> getMessagesMediaMarketing()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> getMessagesMediaMarketing():' + e,
    });
  }
};

export const lastViewMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body.userId && body.room) {
      const marketingMediaCommunitySnap = await db
        .collection(collections.marketingMediaCommunityChat)
        .doc(body.room)
        .get();
      if (marketingMediaCommunitySnap.exists) {
        let data: any = marketingMediaCommunitySnap.data();

        let users = [...data.users];
        let userIndex = users.findIndex((usr) => usr.userId === body.userId);
        if (userIndex !== -1) {
          users[userIndex].lastView = Date.now();
          await db.collection(collections.marketingMediaCommunityChat).doc(body.room).update({
            users: users,
          });
        }
      }

      const marketingMediaCommunityMessageSnap = await db
        .collection(collections.marketingMediaCommunityMessage)
        .where('chatId', '==', body.room)
        .get();

      if (!marketingMediaCommunityMessageSnap.empty) {
        for (const doc of marketingMediaCommunityMessageSnap.docs) {
          let data = doc.data();
          let seenArray: any[] = [...data.seen] || [];

          let notSaw = seenArray.findIndex((see) => see !== body.userId);
          if (notSaw === -1) {
            seenArray.push(body.userId);

            db.collection(collections.marketingMediaCommunityMessage).doc(doc.id).update({
              seen: seenArray,
            });
          }
        }
      }
      res.status(200).send({ success: true });
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/mediaController -> lastViewMediaMarketing(): Non Chat Room Provided',
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> lastViewMediaMarketing()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> lastViewMediaMarketing():' + e,
    });
  }
};

export const createMedia = async (req: express.Request, res: express.Response) => {
  try {
    /* ---- AN EXAMPLE OF THE BODY ------
      {
        Data: {
            "CreatorAddress": "0xeec9c9550b46cc865dc550bc17097fb7653a82f8",
            "MediaName": "Music Video",
            "MediaSymbol": "MVD10",
            "ViewConditions": {
                "ViewingType": "DYNAMIC",
                "ViewingToken": "USDT",
                "Price": "0.00009",
                "IsStreamingLive": false,
                "IsRecord": true,
            },
            "NftConditions": {
                "Copies": 1,
                "Royalty": "10",
                "Price": "200",
                "NftToken": "USDT"
            },
            "Type": "AUDIO",
            "ReleaseDate": 0,
            "SharingPct": "10"
        };
        ExtraInfo: {
          HasPhoto,
          Description,
          PricingMethod,
          Hashtags,
          Content,  // only blog or blog snap
          Playlist  // only playlist
        },
        Hash
      }
    */
    const body = req.body;
    const data = body.Data;
    const hash = body.Hash; // not used for now

    const creatorAddress = data.CreatorAddress;
    const mediaName = data.MediaName;
    const mediaSymbol = data.MediaSymbol;

    const viewConditions = data.ViewConditions;
    const viewingType = viewConditions.ViewingType;
    const viewingToken = viewConditions.ViewingToken; // USDT, ETH ...
    const viewPrice = viewConditions.Price;
    const isStreamingLive = viewConditions.IsStreamingLive;
    const isRecord = viewConditions.IsRecord;

    const nftConditions = data.NftConditions;
    const copies = nftConditions.Copies;
    const royalty = nftConditions.Royalty;
    const nftPrice = nftConditions.Price;
    const nftToken = nftConditions.NftToken; // USDT, ETH ...

    const type = data.Type;
    const releaseDate = data.ReleaseDate;
    const sharingPct = data.SharingPct;

    // additional info that needs to be stored
    const extraInfo = body.ExtraInfo;
    const creatorId = body.CreatorId;
    const hasPhoto = extraInfo.HasPhoto ?? false;
    const MediaDescription = extraInfo.MediaDescription ?? '';
    const pricingMethod = extraInfo.PaymentType ?? 'Fixed'; // Fixed or Streaming
    const hashtags = extraInfo.Hashtags ?? [];
    const content = extraInfo.Content ?? ''; // only for Blog and Blog Snap type

    const blockchainRes = await media.createMedia(
      creatorAddress,
      mediaName,
      mediaSymbol,
      viewingType,
      viewingToken,
      viewPrice,
      isStreamingLive,
      isRecord,
      /*streamingProportions,*/ copies,
      royalty,
      nftPrice,
      nftToken,
      type,
      releaseDate,
      sharingPct,
      apiKey
    );

    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      // add transaction data inside media
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.streaming)
          .doc(mediaSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      // add extra info in media doc
      const extraData: any = {
        HasPhoto: hasPhoto,
        MediaDescription: MediaDescription,
        PricingMethod: pricingMethod,
        Hashtags: hashtags,
        CreatorId: creatorId
      };
      if (type === 'BLOG' || type === 'BLOG_SNAP') {
        extraData.Content = content;
      } else if (type === 'LIVE_AUDIO_TYPE' || type === 'LIVE_VIDEO_TYPE') {
        extraData.RoomState = 'SCHEDULED';
        extraData.CountStreamers = 0;
        extraData.CountWatchers = 0;
        extraData.ExpectedDuration = 0;
        extraData.MainStreamer = creatorId;
        extraData.RoomName = mediaName.replace(/\s/g, '');
        extraData.StartedTime = 0;
        extraData.EndedTime = 0;
        extraData.StreamingToken = '';
        extraData.StreamingUrl = '';
        extraData.TotalWatchers = 0;
        extraData.Video = type === 'LIVE_VIDEO_TYPE';
        extraData.Watchers = [];
        extraData.OnlineModerators = [];
        extraData.Moderators = [];
        extraData.OnlineStreamers = [];
        extraData.Streamers = [];
        extraData.LimitedEdition = [];
        extraData.PriceType = '';
        extraData.Price = 0;
        extraData.StartingTime = 0;
        extraData.EndingTime = 0;
        extraData.Rewards = '';
      }
      db.collection(collections.streaming)
        .doc(mediaSymbol)
        .update({ ...extraData, QuickCreation: true });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> createMedia()' + blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.error,
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> createMedia()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> createMedia():' + e,
    });
  }
};

export const buyMediaNFT = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const hash = body.Hash; // not used for now

    const mediaSymbol = data.MediaSymbol;
    const address = data.Address;

    const blockchainRes = await media.buyMediaNFT(mediaSymbol, address, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.streaming)
          .doc(mediaSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
    } else {
      console.log('Error in controllers/mediaController -> buyMediaNFT()' + blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.error,
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> buyMediaNFT()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> buyMediaNFT():' + e,
    });
  }
};

export const openNFT = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const hash = body.Hash; // not used for now

    const mediaSymbol = data.MediaSymbol;
    const address = data.Address;
    const sharingId = data.SharingId;

    const blockchainRes = await media.openNFT(mediaSymbol, address, sharingId, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.streaming)
          .doc(mediaSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> buyMediaNFT()' + blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.error,
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> buyMediaNFT()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> buyMediaNFT():' + e,
    });
  }
};

export const closeNFT = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data = body.Data;
    const hash = body.Hash; // not used for now

    const mediaSymbol = data.MediaSymbol;
    const address = data.Address;

    const blockchainRes = await media.closeNFT(mediaSymbol, address, apiKey);
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updateTxns = output.Transactions;
      let tid = '';
      let txnArray: any = [];
      for ([tid, txnArray] of Object.entries(updateTxns)) {
        db.collection(collections.streaming)
          .doc(mediaSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> closeNFT()' + blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.error,
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> closeNFT()' + e);
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> closeNFT():' + e,
    });
  }
};

export const rateMedia = async (req: express.Request, res: express.Response) => {
  try {
    console.log(req.body);
    const { mediaId, userId, ratingType, ratingValue } = req.body;

    if (mediaId && userId) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      if (mediaGet.exists) {
        if (media.Rating) {
          let isUpdated = false;
          let ratings = [...media.Rating];
          ratings = ratings.map((item) => {
            if (item.userId === userId) {
              isUpdated = true;
              let rateItem = { ...item };
              rateItem[ratingType] = ratingValue;
              return rateItem;
            }
            return item;
          });

          if (isUpdated === false) {
            let newRate = { userId: userId };
            newRate[ratingType] = ratingValue;
            ratings.push(newRate);
          }
          await mediaRef.update({ Rating: ratings });
        } else {
          let ratings = [{ userId: userId }];
          ratings[0][ratingType] = ratingValue;
          await mediaRef.update({ Rating: ratings });
        }

        res.status(200).send({ success: true });
      } else {
        res.status(200).send({ success: false, error: 'Media not found' });
      }
    } else {
      res.status(200).send({ success: false, error: 'Id not provided...' });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, error: e });
  }
}

// ------------------ FRACTIONALISE ------------------

export const fractionalise = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const tokenSymbol = body.TokenSymbol;
    const ownerAddress = body.OwnerAddress;
    const fraction = body.Fraction;
    const buyBackPrice = body.BuyBackPrice;
    const initialPrice = body.InitialPrice;
    const fundingToken = body.FundingToken;
    const interestRate = body.InterestRate;

    const hash = body.Hash;
    const signature = body.Signature;
    console.log(body);
    const blockchainRes = await fractionaliseMedia.fractionalise(tokenSymbol, ownerAddress, fraction, buyBackPrice,
      initialPrice, fundingToken, interestRate, hash, signature, apiKey);
    console.log(JSON.stringify(blockchainRes), null, 4);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/media -> fractionalise()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/mediaController -> fractionalise()', err);
    res.send({ success: false });
  }
};

export const newBuyOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const amount = body.Amount;
    const price = body.Price;
    const token = body.Token;
    const tokenSymbol = body.TokenSymbol;
    const bAddress = body.BAddress;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.newBuyOrder(amount, price, token, tokenSymbol, bAddress, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> newBuyOrder()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> newBuyOrder()', err);
    res.send({ success: false });
  }
};

export const newSellOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const amount = body.Amount;
    const price = body.Price;
    const token = body.Token;
    const tokenSymbol = body.TokenSymbol;
    const sAddress = body.SAddress;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.newSellOrder(amount, price, token, tokenSymbol, sAddress, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> newSellOrder()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> newSellOrder()', err);
    res.send({ success: false });
  }
};

export const deleteBuyOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const orderId = body.OrderId;
    const requesterAddress = body.RequesterAddress;
    const tokenSymbol = body.TokenSymbol;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.deleteBuyOrder(orderId, requesterAddress, tokenSymbol, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> deleteBuyOrder()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> deleteBuyOrder()', err);
    res.send({ success: false });
  }
};

export const deleteSellOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const orderId = body.OrderId;
    const requesterAddress = body.RequesterAddress;
    const tokenSymbol = body.TokenSymbol;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.deleteSellOrder(orderId, requesterAddress, tokenSymbol, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> deleteSellOrder()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> deleteSellOrder()', err);
    res.send({ success: false });
  }
};

export const buyFraction = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const tokenSymbol = body.TokenSymbol;
    const sAddress = body.SAddress;
    const orderId = body.OrderId;
    const amount = body.Amount;
    const buyerAddress = body.BuyerAddress;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.buyFraction(tokenSymbol, sAddress, orderId, amount, buyerAddress, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> buyFraction()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> buyFraction()', err);
    res.send({ success: false });
  }
};

export const sellFraction = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const tokenSymbol = body.TokenSymbol;
    const bAddress = body.BAddress;
    const orderId = body.OrderId;
    const amount = body.Amount;
    const sellerAddress = body.SellerAddress;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await fractionaliseMedia.sellFraction(tokenSymbol, bAddress, orderId, amount, sellerAddress, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.fractionalise)
          .doc(tokenSymbol)
          .collection(collections.transactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ sucess: true });
    }
    else {
      console.log('Error in controllers/mediaController -> sellFraction()', blockchainRes.message);
      res.send({
        success: false,
        error: blockchainRes.message
      })
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> sellFraction()', err);
    res.send({ success: false });
  }
}

export const changeQuickMediaPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.streaming)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getDigitalArt/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeQuickMediaAudio = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.streaming)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getAudio/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaPodPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaPodPhoto(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeQuickMediaVideo = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.streaming)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.IsUploaded = true;

      await mediasRef.update(mediaEdited);
      res.send({ success: true, data: '/media/getVideo/:mediaId' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaVideo()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaVideo(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeQuickMediaBlog = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    if (req.file && req.params && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.streaming)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      mediaEdited.editorPages = body.editorPages || [];
      mediaEdited.IsUploaded = true;

      /*mediaEdited.mainHashtag = body.mainHashtag || '';
      mediaEdited.hashtags = body.hashtags || [];
      mediaEdited.schedulePost = body.schedulePost || Date.now(); // integer timestamp eg 1609424040000
      mediaEdited.description = body.description || '';
      mediaEdited.descriptionArray = body.descriptionArray || [];
      mediaEdited.author = body.author || '';
      mediaEdited.selectedFormat = body.selectedFormat || 0; // 0 story 1 wall post
      mediaEdited.hasPhoto = body.hasPhoto || false;*/
      await mediasRef.update(mediaEdited);

      res.send({ success: true, data: '/media/getBlog/:mediaId/:pagination' });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaBlog()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaBlog(): ', err);
    res.send({ success: false, error: err });
  }
};

export const changeQuickMediaBlogVideo = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaId) {
      const mediasRef = db
        .collection(collections.streaming)
        .doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = { ...media };
      if (mediaEdited.videosId && mediaEdited.videosId.length > 0) {
        mediaEdited.videosId.push(req.file.originalname);
      } else {
        mediaEdited.videosId = [req.file.originalname];
      }

      await mediasRef.update(mediaEdited);

      res.send({ success: true });
    } else {
      console.log('Error in controllers/mediaController -> changeMediaBlogVideo()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> changeMediaBlogVideo(): ', err);
    res.send({ success: false, error: err });
  }
};