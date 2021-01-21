import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const blogController = require('./blogController');

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.insuranceId);

    if(body && body.insuranceId && isCreator) {
      let ret = await blogController.createPost(body, 'insuranceWallPost', body.priviUser.id)

      const insuranceRef = db.collection(collections.insurance)
        .doc(body.insuranceId);
      const insuranceGet = await insuranceRef.get();
      const insurance: any = insuranceGet.data();

      let posts : any[] = [];

      if(insurance && insurance.Posts) {
        let insurancePosts = [...insurance.Posts];
        insurancePosts.push(ret.id);
        posts = insurancePosts;
      } else {
        posts.push(ret.id);
      }

      await insuranceRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else if (!isCreator){
      console.log('Error in controllers/insuranceWallController -> postCreate()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/insuranceWallController -> postCreate()', 'Missing Insurance Id');
      res.send({ success: false, error: 'Missing insurance Id'});
    }

  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}


exports.postDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.insuranceId);

    if(body && body.insuranceId && isCreator) {
      const insuranceRef = db.collection(collections.insurance)
        .doc(body.insuranceId);
      const insuranceGet = await insuranceRef.get();
      const insurance: any = insuranceGet.data();

      let ret = await blogController.deletePost(insuranceRef, insuranceGet, insurance, body.postId, collections.insuranceWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/insuranceWallController -> postDelete()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isCreator){
      console.log('Error in controllers/insuranceWallController -> postDelete()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/insuranceWallController -> postDelete()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> postDelete()', err);
    res.send({ success: false, error: err});
  }
};

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(req.file.originalname);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();
      if (insuranceWallPost.HasPhoto) {
        await insuranceWallPostRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/insuranceWallPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/insuranceWallController -> changePostPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> changePostPhoto()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let insuranceWallPostId = req.params.insuranceWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(insuranceWallPostId);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + insuranceWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.insuranceWallPostId, filesName)
      await insuranceWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/insuranceWallController -> changePostDescriptionPhotos()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> changePostDescriptionPhotos()', err);
    res.send({ success: false, error: err });
  }
}

exports.getInsurancePost =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const insuranceWallPostQuery = await db.collection(collections.insuranceWallPost)
      .where("insuranceId", "==", params.insuranceId).get();
    if(!insuranceWallPostQuery.empty) {
      for (const doc of insuranceWallPostQuery.docs) {
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
    console.log('Error in controllers/insuranceWallController -> getPodPost()', err);
    res.send({ success: false });
  }
}

exports.getInsuranceWallPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.insuranceWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'insuranceWallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'insuranceWallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/insuranceWallController -> getInsuranceWallPostPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> getInsuranceWallPostPhotoById()', err);
    res.send({ success: false, error: err });
  }
};
exports.getInsuranceWallPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.creditWallPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'insuranceWallPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'insuranceWallPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/insuranceWallController -> getInsuranceWallPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> getInsuranceWallPostDescriptionPhotoById()', err);
    res.send({ success: false, error: err });
  }
};

exports.makeResponseInsuranceWallPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.blogPostId && body.response && body.userId && body.userName) {

      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(body.blogPostId);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();

      let responses : any[] = [...insuranceWallPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await insuranceWallPostRef.update({
        responses: responses
      });
      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/insuranceWallController -> makeResponseInsuranceWallPost()', "There's no post id...");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> makeResponseInsuranceWallPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.insuranceWallPostId && body.userId) {
      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(body.insuranceWallPostId);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();

      let insurancePost = await blogController.likeItemPost(insuranceWallPostRef, insuranceWallPostGet, insuranceWallPost, body.userId, insuranceWallPost.createdBy)

      res.send({ success: true, data: insurancePost });

    } else {
      console.log('Error in controllers/insuranceWallController -> likePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> likePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podWallPostId && body.userId) {
      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(body.insuranceWallPostId);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();

      let insurancePost = await blogController.dislikeItemPost(insuranceWallPostRef, insuranceWallPostGet, insuranceWallPost, body.userId, insuranceWallPost.createdBy);

      res.send({ success: true, data: insurancePost });

    } else {
      console.log('Error in controllers/insuranceWallController -> dislikePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> dislikePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.insuranceId);

    if (body && body.wallPostId && isCreator) {
      const insuranceWallPostRef = db.collection(collections.insuranceWallPost)
        .doc(body.wallPostId);
      const insuranceWallPostGet = await insuranceWallPostRef.get();
      const insuranceWallPost: any = insuranceWallPostGet.data();

      let insurancePost = await blogController.pinItemPost(insuranceWallPostRef, insuranceWallPostGet, insuranceWallPost, body.pinned);

      res.send({ success: true, data: insurancePost });

    } else if (!isCreator){
      console.log('Error in controllers/insuranceWallController -> pinPost()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    } else {
      console.log('Error in controllers/insuranceWallController -> pinPost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/insuranceWallController -> pinPost()', err);
    res.send({ success: false, error: err });
  }
};


const checkIfUserIsCreator = (userId, insuranceId) => {
  return new Promise(async (resolve, reject) => {
    const insuranceRef = db.collection(collections.insurance)
      .doc(insuranceId);
    const insuranceGet = await insuranceRef.get();
    const insurance: any = insuranceGet.data();

    if (insurance && insurance.Creator && insurance.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}