import collections from "../firebase/collections";
//import { uploadToFirestoreBucket } from '../functions/firestore'
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const blogController = require('./blogController');
const notificationsController = require('./notificationsController');

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const userRef = db.collection(collections.user)
      .doc(body.author);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let isUserRole : any = await checkUserRole(body.author, user.email, body.communityId, true, true, ['Moderator', 'Treasurer']);
    let isCreator = await checkIfUserIsCreator(body.author, body.communityId);

    if(body && body.communityId && (isUserRole && isUserRole.checked || isCreator)) {
      let ret = await blogController.createPost(body, 'communityWallPost', body.priviUser.id)

      const communityRef = db.collection(collections.community)
        .doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let posts : any[] = [];

      if(community && community.Posts) {
        let communityPosts = [...community.Posts];
        communityPosts.push(ret.id);
        posts = communityPosts;
      } else {
        posts.push(ret.id);
      }

      await communityRef.update({
        Posts: posts
      });

      let dir = 'uploads/communityWallPost/' + 'photos-' + ret.id;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      let dir1 = "uploads/communityWallPost/" + "videos-" + ret.id;

      if (!fs.existsSync(dir1)) {
        fs.mkdirSync(dir1);
      }

      res.send({success: true, data: ret});
    } else if (!isUserRole || !isCreator){
      console.log('Error in controllers/communityWallController -> postCreate()', "You can't create a post");
      res.send({ success: false, error: "You can't create a post"});
    } else {
      console.log('Error in controllers/communityWallController -> postCreate()', 'Missing Community Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }

  } catch (err) {
    console.log('Error in controllers/communityWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}

exports.postDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const userRef = db.collection(collections.user)
      .doc(body.author);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let isUserRole = await checkUserRole(body.author, user.email, body.communityId, true, false,['Moderator']);
    let isCreator : any = await checkIfUserIsCreator(body.userId, body.communityId);

    if(body && body.communityId && (isUserRole && isUserRole.checked || isCreator)) {
      const communityRef = db.collection(collections.community)
        .doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let ret = await blogController.deletePost(communityRef, communityGet, community, body.postId, collections.communityWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/communityWallController -> postDelete()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isUserRole || !isCreator){
      console.log('Error in controllers/communityWallController -> postDelete()', "You can't create a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/communityWallController -> postDelete()', 'Missing Community Id');
      res.send({ success: false, error: 'Missing Community Id'});
    }

  } catch (err) {
    console.log('Error in controllers/communityWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
};

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(req.file.originalname);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      if (communityWallPost.HasPhoto) {
        await communityWallPost.update({
          HasPhoto: true
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/communityWallController -> changePostPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> changePostPhoto()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let communityWallPostId = req.params.communityWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(communityWallPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + communityWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.podWallPostId, filesName)
      await communityWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/communityWallController -> changePostDescriptionPhotos()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> changePostDescriptionPhotos()', err);
    res.send({ success: false });
  }
}

exports.addVideoPost = async (req: express.Request, res: express.Response) => {
  try{
    if (req.file && req.file.originalname && req.params && req.params.communityWallPostId) {
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(req.params.communityWallPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      let videosArray = communityWallPost.videosId || [];
      videosArray.push(req.file.originalname);
      await communityWallPostRef.update({
        videosId: videosArray
      });

      res.send({
        success: true,
        data: `/community/wall/getVideo/${req.params.communityWallPostId}/${req.file.originalname}`
      });
    } else {
      console.log("Error in controllers/communityWallController -> addVideoPost()", 'No file provided');
      res.send({ success: false, error: 'No file provided' });
    }
  } catch (err) {
    console.log("Error in controllers/communityWallController -> addVideoPost()", err);
    res.send({ success: false, error: err });
  }
};

exports.getVideoPost = async (req: express.Request, res: express.Response) => {
  try{
    if (req.params && req.params.communityWallPostId && req.params.videoId) {

      const directoryPath = path.join('uploads', 'communityWallPost', 'videos-' + req.params.communityWallPostId, req.params.videoId);
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
      res.setHeader('Content-Type', 'video');
      let raw = fs.createReadStream(path.join('uploads', 'communityWallPost', 'videos-' + req.params.communityWallPostId, req.params.videoId + '.mp4'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log("Error in controllers/communityWallController -> getVideoPost()", 'No file provided');
      res.send({ success: false, error: 'No file provided' });
    }
  } catch (err) {
    console.log("Error in controllers/communityWallController -> getVideoPost()", err);
    res.send({ success: false, error: err });
  }
};

exports.getCommunityPost =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const communityWallPostQuery = await db.collection(collections.communityWallPost)
      .where("communityId", "==", params.podId).get();
    if(!communityWallPostQuery.empty) {
      for (const doc of communityWallPostQuery.docs) {
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
    console.log('Error in controllers/communityWallController -> getCommunityPost()', err);
    res.send({ success: false });
  }
}

exports.getCommunityPostById =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;

    const communityWallPostSnap = await db.collection(collections.communityWallPost)
      .doc(params.postId).get();
    const communityWallPost : any = communityWallPostSnap.data();
    communityWallPost.id = communityWallPostSnap.id;

    res.status(200).send({
      success: true,
      data: communityWallPost
    });
  } catch (err) {
    console.log('Error in controllers/communityWallController -> getCommunityPostById()', err);
    res.send({ success: false, error: err });
  }
}

exports.getCommunityWallPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.communityWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'communityWallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'communityWallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/communityWallController -> getCommunityWallPostPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> getCommunityWallPostPhotoById()', err);
    res.send({ success: false, error: err });
  }
};
exports.getCommunityWallPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.communityWallPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'communityWallPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'communityWallPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/communityWallController -> getCommunityWallPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> getCommunityWallPostDescriptionPhotoById()', err);
    res.send({ success: false, error: err });
  }
};

exports.makeResponseCommunityWallPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.blogPostId && body.response && body.userId && body.userName) {

      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(body.blogPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      let responses : any[] = [...communityWallPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await communityWallPostRef.update({
        responses: responses
      });

      await notificationsController.addNotification({
        userId: communityWallPost.createdBy,
        notification: {
          type: 82,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: communityWallPost.communityId, // pod === community
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: communityWallPostGet.id
        }
      });

      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/communityWallController -> makeResponseCommunityWallPost()', "Missing data provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> makeResponseCommunityWallPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.communityWallPostId && body.userId) {
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(body.communityWallPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      let communityPost = await blogController.likeItemPost(communityWallPostRef, communityWallPostGet, communityWallPost, body.userId, communityWallPost.createdBy)

      await notificationsController.addNotification({
        userId: communityWallPost.createdBy,
        notification: {
          type: 77,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: communityWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: communityWallPostGet.id
        }
      });

      res.send({ success: true, data: communityPost });

    } else {
      console.log('Error in controllers/communityWallController -> likePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> likePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.communityWallPostId && body.userId) {
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(body.communityWallPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      let communityPost = await blogController.dislikeItemPost(communityWallPostRef, communityWallPostGet, communityWallPost, body.userId, communityWallPost.createdBy)

      await notificationsController.addNotification({
        userId: communityWallPost.createdBy,
        notification: {
          type: 78,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: '',
          comment: communityWallPost.name,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: communityWallPostGet.id
        }
      });

      res.send({ success: true, data: communityPost });

    } else {
      console.log('Error in controllers/communityWallController -> dislikePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> dislikePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.communityId);

    if (body && body.wallPostId && isCreator) {
      const communityWallPostRef = db.collection(collections.communityWallPost)
        .doc(body.wallPostId);
      const communityWallPostGet = await communityWallPostRef.get();
      const communityWallPost: any = communityWallPostGet.data();

      let podPost = await blogController.pinItemPost(communityWallPostRef, communityWallPostGet, communityWallPost, body.pinned)

      res.send({ success: true, data: podPost });

    } else if (!isCreator){
      console.log('Error in controllers/communityWallController -> pinPost()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    } else {
      console.log('Error in controllers/communityWallController -> pinPost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/communityWallController -> pinPost()', err);
    res.send({ success: false, error: err });
  }
};

const checkIfUserIsCreator = exports.checkIfUserIsCreator = (userId, communityId) => {
  return new Promise(async (resolve, reject) => {
    const communityRef = db.collection(collections.community)
      .doc(communityId);
    const communityGet = await communityRef.get();
    const community: any = communityGet.data();

    if (community && community.Creator && community.Creator === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}

const checkUserRole = exports.checkUserRole = (userId, userEmail, communityId, adminAccepted, memberAccepted, otherRolesAccepted) : Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const communityRef = db.collection(collections.community)
        .doc(communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      let userRoles : string[] = [];
      let checked : boolean = false;

      let admins = [...community.Admins];
      admins.forEach((admin) => {
        if(admin.userId && admin.userId === userId) {
          userRoles.push('Admin');
          if(adminAccepted) {
            checked = true;
          }
        }
      });

      let roles = community.UserRoles;

      if(roles[userEmail] && roles[userEmail].roles) {
        let rolesOfUsers = Object.keys(roles[userEmail].roles);
        rolesOfUsers.forEach((role) => {
          if(roles[userEmail].roles[role]) {
            userRoles.push(role)
          }
          let findIndex = otherRolesAccepted.findIndex(roleAccepted => roleAccepted === role);
          if(findIndex !== -1) {
            checked = true;
          }
        });
      }

      let members = [...community.Members];
      members.forEach((member) => {
        if(member.id && member.id === userId) {
          userRoles.push('Member');
          if(memberAccepted) {
            checked = true;
          }
        }
      });

      resolve({
        userRoles: userRoles,
        checked: checked
      })
    } catch (e) {
      reject(e)
    }
  })
}