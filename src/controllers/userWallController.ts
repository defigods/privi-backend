import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

const notificationsController = require('./notificationsController');

const blogController = require('./blogController');

exports.postCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.author, body.userId);

    if(body && body.userId && isCreator) {
      let ret = await blogController.createPost(body, 'userWallPost', body.userId)

      const userRef = db.collection(collections.user)
        .doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let posts : any[] = [];

      if(user && user.Posts) {
        let userPosts = [...user.Posts];
        userPosts.push(ret.id);
        posts = userPosts;
      } else {
        posts.push(ret.id);
      }

      await userRef.update({
        Posts: posts
      })

      res.send({success: true, data: ret});
    } else if (!isCreator){
      console.log('Error in controllers/userWallController -> postCreate()', "You can't create a post");
      res.send({ success: false, error: "You can't create a post"});
    } else {
      console.log('Error in controllers/userWallController -> postCreate()', 'Missing User Id');
      res.send({ success: false, error: 'Missing User Id'});
    }

  } catch (err) {
    console.log('Error in controllers/userWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
}

exports.postDelete = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.creatorId);

    if(body && body.creatorId && isCreator) {
      const userRef = db.collection(collections.community)
        .doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let ret = await blogController.deletePost(userRef, userGet, user, body.postId, collections.userWallPost);

      if(ret) {
        res.send({success: true});
      } else {
        console.log('Error in controllers/userWallController -> postDelete()', 'Post Delete Error');
        res.send({
          success: false,
          error: 'Post Delete Error'
        });
      }
    } else if (!isCreator){
      console.log('Error in controllers/userWallController -> postDelete()', "You can't create a post");
      res.send({ success: false, error: "You can't delete a post"});
    } else {
      console.log('Error in controllers/userWallController -> postDelete()', 'Missing Creator Id');
      res.send({ success: false, error: 'Missing Creator Id'});
    }

  } catch (err) {
    console.log('Error in controllers/userWallController -> postCreate()', err);
    res.send({ success: false, error: err});
  }
};

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(req.file.originalname);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      if (userWallPost.HasPhoto) {
        await userWallPost.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/userWallPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userWallController -> changePostPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> changePostPhoto()', err);
    res.send({ success: false, error: err });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let userWallPostId = req.params.userWallPostId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(userWallPostId);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + userWallPostId + '/' + files[i].originalname)
      }
      console.log(req.params.userWallPostId, filesName)
      await userWallPostRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/userWallController -> changePostDescriptionPhotos()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> changePostDescriptionPhotos()', err);
    res.send({ success: false });
  }
}

exports.getUserPosts =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const userWallPostQuery = await db.collection(collections.userWallPost)
      .where("userId", "==", params.userId).get();
    if(!userWallPostQuery.empty) {
      for (const doc of userWallPostQuery.docs) {
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
    console.log('Error in controllers/userWallController -> getUserPosts()', err);
    res.send({ success: false, error: err });
  }
}

exports.getUserPostById =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;

    const userWallPostSnap = await db.collection(collections.userWallPost)
      .doc(params.postId).get();
    const userWallPost : any = userWallPostSnap.data();
    userWallPost.id = userWallPostSnap.id;

    res.status(200).send({
      success: true,
      data: userWallPost
    });
  } catch (err) {
    console.log('Error in controllers/userWallController -> getUserPostById()', err);
    res.send({ success: false, error: err });
  }
}

exports.getUserWallPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.userWallPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'userWallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'userWallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/userWallController -> getUserWallPostPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> getUserWallPostPhotoById()', err);
    res.send({ success: false, error: err });
  }
};
exports.getUserWallPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.userWallPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'userWallPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'userWallPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/userWallController -> getUserWallPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> getUserWallPostDescriptionPhotoById()', err);
    res.send({ success: false, error: err });
  }
};

exports.makeResponseUserWallPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.userWallPostId && body.response && body.userId && body.userName) {

      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(body.userWallPostId);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      let responses : any[] = [...userWallPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await userWallPostRef.update({
        responses: responses
      });

      await notificationsController.addNotification({
        userId: userWallPost.createdBy,
        notification: {
          type: 76,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: userWallPostGet.id, //pod === post
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
        }
      });

      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/userWallController -> makeResponseUserWallPost()', "There's no post id...");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> makeResponseUserWallPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userWallPostId && body.userId && body.userName) {
      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(body.userWallPostId);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      let podPost = await blogController.likeItemPost(userWallPostRef, userWallPostGet, userWallPost, body.userId, userWallPost.createdBy)

      await notificationsController.addNotification({
        userId: userWallPost.createdBy,
        notification: {
          type: 77,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: userWallPostGet.id, //pod === post
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
        }
      });

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/userWallController -> likePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> likePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userWallPostId && body.userId && body.userName) {
      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(body.userWallPostId);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      let podPost = await blogController.dislikeItemPost(userWallPostRef, userWallPostGet, userWallPost, body.userId, userWallPost.createdBy)

      await notificationsController.addNotification({
        userId: userWallPost.createdBy,
        notification: {
          type: 78,
          typeItemId: 'user',
          itemId: body.userId,
          follower: body.userName,
          pod: userWallPostGet.id, //pod === post
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
        }
      });

      res.send({ success: true, data: podPost });

    } else {
      console.log('Error in controllers/userWallController -> dislikePost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> dislikePost()', err);
    res.send({ success: false, error: err });
  }
};

exports.pinPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let isCreator = await checkIfUserIsCreator(body.userId, body.communityId);

    if (body && body.wallPostId && isCreator) {
      const userWallPostRef = db.collection(collections.userWallPost)
        .doc(body.wallPostId);
      const userWallPostGet = await userWallPostRef.get();
      const userWallPost: any = userWallPostGet.data();

      let podPost = await blogController.pinItemPost(userWallPostRef, userWallPostGet, userWallPost, body.pinned)

      res.send({ success: true, data: podPost });

    } else if (!isCreator){
      console.log('Error in controllers/userWallController -> pinPost()', "You can't pin a post");
      res.send({ success: false, error: "You can't pin a post"});
    }else {
      console.log('Error in controllers/userWallController -> pinPost()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> pinPost()', err);
    res.send({ success: false, error: err });
  }
};

exports.getFeedPosts = async (req: express.Request, res: express.Response) => {
  try {
    if (req.params && req.params.userId) {
      const userRef = db.collection(collections.user)
        .doc(req.params.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let posts : any[] = [];

      let communities : any[] = [...user.FollowingCommunities || []];
      if(user && user.JoinedCommunities && user.JoinedCommunities.length > 0) {
        for(const joinedComm of user.JoinedCommunities) {
          let foundIndex = communities.findIndex((comm) => comm === joinedComm);
          if(foundIndex === -1) {
            communities.push(joinedComm);
          }
        }
      }

      let ourDate = new Date();
      let pastDate = ourDate.getDate() - 7;
      ourDate.setDate(pastDate);
      const lastWeekTimestamp = ourDate.getTime();

      if(communities && communities.length !== 0) {
        const communityWallPostQuery = await db.collection(collections.communityWallPost)
          .where("createdAt", ">", lastWeekTimestamp).get();

        if(!communityWallPostQuery.empty) {
          for (const doc of communityWallPostQuery.docs) {
            let data = doc.data();
            data.id = doc.id;
            data.urlItem = 'community';

            let isAFollowCommunityIndex = communities.findIndex(comm => comm === data.communityId);

            if(isAFollowCommunityIndex !== -1) {
              posts.push(data);
            }
          }
        }
      }

      if(user && user.followingFTPods && user.followingFTPods.length !== 0) {
        const podWallPostQuery = await db.collection(collections.podWallPost)
          .where("createdAt", ">", lastWeekTimestamp).get();
        if(!podWallPostQuery.empty) {
          for (const doc of podWallPostQuery.docs) {
            let data = doc.data();
            data.id = doc.id;
            data.urlItem = 'pod';

            let isAFollowPodIndex = user.followingFTPods.findIndex(pod => pod === data.podId);

            if(isAFollowPodIndex !== -1) {
              posts.push(data);
            }
          }
        }
      }

      if(user && user.FollowingCredits && user.FollowingCredits.length !== 0) {
        const creditWallPostQuery = await db.collection(collections.creditWallPost)
          .where("createdAt", ">", lastWeekTimestamp).get();
        if(!creditWallPostQuery.empty) {
          for (const doc of creditWallPostQuery.docs) {
            let data = doc.data();
            data.id = doc.id;
            data.urlItem = 'priviCredit';

            let isAFollowCreditIndex = user.FollowingCredits.findIndex(credit => credit === data.creditPoolId);

            if(isAFollowCreditIndex !== -1) {
              posts.push(data);
            }
          }
        }
      }
      if(user && user.followings && user.followings.length !== 0) {
        const userWallPostQuery = await db.collection(collections.userWallPost)
          .where("createdAt", ">", lastWeekTimestamp).get();
        if(!userWallPostQuery.empty) {
          for (const doc of userWallPostQuery.docs) {
            let data = doc.data();
            data.id = doc.id;
            data.urlItem = 'user';
            let isAFollowCreditIndex = user.followings.findIndex(user => user === data.userId);

            if(isAFollowCreditIndex !== -1) {
              posts.push(data);
            }
          }
        }
      }

      res.send({ success: true, data: posts });

    } else {
      console.log('Error in controllers/userWallController -> getFeedPosts()', "Info not provided");
      res.send({ success: false, error: "Missing data provided" });
    }
  } catch (err) {
    console.log('Error in controllers/userWallController -> getFeedPosts()', err);
    res.send({ success: false, error: err });
  }
}

const checkIfUserIsCreator = (author, userId) => {
  return new Promise(async (resolve, reject) => {
    if (author === userId) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}