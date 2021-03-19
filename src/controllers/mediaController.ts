import express from 'express';
import { db } from '../firebase/firebase';
import path from "path";
import fs from "fs";
import collections from '../firebase/collections';
import mediaPod from "../blockchain/mediaPod";
import {updateFirebase} from "../functions/functions";

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
}

exports.getMedias = async (req: express.Request, res: express.Response) => {
  try {
    const pagination: number = +req.params.pagination;

    let body = req.body;

    console.log(body);

    let medias: any[] = [];
    let dataMedias : any[] = [];
    let dataEthMedia : any[] = [];

    // Blockchain & SearchValue filters
    if(body.blockChains && body.blockChains.length > 0) {
      let findBlockchainPRIVI = body.blockChains.find(block => block === 'PRIVI');
      let findBlockchainOthers = body.blockChains.filter(block => block !== 'PRIVI');
      let mediaTypes = body.mediaTypes;

      if(findBlockchainPRIVI) {
        const docsMediasSnap = (await db.collection(collections.streaming).get()).docs;
        let dataMediasSnap = docsMediasSnap.map((docSnap) => {
          let data = docSnap.data();
          data.id = docSnap.id;
          data.blockchain = 'PRIVI';
          return(data);
        });

        for(let media of dataMediasSnap){
          // Searched Value
          if(body.searchValue != '') {
            if ((media.MediaName && media.MediaName.toLowerCase().includes(body.searchValue.toLowerCase())) ||
              (media.MediaSymbol && media.MediaSymbol.toLowerCase().includes(body.searchValue.toLowerCase()))) {

              let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
              if(applyTypeFilter) {
                dataMedias.push(media);
              }
            }
          } else {
            let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
            if(applyTypeFilter) {
              dataMedias.push(media);
            }
          }
        }

      }

      if(findBlockchainOthers && findBlockchainOthers.length > 0) {
        const docsEthMediaSnap = (await db.collection(collections.ethMedia).get()).docs;
        let dataEthMediaSnap = docsEthMediaSnap.map((docSnap) => {
          let data = docSnap.data();
          data.id = docSnap.id;
          return(data);
        });

        for(let media of dataEthMediaSnap){
          // Searched Value
          if(body.searchValue != '') {
            if (media.title.toLowerCase().includes(body.searchValue.toLowerCase())) {
              // Blockchain
              for(let block of findBlockchainOthers) {
                if(media.tag === block) {
                  let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
                  if(applyTypeFilter) {
                    dataEthMedia.push(media);
                  }
                }
              }
            }
          } else {
            // Blockchain
            for(let block of findBlockchainOthers) {
              if(media.tag === block) {
                let applyTypeFilter = await mediaTypeFilter(media, mediaTypes);
                if(applyTypeFilter) {
                  dataEthMedia.push(media);
                }
              }
            }
          }
        }

      }

    }

    medias = dataMedias.concat(dataEthMedia).slice(pagination * 10, (pagination+1) * 10);

    return res.status(200).send({ success: true, data: medias });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ success: false, error: e });
  }
}

const mediaTypeFilter = (media: any, mediaTypes: string[]) => {
  return new Promise((resolve, reject) => {
    try {
      if(mediaTypes && mediaTypes.length > 0) {
        let filterMedia = mediaTypes.some((typ) => typ === media.Type);

        if(filterMedia) {
          resolve(media);
        } else{
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
}

exports.changeMediaPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db.collection(collections.mediaPods).doc(req.params.mediaPod)
        .collection(collections.medias).doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
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
    if (req.file &&  req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db.collection(collections.mediaPods).doc(req.params.mediaPod)
        .collection(collections.medias).doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
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
    if (req.file &&  req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db.collection(collections.mediaPods).doc(req.params.mediaPod)
        .collection(collections.medias).doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
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
    if (body && body.mediaId && body.mediaPod) {
      const mediasRef = db.collection(collections.mediaPods).doc(body.mediaPod)
        .collection(collections.medias).doc(body.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
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
      const mediasRef = db.collection(collections.mediaPods).doc(req.params.mediaPod)
        .collection(collections.medias).doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let mediaEdited = {...media};
      if(mediaEdited.videosId && mediaEdited.videosId.length > 0) {
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
    let mediaPod = req.params.mediaPod;

    if (mediaId && mediaPod) {
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
    let mediaPod = req.params.mediaPod;

    if (mediaId && mediaPod) {
      await getMedia(mediaId, '.mp3', 'audio', res);
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
    let mediaPod = req.params.mediaPod;

    if (mediaId && mediaPod) {
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
      const mediasRef = db.collection(collections.mediaPods).doc(mediaPod)
        .collection(collections.medias).doc(mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      res.send({ success: true, data: {
          actualPage: pagination,
          totalPages: media.totalPages,
          page: media.editorPages[pagination]
        }
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

const getMedia = (mediaId: string, extension : string, type : string, res: express.Response) => {
  return new Promise((resolve, reject) => {
    try {
      const directoryPath = path.join('uploads', 'media', mediaId);
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
      res.setHeader('Content-Type', type);
      let raw = fs.createReadStream(path.join('uploads', 'media', mediaId + extension));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } catch (e) {
      reject(e);
    }
  })
}

exports.editMedia = async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if(params && body && params.mediaPod && params.mediaId && body.media) {
      const mediasRef = db.collection(collections.mediaPods).doc(params.mediaPod)
        .collection(collections.medias).doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.media.Creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if(body.media.SavedCollabs && body.media.SavedCollabs.length > 0) {
        if(media.SavedCollabs && media.SavedCollabs.length > 0) {
          let newCollabs : any[] = [];
          for(let bodyCollab of body.media.SavedCollabs) {
            let isInBD : boolean = false;
            for(let mediaCollab of media.SavedCollabs) {
              if(bodyCollab.id === mediaCollab.id) {
                isInBD = true;
              }
            }
            if(!isInBD) {
              newCollabs.push(bodyCollab)
            }
          }

          for(let collab of newCollabs) {
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
          for(let collab of body.media.SavedCollabs) {
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
      console.log('Error in controllers/mediaController -> editMedia()', "Missing data");
      res.send({ success: false, error: "Missing data" });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> editMedia()', err);
    res.send({ success: false, error: err });
  }
}

exports.removeCollab =  async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if(params && body && params.mediaPod && params.mediaId && body.RemovedCollab && body.Creator) {
      const mediasRef = db.collection(collections.mediaPods).doc(params.mediaPod)
        .collection(collections.medias).doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.Creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if(body.RemovedCollab.status === 'Accepted') {
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

        let notificationIndex = userCollab.notifications.findIndex(not => not.type === 104 && not.pod === media.MediaSymbol);

        if(notificationIndex !== -1) {
          await notificationsController.removeNotification({
            userId: body.RemovedCollab.id,
            notificationId: userCollab.notifications[notificationIndex].id,
          });
        }
      }

      let collabIndex = media.SavedCollabs.findIndex(collab => collab.id === body.RemovedCollab.id);
      media.SavedCollabs.splice(collabIndex, 1);

      let sumShare : number = 0;
      for(let collab of media.SavedCollabs) {
        if(collab.id !== body.Creator) {
          sumShare += collab.share;
        }
      }

      if(sumShare < 100) {
        let creatorIndex = media.SavedCollabs.findIndex(coll => coll.id === body.Creator);
        let usr = {
          firstName: user.firstName,
          id: body.Creator,
          share: 100 - sumShare,
          status: 'Creator'
        }
        if(creatorIndex === -1) {
          media.SavedCollabs.push(usr)
        } else{
          media.SavedCollabs[creatorIndex] = usr;
        }
      }

      await mediasRef.update(media);

      res.send({ success: true });

    } else {
      console.log('Error in controllers/mediaController -> removeCollab()', "Missing data");
      res.send({ success: false, error: "Missing data" });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> removeCollab()', err);
    res.send({ success: false, error: err });
  }
};

exports.refuseCollab =  async (req: express.Request, res: express.Response) => {
  try {
    let params = req.params;
    let body = req.body;

    if(params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db.collection(collections.mediaPods).doc(params.mediaPod)
        .collection(collections.medias).doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId,
      });

      if(media.SavedCollabs && media.SavedCollabs.length > 0) {
        let collabIndex = media.SavedCollabs.findIndex(collab => collab.id === body.userId);
        if(media.SavedCollabs[collabIndex].status === 'Requested') {
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
        console.log('Error in controllers/mediaController -> refuseCollab()', "Missing data");
        res.send({ success: false, error: 'Collab status was not Pending' });
        return;
      }

      res.send({ success: true });

    } else {
      console.log('Error in controllers/mediaController -> refuseCollab()', "Missing data");
      res.send({ success: false, error: "Missing data" });
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

    if(params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db.collection(collections.mediaPods).doc(params.mediaPod)
        .collection(collections.medias).doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId,
      });

      if(media.SavedCollabs && media.SavedCollabs.length > 0) {
        let collabIndex = media.SavedCollabs.findIndex(collab => collab.id === body.userId);
        if(media.SavedCollabs[collabIndex].status === 'Requested') {
          let mediaCopy = {...media};
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
          console.log('Error in controllers/mediaController -> acceptCollab()', "Collab status was not Requested");
          res.send({ success: false, error: 'Collab status was not Requested' });
        }
      }
    } else {
      console.log('Error in controllers/mediaController -> acceptCollab()', "Missing data");
      res.send({ success: false, error: "Missing data" });
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

    if(params && body && params.mediaPod && params.mediaId && body.userId && body.creator && body.notificationId) {
      const mediasRef = db.collection(collections.mediaPods).doc(params.mediaPod)
        .collection(collections.medias).doc(params.mediaId);
      const mediasGet = await mediasRef.get();
      const media: any = mediasGet.data();

      let collabIndex = media.SavedCollabs.findIndex(collab => collab.id === body.userId);
      if(media.SavedCollabs[collabIndex] && media.SavedCollabs[collabIndex].status === 'Accepted') {
        const podAddress = body.PodAddress;
        const mediaSymbol = body.MediaSymbol;

        const collabs = body.Collabs;
        const hash = body.Hash;
        const signature = body.Signature;
        const blockchainRes = await mediaPod.updateCollabs(podAddress, mediaSymbol, collabs, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
          console.log(blockchainRes)
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
        console.log('Error in controllers/mediaController -> refuseCollab()', "Collab status was not Accepted");
        res.send({ success: false, error: 'Collab status was not Accepted' });
      }
    } else {
      console.log('Error in controllers/mediaController -> refuseCollab()', "Missing data");
      res.send({ success: false, error: "Missing data" });
    }
  } catch (err) {
    console.log('Error in controllers/mediaController -> refuseCollab()', err);
    res.send({ success: false, error: err });
  }
};


exports.changeMediaMainPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file && req.params && req.params.mediaPod && req.params.mediaId) {
      const mediasRef = db.collection(collections.mediaPods).doc(req.params.mediaPod)
        .collection(collections.medias).doc(req.params.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
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

    if (mediaId && mediaPod) {
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