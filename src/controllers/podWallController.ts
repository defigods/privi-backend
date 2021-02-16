import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const blogController = require('./blogController');
const notificationsController = require('./notificationsController');
const tasks = require("./tasksController");

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.author, body.podId);

    if(body && body.podId && isCreator) {
      let ret = await blogController.createPost(body, 'podWallPost', body.priviUser.id)

      const podRef = db.collection(collections.podsFT)
        .doc(body.podId);
      const podGet = await podRef.get();
      const pod: any = podGet.data();

      let posts : any[] = [];

      if(pod && pod.Posts) {
        let podPosts = [...pod.Posts];
        podPosts.push(ret.id);
        posts = podPosts;
      } else {
        posts.push(ret.id);
      }

      await podRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> postCreate()', "You can't create a post");
      res.send({ success: false, error: "You can't create a post"});
    } else {
      console.log('Error in controllers/podWallController -> postCreate()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Pod Id'});
    }

  } catch (err) {
    console.log('Error in controllers/podWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}

exports.postDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.podId);

    if(body && body.podId && isCreator) {
      const podRef = db.collection(collections.podsFT)
        .doc(body.podId);
      const podGet = await podRef.get();
      const pod: any = podGet.data();

      let ret = await blogController.deletePost(podRef, podGet, pod, body.postId, collections.podWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/podWallController -> postDelete()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> postDelete()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/podWallController -> postDelete()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> postDelete()', err);
    res.send({ success: false, error: err});
  }
};

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(req.file.originalname);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();
      if (podWallPost.HasPhoto) {
        await podWallPostRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/podWallPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podWallController -> changePostPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> changePostPhoto()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let podWallPostId = req.params.podWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(podWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + podWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.podWallPostId, filesName)
      await podWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/podWallController -> changePostDescriptionPhotos()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> changePostDescriptionPhotos()', err);
    res.send({ success: false });
  }
}

exports.getPodPosts =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const podWallPostQuery = await db.collection(collections.podWallPost)
      .where("podId", "==", params.podId).get();
    if(!podWallPostQuery.empty) {
      for (const doc of podWallPostQuery.docs) {
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

exports.getPodPostById =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;

    const podWallPostSnap = await db.collection(collections.podWallPost)
      .doc(params.postId).get();
    const podWallPost : any = podWallPostSnap.data();
    podWallPost.id = podWallPostSnap.id;

    res.status(200).send({
      success: true,
      data: podWallPost
    });
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodPostById()', err);
    res.send({ success: false, error: err });
  }
}

exports.getPodWallPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.podWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'podWallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'podWallPost', postId + '.png'));
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
exports.getPodWallPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.podWallPostId;
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

exports.makeResponsePodWallPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.blogPostId && body.response && body.userId && body.userName) {

      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(body.blogPostId);
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

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 31,
          typeItemId: 'pod',
          itemId: body.userId,
          follower: body.userName,
          pod: podWallPost.podId,
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

      if (responses.length == 1) {
        let task = await tasks.updateTask(body.userId, "Make your first comment")
        res.send({success: true, data: responses, task: task});
      }

      res.send({success: true, data: responses});

    } else {
      console.log('Error in controllers/podWallController -> makeResponsePodWallPost()', "Missing data provided");
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

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 77,
          typeItemId: 'pod',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: podWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

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

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 78,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: podWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

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

exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.podId);

    if (body && body.wallPostId && isCreator) {
      const podWallPostRef = db.collection(collections.podWallPost)
        .doc(body.wallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.pinItemPost(podWallPostRef, podWallPostGet, podWallPost, body.pinned)

      res.send({ success: true, data: podPost });

    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> pinPost()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    } else {
      console.log('Error in controllers/podWallController -> pinPost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> pinPost()', err);
    res.send({ success: false, error: err });
  }
};

// NFT


exports.postCreateNFT = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreatorNFT(body.author, body.podId);

    if(body && body.podId && isCreator) {
      let ret = await blogController.createPost(body, 'podNFTWallPost', body.priviUser.id)

      const podRef = db.collection(collections.podsNFT)
        .doc(body.podId);
      const podGet = await podRef.get();
      const pod: any = podGet.data();

      let posts : any[] = [];

      if(pod && pod.Posts) {
        let podPosts = [...pod.Posts];
        podPosts.push(ret.id);
        posts = podPosts;
      } else {
        posts.push(ret.id);
      }

      await podRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> postCreateNFT()', "You can't create a post");
      res.send({ success: false, error: "You can't create a post"});
    } else {
      console.log('Error in controllers/podWallController -> postCreateNFT()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Pod Id'});
    }

  } catch (err) {
    console.log('Error in controllers/podWallController -> postCreateNFT()', err);
    res.send({ success: false, error: err});
  }
}

exports.postDeleteNFT = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreatorNFT(body.userId, body.podId);

    if(body && body.podId && isCreator) {
      const podRef = db.collection(collections.podsNFT).doc(body.podId);
      const podGet = await podRef.get();
      const pod: any = podGet.data();

      let ret = await blogController.deletePost(podRef, podGet, pod, body.postId, collections.podNFTWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/podWallController -> postDeleteNFT()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> postDeleteNFT()', "You can't delete a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/podWallController -> postDeleteNFT()', 'Missing Pod Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> postDeleteNFT()', err);
    res.send({ success: false, error: err});
  }
};

exports.changePostPhotoNFT = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const podNFTWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(req.file.originalname);
      const podNFTWallPostGet = await podNFTWallPostRef.get();
      const podNFTWallPost: any = podNFTWallPostGet.data();
      if (podNFTWallPost.HasPhoto) {
        await podNFTWallPostRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/podNFTWallPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podWallController -> changePostPhotoNFT()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> changePostPhotoNFT()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotosNFT = async (req: express.Request, res: express.Response) => {
  try {
    let podNFTWallPostId = req.params.podNFTWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const podNFTWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(podNFTWallPostId);
      const podNFTWallPostGet = await podNFTWallPostRef.get();
      const podNFTWallPost: any = podNFTWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + podNFTWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.podWallPostId, filesName)
      await podNFTWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/podWallController -> changePostDescriptionPhotosNFT()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> changePostDescriptionPhotosNFT()', err);
    res.send({ success: false });
  }
}

exports.getPodPostsNFT =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const podWallPostQuery = await db.collection(collections.podNFTWallPost)
      .where("podId", "==", params.podId).get();
    if(!podWallPostQuery.empty) {
      for (const doc of podWallPostQuery.docs) {
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
    console.log('Error in controllers/podWallController -> getPodPostsNFT()', err);
    res.send({ success: false });
  }
}

exports.getPodPostByIdNFT =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;

    const podWallPostSnap = await db.collection(collections.podNFTWallPost)
      .doc(params.postId).get();
    const podWallPost : any = podWallPostSnap.data();
    podWallPost.id = podWallPostSnap.id;

    res.status(200).send({
      success: true,
      data: podWallPost
    });
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodPostByIdNFT()', err);
    res.send({ success: false, error: err });
  }
}

exports.getPodWallPostPhotoByIdNFT = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.podNFTWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'podNFTWallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'podNFTWallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podWallController -> getPodWallPostPhotoByIdNFT()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodWallPostPhotoByIdNFT()', err);
    res.send({ success: false, error: err });
  }
};
exports.getPodWallPostDescriptionPhotoByIdNFT = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.podNFTWallPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'podNFTWallPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'podNFTWallPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podWallController -> getPodWallPostDescriptionPhotoByIdNFT()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> getPodWallPostDescriptionPhotoByIdNFT()', err);
    res.send({ success: false, error: err });
  }
};

exports.makeResponsePodWallPostNFT = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.blogPostId && body.response && body.userId && body.userName) {

      const podWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(body.blogPostId);
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

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 31,
          typeItemId: 'pod',
          itemId: body.userId,
          follower: body.userName,
          pod: podWallPost.podId,
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

      if (responses.length == 1) {
        let task = await tasks.updateTask(body.userId, "Make your first comment")
        res.send({success: true, data: responses, task: task});
        return;
      }

      res.send({success: true, data: responses});

    } else {
      console.log('Error in controllers/podWallController -> makeResponsePodWallPostNFT()', "Missing data provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> makeResponsePodWallPostNFT()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePostNFT = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podNFTWallPostId && body.userId) {
      const podWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(body.podNFTWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.likeItemPost(podWallPostRef, podWallPostGet, podWallPost, body.userId, podWallPost.createdBy)

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 77,
          typeItemId: 'pod',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: podWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/podWallController -> likePostNFT()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> likePostNFT()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePostNFT = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.podNFTWallPostId && body.userId) {
      const podWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(body.podNFTWallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.dislikeItemPost(podWallPostRef, podWallPostGet, podWallPost, body.userId, podWallPost.createdBy)

      await notificationsController.addNotification({
        userId: podWallPost.createdBy,
        notification: {
          type: 78,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: podWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: podWallPostGet.id
        }
      });

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/podWallController -> dislikePostNFT()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> dislikePostNFT()', err);
    res.send({ success: false, error: err });
  }
};

exports.pinPostNFT = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreatorNFT(body.userId, body.podId);

    if (body && body.wallPostId && isCreator) {
      const podWallPostRef = db.collection(collections.podNFTWallPost)
        .doc(body.wallPostId);
      const podWallPostGet = await podWallPostRef.get();
      const podWallPost: any = podWallPostGet.data();

      let podPost = await blogController.pinItemPost(podWallPostRef, podWallPostGet, podWallPost, body.pinned)

      res.send({ success: true, data: podPost });

    } else if (!isCreator){
      console.log('Error in controllers/podWallController -> pinPostNFT()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    } else {
      console.log('Error in controllers/podWallController -> pinPostNFT()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/podWallController -> pinPostNFT()', err);
    res.send({ success: false, error: err });
  }
};



const checkIfUserIsCreator = (userId, podId) => {
  return new Promise(async (resolve, reject) => {
    const podRef = db.collection(collections.podsFT)
      .doc(podId);
    const podGet = await podRef.get();
    const pod: any = podGet.data();

    if (pod && pod.Creator && pod.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}
const checkIfUserIsCreatorNFT = (userId, podId) => {
  return new Promise(async (resolve, reject) => {
    const podRef = db.collection(collections.podsNFT)
      .doc(podId);
    const podGet = await podRef.get();
    const pod: any = podGet.data();

    if (pod && pod.Creator && pod.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}