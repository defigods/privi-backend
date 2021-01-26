import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const blogController = require('./blogController');
const notificationsController = require('./notificationsController');

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.author, body.creditPoolId);

    if(body && body.creditPoolId && isCreator) {
      let ret = await blogController.createPost(body, 'creditWallPost', body.priviUser.id)

      const priviCreditsRef = db.collection(collections.priviCredits)
        .doc(body.creditPoolId);
      const priviCreditsGet = await priviCreditsRef.get();
      const priviCredit: any = priviCreditsGet.data();

      let posts : any[] = [];

      if(priviCredit && priviCredit.Posts) {
        let priviCreditPosts = [...priviCredit.Posts];
        priviCreditPosts.push(ret.id);
        posts = priviCreditPosts;
      } else {
        posts.push(ret.id);
      }

      await priviCreditsRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else if (!isCreator){
      console.log('Error in controllers/priviCreditWallController -> postCreate()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/priviCreditWallController -> postCreate()', 'Missing Privi Credit Id');
      res.send({ success: false, error: 'Missing Privi Id'});
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}

exports.postDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.creditPoolId);

    if(body && body.creditPoolId && isCreator) {
      const priviCreditsRef = db.collection(collections.priviCredits)
        .doc(body.creditPoolId);
      const priviCreditsGet = await priviCreditsRef.get();
      const priviCredit: any = priviCreditsGet.data();

      let ret = await blogController.deletePost(priviCreditsRef, priviCreditsGet, priviCredit, body.postId, collections.creditWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/priviCreditWallController -> postDelete()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isCreator){
      console.log('Error in controllers/priviCreditWallController -> postDelete()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/priviCreditWallController -> postDelete()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> postDelete()', err);
    res.send({ success: false, error: err});
  }
};

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
      const directoryPath = path.join('uploads', 'creditWallPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'creditWallPost', 'photos-' + postId, photoId + '.png'));
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
    if (body && body.blogPostId && body.response && body.userId && body.userName) {

      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(body.blogPostId);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();

      let responses : any[] = [...creditWallPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await creditWallPostRef.update({
        responses: responses
      });
      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/priviCreditWallController -> makeResponseCreditWallPost()', "There's no post id...");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> makeResponseCreditWallPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.creditWallPostId && body.userId && body.userName) {
      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(body.creditWallPostId);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();

      let creditPost = await blogController.likeItemPost(creditWallPostRef, creditWallPostGet, creditWallPost, body.userId, creditWallPost.createdBy)

      await notificationsController.addNotification({
        userId: creditWallPost.createdBy,
        notification: {
          type: 77,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: creditWallPostGet.id, //pod === post
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
        }
      });

      res.send({ success: true, data: creditPost });

    } else {
      console.log('Error in controllers/priviCreditWallController -> likePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> likePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podWallPostId && body.userId && body.userName) {
      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(body.creditWallPostId);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();

      let creditPost = await blogController.dislikeItemPost(creditWallPostRef, creditWallPostGet, creditWallPost, body.userId, creditWallPost.createdBy);

      await notificationsController.addNotification({
        userId: creditWallPost.createdBy,
        notification: {
          type: 78,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: creditWallPostGet.id, //pod === post
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
        }
      });

      res.send({ success: true, data: creditPost });

    } else {
      console.log('Error in controllers/priviCreditWallController -> dislikePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> dislikePost()', err);
    res.send({ success: false, error: err });
  }
};


exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.creditPoolId);

    if (body && body.wallPostId && isCreator) {
      const creditWallPostRef = db.collection(collections.creditWallPost)
        .doc(body.wallPostId);
      const creditWallPostGet = await creditWallPostRef.get();
      const creditWallPost: any = creditWallPostGet.data();

      let creditPost = await blogController.pinItemPost(creditWallPostRef, creditWallPostGet, creditWallPost, body.pinned);

      res.send({ success: true, data: creditPost });

    } else if (!isCreator){
      console.log('Error in controllers/priviCreditWallController -> pinPost()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    } else {
      console.log('Error in controllers/priviCreditWallController -> pinPost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditWallController -> pinPost()', err);
    res.send({ success: false, error: err });
  }
};

const checkIfUserIsCreator = (userId, creditPoolId) => {
  return new Promise(async (resolve, reject) => {
    const priviCreditRef = db.collection(collections.priviCredits)
      .doc(creditPoolId);
    const priviCreditGet = await priviCreditRef.get();
    const priviCredit: any = priviCreditGet.data();

    if (priviCredit && priviCredit.Creator && priviCredit.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}