import express from 'express';
import { db } from '../firebase/firebase';
import { ethMedia } from '../firebase/collections';
import path from "path";
import fs from "fs";
import collections from '../firebase/collections';

exports.getEthMedia = async (req: express.Request, res: express.Response) => {
  try {
    const docsSnap = (await db.collection(ethMedia).get()).docs;
    const data = docsSnap.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return res.status(200).send({ success: true, data });
  } catch (e) {
    return res.status(500).send({ success: false, message: 'Unable to retrieve Eth media' });
  }
}

exports.getEthMediaItem = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const docRef = db.collection(ethMedia).doc(id);
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
    if (req.file) {
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
    if (req.file) {
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
    if (req.file) {
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
    if (body && body.mediaId) {
      const mediasRef = db.collection(collections.medias).doc(body.mediaId);
      const mediasGet = await mediasRef.get();
      const media : any = mediasGet.data();

      let mediaEdited = {...media};
      mediaEdited.editorPages = body.editorPages || [];
      mediaEdited.totalPages = body.totalPages || 0;

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
    if (req.file && req.file.originalname && req.params && req.params.mediaId) {
      const mediasRef = db.collection(collections.medias).doc(req.params.mediaId);
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
    let pagination = req.params.pagination;

    if (mediaId && pagination) {
      const mediasRef = db.collection(collections.medias).doc(mediaId);
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