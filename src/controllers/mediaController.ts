import express from 'express';
import { db } from '../firebase/firebase';
import path from 'path';
import fs from 'fs';
import collections, { user } from '../firebase/collections';
import mediaPod from '../blockchain/mediaPod';
import { generateUniqueId, updateFirebase } from '../functions/functions';

const notificationsController = require('./notificationsController');
const apiKey = 'PRIVI'; //process.env.API_KEY;

exports.getEthMedia = async (req: express.Request, res: express.Response) => {
  try {
    const docsSnap = (await db.collection(collections.ethMedia).get()).docs;
    const data = docsSnap.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media' });
  }
};

exports.getMedias = async (req: express.Request, res: express.Response) => {
  try {
    const pagination: number = +req.params.pagination;

    let body = req.body;

    let medias: any[] = [];
    let dataMedias: any[] = [];
    let dataEthMedia: any[] = [];

    // Blockchain & SearchValue filters
    if (body.blockChains && body.blockChains.length > 0) {
      let findBlockchainPRIVI = body.blockChains.find(block => block === 'PRIVI');
      let findBlockchainOthers = body.blockChains.filter(block => block !== 'PRIVI');
      let mediaTypes = body.mediaTypes;

      if (findBlockchainPRIVI) {
        const docsMediasSnap = (await db.collection(collections.streaming).get()).docs;
        let dataMediasSnap = docsMediasSnap.map((docSnap) => {
          let data = docSnap.data();
          data.id = docSnap.id;
          data.blockchain = 'PRIVI';
          return (data);
        });

        for (let media of dataMediasSnap) {
          // Searched Value
          if (body.searchValue != '') {
            if ((media.MediaName && media.MediaName.toLowerCase().includes(body.searchValue.toLowerCase())) ||
              (media.MediaSymbol && media.MediaSymbol.toLowerCase().includes(body.searchValue.toLowerCase()))) {

              let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
              if (applyTypeFilter && media.Type && media.Type !== '') {
                dataMedias.push(media);
              }
            }
          } else {
            let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
            if (applyTypeFilter && media.Type && media.Type !== '') {
              dataMedias.push(media);
            }
          }
        }

      }

      if (findBlockchainOthers && findBlockchainOthers.length > 0) {
        const docsEthMediaSnap = (await db.collection(collections.ethMedia).get()).docs;
        let dataEthMediaSnap = docsEthMediaSnap.map((docSnap) => {
          let data = docSnap.data();
          data.id = docSnap.id;
          return (data);
        });

        for (let media of dataEthMediaSnap) {
          // Searched Value
          if (body.searchValue != '') {
            if (media.title.toLowerCase().includes(body.searchValue.toLowerCase())) {
              // Blockchain
              for (let block of findBlockchainOthers) {
                if (media.tag === block) {
                  let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
                  if (applyTypeFilter) {
                    dataEthMedia.push(media);
                  }
                }
              }
            }
          } else {
            // Blockchain
            for (let block of findBlockchainOthers) {
              if (media.tag === block) {
                let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
                if (applyTypeFilter) {
                  dataEthMedia.push(media);
                }
              }
            }
          }
        }
      }
    }

    // medias = dataMedias.concat(dataEthMedia).slice(pagination * 10, (pagination+1) * 10);
    medias = dataEthMedia.concat(dataMedias).slice(pagination * 10, (pagination + 1) * 10);

    return res.status(200).send({ success: true, data: medias });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, error: e });
  }
};

exports.getMedia = async (req: express.Request, res: express.Response) => {
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
}

exports.getEthMediaItem = async (req: express.Request, res: express.Response) => {
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

exports.changeMediaPhoto = async (req: express.Request, res: express.Response) => {
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

exports.changeMediaAudio = async (req: express.Request, res: express.Response) => {
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

exports.changeMediaVideo = async (req: express.Request, res: express.Response) => {
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

exports.changeMediaBlog = async (req: express.Request, res: express.Response) => {
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
      mediaEdited.mainHashtag = body.mainHashtag || '';
      mediaEdited.hashtags = body.hashtags || [];
      mediaEdited.schedulePost = body.schedulePost || Date.now(); // integer timestamp eg 1609424040000
      mediaEdited.description = body.description || '';
      mediaEdited.descriptionArray = body.descriptionArray || [];
      mediaEdited.author = body.author || '';
      mediaEdited.selectedFormat = body.selectedFormat || 0; // 0 story 1 wall post
      mediaEdited.hasPhoto = body.hasPhoto || false;
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

exports.changeMediaBlogVideo = async (req: express.Request, res: express.Response) => {
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

exports.getMediaPhoto = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      await getMedia(mediaId, '.png', 'image', res);
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

exports.getMediaAudio = async (req: express.Request, res: express.Response) => {
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

exports.getMediaVideo = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;

    if (mediaId) {
      await getMedia(mediaId, '.mp4', 'video', res);
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

exports.getMediaBlog = async (req: express.Request, res: express.Response) => {
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

const getMedia = (mediaId: string, extension: string, type: string, res: express.Response) => {
  return new Promise((resolve, reject) => {
    try {
      const directoryPath = path.join('uploads', 'media');
      console.log('path', directoryPath)
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

exports.editMedia = async (req: express.Request, res: express.Response) => {
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

exports.removeCollab = async (req: express.Request, res: express.Response) => {
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

exports.refuseCollab = async (req: express.Request, res: express.Response) => {
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

exports.acceptCollab = async (req: express.Request, res: express.Response) => {
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

exports.signTransactionAcceptCollab = async (req: express.Request, res: express.Response) => {
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

exports.changeMediaMainPhoto = async (req: express.Request, res: express.Response) => {
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

exports.getMediaMainPhoto = async (req: express.Request, res: express.Response) => {
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

exports.getUserMediaInfo = async (req: express.Request, res: express.Response) => {
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

exports.likeMedia = async (req: express.Request, res: express.Response) => {
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
        NumLikes: likes.length
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
        success: true, data: {
          Likes: likes,
          NumLikes: likes.length
        }
      });
    } else {
      console.log('Error in controllers/mediaController -> likeMedia()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> likeMedia(): ', err);
    res.send({ success: false, error: err });
  }
}

exports.removeLikeMedia = async (req: express.Request, res: express.Response) => {
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
          NumLikes: likes.length
        });
      }

      res.send({
        success: true, data: {
          Likes: likes,
          NumLikes: likes.length || 0
        }
      });
    } else {
      console.log('Error in controllers/mediaController -> removeLikeMedia()', "There's no id...");
      res.send({ success: false, error: "There's no id..." });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> removeLikeMedia(): ', err);
    res.send({ success: false, error: err });
  }
}

exports.shareMedia = async (req: express.Request, res: express.Response) => {
  try {
    let mediaId = req.params.mediaId;
    let body = req.body;

    if (mediaId && body.userId && body.Users) {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      const userSnap = await db.collection(collections.user).doc(body.userId).get();
      const userData: any = userSnap.data();

      let mappingShare: any = {};
      for (let usr of body.Users) {
        mappingShare[usr] = {
          Saw: false,
          Paid: false
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

      const shareMediaRef = db.collection(collections.streaming).doc(mediaId)
        .collection(collections.shareStreaming).doc(body.userId);
      const shareMediaGet = await shareMediaRef.get();

      if (shareMediaGet.exists) {
        const shareMedia: any = shareMediaGet.data();

        let sharedUser: any = { ...shareMedia };
        let shareKeys = Object.keys(mappingShare);
        for (let usrShared of shareKeys) {
          if (!sharedUser || !sharedUser[usrShared] || sharedUser[usrShared] === {}) {
            sharedUser[usrShared] = mappingShare[usrShared]
          }
        }
        await shareMediaRef.update(sharedUser)

      } else {
        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.set(db.collection(collections.streaming).doc(mediaId)
            .collection(collections.shareStreaming).doc(body.userId), mappingShare);
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
}

exports.addOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const communityAddress = body.CommunityAddress;
    const paymentDate = body.PaymentDate;
    const token = body.Token;
    const amount = body.Amount;
    const status = body.Status;

    db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol).collection(collections.communityMarketings).doc(communityAddress).set({
      PaymentDate: paymentDate,
      Token: token,
      Amount: amount,
      Status: status
    });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/mediaController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

exports.changeOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const action = body.Action;
    const podAddress = body.PodAddress;
    const mediaSymbol = body.MediaSymbol;
    const communityAddress = body.CommunityAddress;
    const token = body.Token;
    const amount = body.Amount;
    switch (action) {
      case "DELETE":
        db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol).collection(collections.communityMarketings).doc(communityAddress).delete();
        break;
      case "PENDING":
        db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol).collection(collections.communityMarketings).doc(communityAddress).update({
          Status: 'PENDING',
          Token: token,
          Amount: amount,
        });
        break;
      case "DECLINE":
        db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol).collection(collections.communityMarketings).doc(communityAddress).update({
          Status: 'DECLINED'
        });
        break;
      case "ACCEPT":
        db.collection(collections.mediaPods).doc(podAddress).collection(collections.medias).doc(mediaSymbol).collection(collections.communityMarketings).doc(communityAddress).update({
          Status: 'ACCEPTED'
        });
        const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
        const data: any = communitySnap.data();
        const marketingMedia = data.MarketingMedia ?? [];
        if (!marketingMedia.find((mediaObj) => mediaObj.MediaSymbol && mediaObj.MediaSymbol == mediaSymbol)) {
          marketingMedia.push({
            PodAddress: podAddress,
            MediaSymbol: mediaSymbol
          });
        }
        communitySnap.ref.update({
          MarketingMedia: marketingMedia
        })
        break;
    }
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/mediaController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

exports.signTransactionAcceptOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;



  } catch (err) {
    console.log('Error in controllers/mediaController -> signTransactionAcceptOffer()', err);
    res.send({ success: false, error: err });
  }
};

const createChatMarketingMediaCommunities = exports.createChatMarketingMediaCommunities = (mediaSymbol, communityId, mediaCreatorId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const mediaRef = db.collection(collections.streaming).doc(mediaSymbol);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      const communityRef = db.collection(collections.community).doc(communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let collabs = Object.keys(media.Collabs);

      let users : any[] = [];

      const creatorSnap = await db.collection(collections.user).doc(mediaCreatorId).get();
      const creatorData: any = creatorSnap.data();

      if(creatorSnap.exists) {
        users.push({
          type: 'Media Creator',
          userId: mediaCreatorId,
          userName: creatorData.firstName,
          userConnected: false,
          lastView: Date.now()
        })
      }

      for(let collab of collabs) {
        const userSnap = await db.collection(collections.user).doc(collab).get();
        const userData: any = userSnap.data();

        if(userSnap.exists) {
          users.push({
            type: 'Media Collab',
            userId: collab,
            userName: userData.firstName,
            userConnected: false,
            lastView: null
          })
        }
      }

      const creatorCommunitySnap = await db.collection(collections.user).doc(community.Creator).get();
      const creatorCommunityData: any = creatorCommunitySnap.data();

      users.push({
        type: 'Community Creator',
        userId: mediaCreatorId,
        userName: creatorCommunityData.firstName,
        userConnected: false,
        lastView: null
      });

      if(creatorCommunityData.Admins && creatorCommunityData.Admins.length > 0) {
        let arrayFiltered = creatorCommunityData.Admins.filter(admin => admin.status === 'Accepted');
        if (arrayFiltered && arrayFiltered.length > 0) {
          for(let communityAdmin of arrayFiltered) {
            const userSnap = await db.collection(collections.user).doc(communityAdmin.userId).get();
            const userData: any = userSnap.data();
            users.push({
              type: 'Community Admin',
              userId: communityAdmin.userId,
              userName: userData.firstName,
              userConnected: false,
              lastView: null
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
        messages: []
      }

      await db.collection(collections.marketingMediaCommunityChat).doc(media.MediaSymbol+communityGet.id).set(obj);

      let dir = "uploads/marketingMediaCommunity/" + media.MediaSymbol+communityGet.id;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      obj.id = media.MediaSymbol+communityGet.id;
      resolve(obj);

    } catch (e) {
      console.log(e)
      reject(e);
    }
  });
}

exports.getChatsMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const mediaId = req.params.mediaId;
    const userId = req.params.userId;

    let isAllowed = await checkIfHasPermissions(userId, mediaId);

    if(isAllowed) {
      const allChats: any[] = [];
      const marketingMediaCommunityChatSnap = await db.collection(collections.marketingMediaCommunityChat)
        .where("mediaId", "==", mediaId).get();
      marketingMediaCommunityChatSnap.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        allChats.push(data);
      });

      let sortChats = allChats.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

      res.send({
        success: true,
        data: sortChats
      });
    } else {

    }

  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsMediaMarketing()', err);
    res.send({ success: false, error: err });
  }
};

const checkIfHasPermissions = (userId: string, mediaId: string) : Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const mediaRef = db.collection(collections.streaming).doc(mediaId);
      const mediaGet = await mediaRef.get();
      const media: any = mediaGet.data();

      let arrayCollabs : any[] = Object.keys(media.Collabs);

      if(media.Requester === userId || arrayCollabs.some(collab => collab === userId)) {
        resolve(true);
      } else {
        resolve(false)
      }
    } catch (e) {
      reject(e);
    }
  });
}

exports.getChatsCommunityMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const communityId = req.params.communityId;
    const userId = req.params.userId;

    const allChats: any[] = [];
    const marketingMediaCommunityChatSnap = await db.collection(collections.marketingMediaCommunityChat)
      .where("communityId", "==", communityId).get();
    marketingMediaCommunityChatSnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allChats.push(data);
    });

    let sortChats = allChats.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

    res.send({
      success: true,
      data: sortChats
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsCommunityMarketing()', err);
    res.send({ success: false, error: err });
  }
};
exports.getMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const mediaId = req.params.mediaId;
    const podAddress = req.params.podAddress;

    const allMarketing: any[] = [];
    const marketingMediaCommunitySnap = await db.collection(collections.mediaPods).doc(podAddress)
      .collection(collections.medias).doc(mediaId).collection(collections.communityMarketings).get();
    marketingMediaCommunitySnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allMarketing.push(data);
    });


    // let sortMarketing = allMarketing.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

    res.send({
      success: true,
      data: allMarketing
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsMediaMarketing()', err);
    res.send({ success: false, error: err });
  }
};

exports.getCommunityMarketing = async (req: express.Request, res: express.Response) => {
  try {
    const communityId = req.params.communityId;

    const allChats: any[] = [];
    const marketingMediaCommunityChatSnap = await db.collection(collections.marketingMediaCommunityChat)
      .where("communityId", "==", communityId).get();
    marketingMediaCommunityChatSnap.forEach((doc) => {
      let data = doc.data();
      data.id = doc.id;
      allChats.push(data);
    });

    let sortChats = allChats.sort((a, b) => (b.created > a.created) ? 1 : ((a.created > b.created) ? -1 : 0));

    res.send({
      success: true,
      data: sortChats
    });
  } catch (err) {
    console.log('Error in controllers/mediaController -> getChatsCommunityMarketing()', err);
    res.send({ success: false, error: err });
  }
};

exports.createChatMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    let mediaId = req.params.mediaId;
    let communityId = req.params.communityId;

    if (userId && mediaId && communityId) {

      let chat = await createChatMediaMarketing(userId, mediaId, communityId);

      res.send({
        success: true,
        data: chat
      });
    } else {
      console.log('Error in controllers/mediaController -> createChatMediaMarketing(): Missing info');
      res.send({
        success: false,
        error: 'Error in controllers/mediaController -> createChatMediaMarketing(): Missing info'
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> createChatMediaMarketing() ' + e);
    res.send({
      success: false,
      error: 'Error in controllers/mediaController -> createChatMediaMarketing() ' + e
    });
  }
};

const createChatMediaMarketing = exports.createChatWIPFromUsers = (userId, mediaId, communityId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let room : string = mediaId + communityId;

      const chatQuery = await db.collection(collections.marketingMediaCommunityChat).doc(room).get();
      if (!chatQuery.exists) {
        let data : any = chatQuery.data();
        data.id = chatQuery.id;
        resolve(data);
      } else {
        let users : any[] = [];

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
          lastView: null
        });

        let arrayCollabs : any[] = Object.keys(media.Collabs);

        for(let collab of arrayCollabs) {
          const userSnap = await db.collection(collections.user).doc(collab).get();
          const userData: any = userSnap.data();

          users.push({
            type: 'Media Collab',
            userId: collab,
            userName: userData.firstName,
            userConnected: false,
            lastView: null
          })
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
          lastView: null
        });

        if(communityData.Admins && communityData.Admins.length > 0) {
          let admins = communityData.Admins.filter(admin => admin.status === 'Accepted');

          for(let admin of admins) {
            const userSnap = await db.collection(collections.user).doc(admin.userId).get();
            const userData: any = userSnap.data();

            users.push({
              type: 'Community Admin',
              userId: admin.userId,
              userName: userData.firstName,
              userConnected: false,
              lastView: null
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
            communityId: communityId
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
          communityId: communityId
        })
      }
    } catch (e) {
      console.log(e)
      reject(e);
    }
  });
}

exports.getMessagesMediaMarketing = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    let mediaId = req.params.mediaId;
    let communityId = req.params.communityId;

    if (userId && mediaId && communityId) {
      const chatQuery = await db.collection(collections.marketingMediaCommunityChat)
        .doc(mediaId+communityId).get();
      let messages: any[] = [];

      if (chatQuery.exists) {
        let data = chatQuery.data();

        if (data && data.messages && data.messages.length > 0) {
          for (let i = 0; i < data.messages.length; i++) {
            const messageGet = await db.collection(collections.MarketingMediaCommunityMessage)
              .doc(data.messages[i]).get();
            messages.push(messageGet.data())

            if (i === data.messages.length - 1) {
              res.status(200).send({
                success: true,
                data: messages
              });
            }
          }
        } else {
          res.status(200).send({
            success: true,
            data: messages
          });
        }

      } else {
        res.status(200).send({
          success: false,
          error: 'Error in controllers/mediaController -> getMessagesMediaMarketing(): Wrong Chat Room Provided'
        });
      }
    } else {
      res.status(200).send({
        success: false,
        error: 'Error in controllers/mediaController -> getMessagesMediaMarketing(): Non Chat Room Provided'
      });
    }
  } catch (e) {
    console.log('Error in controllers/mediaController -> getMessagesMediaMarketing()' + e)
    res.status(200).send({
      success: false,
      error: 'Error in controllers/mediaController -> getMessagesMediaMarketing():' + e
    });
  }
};