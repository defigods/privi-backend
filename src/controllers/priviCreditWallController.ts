import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const blogController = require('./blogController');

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if(body && body.creditPoolId) {
      let ret = await blogController.createPost(body, 'creditWallPost', body.priviUser.id)

      const priviCreditsRef = db.collection(collections.priviCredits)
        .doc(body.creditPoolId);
      const priviCreditsGet = await priviCreditsRef.get();
      const priviCredit: any = priviCreditsGet.data();

      let posts : any[] = [];

      if(priviCredit && priviCredit.posts) {
        let priviCreditPosts = [...priviCredit.posts];
        priviCreditPosts.push(ret.id);
        posts = priviCreditPosts;
      } else {
        posts.push(ret.id);
      }

      await priviCreditsRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else {
      console.log('Error in controllers/priviCreditWallController -> postCreate()', 'Missing Privi Credit Id');
      res.send({ success: false, error: 'Missing Privi Id'});
    }

  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(req.file.originalname);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();
      if (creditWallPost.HasPhoto) {
        await creditWallPostRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/creditWallPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/priviCreditWallController -> changePostPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> changePostPhoto()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let creditWallPostId = req.params.creditWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(creditWallPostId);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + creditWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.creditWallPostId, filesName)
      await creditWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/priviCreditWallController -> changePostDescriptionPhotos()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> changePostDescriptionPhotos()', err);
    res.send({ success: false, error: err });
  }
}

exports.getCreditPost =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const creditWallPostQuery = await db.collection(collections.creditWallPost)
      .where("priviCreditId", "==", params.priviCreditId).get();
    if(!creditWallPostQuery.empty) {
      for (const doc of creditWallPostQuery.docs) {
        let data = doc.data();
        data.id = doc.id;
        posts.push(data);
      }
      res.status(200).send({
        success: true,
        data: posts
      });
    } else {
      res.status(200).send({
        success: true,
        data: []
      });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodPost()', err);
    res.send({ success: false });
  }
}

exports.getCreditWallPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.creditWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'creditWallPost');
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
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'creditWallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podWallController -> getPodWallPostPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodWallPostPhotoById()', err);
    res.send({ success: false, error: err });
  }
};
exports.getCreditWallPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.creditWallPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'podWallPost', 'photos-' + postId);
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
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'podWallPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podWallController -> getPodWallPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodWallPostDescriptionPhotoById()', err);
    res.send({ success: false, error: err });
  }
};

exports.makeResponseCreditWallPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.podWallPostId && body.response && body.userId && body.userName) {

      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(body.podWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let responses : any[] = [...podWallPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await podWallPostRef.update({
        responses: responses
      });
      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/podWallController -> makeResponsePodWallPost()', "There's no post id...");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> makeResponsePodWallPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podWallPostId && body.userId) {
      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(body.podWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.likeItemPost(podWallPostRef, podWallPostGet, podWallPost, body.userId, podWallPost.createdBy)

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/podWallController -> likePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> likePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podWallPostId && body.userId) {
      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(body.podWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.dislikeItemPost(podWallPostRef, podWallPostGet, podWallPost, body.userId, podWallPost.createdBy)

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/podWallController -> dislikePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> dislikePost()', err);
    res.send({ success: false, error: err });
  }
};