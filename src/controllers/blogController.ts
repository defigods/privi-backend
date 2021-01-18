import {
    updateFirebase,
    createNotification,
    getRateOfChangeAsMap,
    getCurrencyRatesUsdBase,
    getUidFromEmail,
    generateUniqueId
} from "../functions/functions";
import { formatDate } from "../functions/utilities";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";
import cron from 'node-cron';

const userController = require('./userController');

exports.blogCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    console.log(body);

    const comments = body.comments || false; // allow comments?
    const name = body.name;
    const textShort = body.textShort;
    const schedulePost = body.schedulePost || Date.now();
    const mainHashtag = body.mainHashtag;
    const hashtags = body.hashtags;
    const communityId = body.communityId;
    const selectedFormat = body.selectedFormat; // 0 story 1 wall post
    const description = body.description;
    const descriptionArray = body.descriptionArray;

    /*let blogPostGet = await db.collection(collections.blogPost).get();
    let newId = blogPostGet.size + 1;*/

    const uid = generateUniqueId();

    if (name && textShort) {
      let data : any = {
        comments: comments,
        name: name,
        textShort: textShort,

        schedulePost: schedulePost,
        mainHashtag: mainHashtag,
        hashtags: hashtags,
        communityId: communityId,
        selectedFormat: selectedFormat,
        description: description,
        descriptionArray: descriptionArray,
        descriptionImages: [],
        responses: [],
        hasPhoto: false,
        createdBy: req.body.priviUser.id,
        createdAt: Date.now(),
        updatedAt: null,
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.blogPost).doc('' + uid), data);
      });

      let ret = {id: uid, ...data};
      res.send({success: true, data: ret});

    } else {
      console.log('parameters required');
      res.send({ success: false, message: "parameters required" });
    }

  } catch (err) {
    console.log('Error in controllers/blogController -> blogCreate()', err);
    res.send({ success: false });
  }
}

exports.changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const blogPostRef = db.collection(collections.blogPost)
        .doc(req.file.originalname);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();
      if (blogPost.HasPhoto) {
        await blogPostRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/blogPost/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/blogController -> changePostPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> changePostPhoto()', err);
    res.send({ success: false });
  }
}

exports.changePostDescriptionPhotos = async (req: express.Request, res: express.Response) => {
    try {
        let blogPostId = req.params.blogPostId;
        let files : any[] = [];
        let fileKeys : any[] = Object.keys(req.files);

        fileKeys.forEach(function(key) {
          files.push(req.files[key]);
        });

        if (files) {
            let filesName : string[] = [];
            const blogPostRef = db.collection(collections.blogPost)
                .doc(blogPostId);
            const blogPostGet = await blogPostRef.get();
            const blogPost: any = blogPostGet.data();

            for(let i = 0; i < files.length; i++) {
              filesName.push('/' + blogPostId + '/' + files[i].originalname)
            }
            console.log(req.params.blogPostId, filesName)
            await blogPostRef.update({
              descriptionImages: filesName
            });
            res.send({ success: true });
        } else {
            console.log('Error in controllers/blogController -> changePostDescriptionPhotos()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/blogController -> changePostDescriptionPhotos()', err);
        res.send({ success: false });
    }
}

exports.getBlogPost =  async (req: express.Request, res: express.Response) => {
  try {
    let params : any = req.params;
    let posts : any[] = [];

    const blogPostQuery = await db.collection(collections.blogPost)
      .where("communityId", "==", params.communityId).get();
    if(!blogPostQuery.empty) {
      for (const doc of blogPostQuery.docs) {
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
    console.log('Error in controllers/blogController -> getBlogPost()', err);
    res.send({ success: false });
  }
}

exports.getBlogPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.blogPostId;
    if (postId) {
      const directoryPath = path.join('uploads', 'blogPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'blogPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getBlogPostPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getBlogPostPhotoById()', err);
    res.send({ success: false });
  }
};
exports.getBlogPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.blogPostId;
    let photoId = req.params.photoId;
    console.log('postId', postId, photoId);
    if (postId && photoId) {
      const directoryPath = path.join('uploads', 'blogPost', 'photos-' + postId);
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
      let raw = fs.createReadStream(path.join('uploads', 'blogPost', 'photos-' + postId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getBlogPostPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getBlogPostPhotoById()', err);
    res.send({ success: false });
  }
};

exports.makeResponseBlogPost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    console.log('body', body);
    if (body && body.blogPostId && body.response && body.userId && body.userName) {
      const blogPostRef = db.collection(collections.blogPost)
        .doc(body.blogPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let responses : any[] = [...blogPost.responses];
      responses.push({
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: Date.now()
      })
      await blogPostRef.update({
        responses: responses
      });
      res.send({ success: true, data: responses });

    } else {
      console.log('Error in controllers/blogController -> makeResponseBlogPost()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> makeResponseBlogPost()', err);
    res.send({ success: false });
  }
};

exports.likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemPostId && body.userId) {
      const blogPostRef = db.collection(collections.blogPost)
        .doc(body.itemPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let likes = [...blogPost.likes];
      let dislikes = [...blogPost.dislikes];
      let numLikes = blogPost.numLikes;
      let numDislikes = blogPost.numDislikes;

      let likeIndex = likes.findIndex(user => user === body.userId);
      if(likeIndex === -1) {
        likes.push(body.userId);
        numLikes = blogPost.numLikes + 1;
      }

      let dislikeIndex = dislikes.findIndex(user => user === body.userId);
      if(dislikeIndex !== -1) {
        dislikes.splice(dislikeIndex, 1);
        numDislikes = numDislikes - 1;
      }

      await blogPostRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes
      });

      blogPost.likes = likes;
      blogPost.dislikes = dislikes;
      blogPost.numLikes = numLikes;
      blogPost.numDislikes = numDislikes;

      if(blogPost.createdBy !== body.userId) {
        await userController.updateUserCred(blogPost.createdBy, true);
      }

      res.send({ success: true, data: blogPost });

    } else {
      console.log('Error in controllers/blogController -> likePost()', "Info not provided");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> likePost()', err);
    res.send({ success: false });
  }
};

exports.dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.itemPostId && body.userId) {
      const blogPostRef = db.collection(collections.blogPost)
        .doc(body.itemPostId);
      const blogPostGet = await blogPostRef.get();
      const blogPost: any = blogPostGet.data();

      let dislikes = [...blogPost.dislikes];
      let likes = [...blogPost.likes];
      let numLikes = blogPost.numLikes;
      let numDislikes = blogPost.numDislikes;

      let likeIndex = likes.findIndex(user => user === body.userId);
      if(likeIndex !== -1) {
        likes.splice(likeIndex, 1);
        numLikes = numLikes - 1;
      }

      let dislikeIndex = dislikes.findIndex(user => user === body.userId);
      if(dislikeIndex === -1) {
        dislikes.push(body.userId);
        numDislikes = blogPost.numDislikes + 1
      }

      await blogPostRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes
      });

      blogPost.likes = likes;
      blogPost.dislikes = dislikes;
      blogPost.numLikes = numLikes;
      blogPost.numDislikes = numDislikes;

      if(blogPost.createdBy !== body.userId) {
        await userController.updateUserCred(blogPost.createdBy, false);
      }

      res.send({ success: true, data: blogPost });

    } else {
      console.log('Error in controllers/blogController -> likePost()', "Info not provided");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> likePost()', err);
    res.send({ success: false });
  }
};

/*exports.adCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    //const comments = body.comments || false; // allow comments?
    const name = body.name;
    const type = body.type;
    const textShort = body.textShort;
    const schedulePost = body.schedulePost || Date.now();
    const mainHashtag = body.mainHashtag;
    const hashtags = body.hashtags;
    const communityId = body.communityId || '';
    const creditPoolId = body.creditPoolId || '';
    // const selectedFormat = body.selectedFormat; // 0 story 1 wall post
    const description = body.description;
    const descriptionArray = body.descriptionArray;

    const uid = generateUniqueId();

    if (name && textShort) {
      let data : any = {
        //comments: comments,
        name: name,
        textShort: textShort,
        schedulePost: schedulePost,
        mainHashtag: mainHashtag,
        hashtags: hashtags,
        communityId: communityId,
        creditPoolId: creditPoolId,
        description: description,
        descriptionArray: descriptionArray,
        descriptionImages: [],
        //responses: [],
        hasPhoto: false,
        createdBy: req.body.priviUser.id,
        createdAt: Date.now(),
        updatedAt: null,
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.ad).doc('' + uid), data);
      });

      let ret = {id: uid, ...data};

      const commRef = db.collection(collections.community).doc(communityId);
      const commGet = await commRef.get();
      const community: any = commGet.data();

      let obj : any = {};
      obj[type] = uid;
      await commRef.update(obj)

      res.send({success: true, data: ret});
    } else {
      console.log('parameters required');
      res.send({ success: false, message: "Error in controllers/blogController -> adCreate(): parameters required" });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> adCreate()', err);
    res.send({ success: false });
  }
}

exports.changeAdPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const adRef = db.collection(collections.ad)
        .doc(req.file.originalname);
      const adGet = await adRef.get();
      const adPost: any = adGet.data();
      if (adPost.HasPhoto) {
        await adRef.update({
          HasPhoto: true
        });
      }

      let dir = 'uploads/ad/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/blogController -> changeAdPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> changeAdPhoto()', err);
    res.send({ success: false });
  }
}

exports.changeAdDescriptionPhotos = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    let files : any[] = [];
    let fileKeys : any[] = Object.keys(req.files);

    fileKeys.forEach(function(key) {
      files.push(req.files[key]);
    });

    if (files) {
      let filesName : string[] = [];
      const adRef = db.collection(collections.ad)
        .doc(adId);
      const adGet = await adRef.get();
      const adPost: any = adGet.data();

      for(let i = 0; i < files.length; i++) {
        filesName.push('/' + adId + '/' + files[i].originalname)
      }
      console.log(req.params.blogPostId, filesName)
      await adRef.update({
        descriptionImages: filesName
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/blogController -> changeAdDescriptionPhotos()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> changeAdDescriptionPhotos()', err);
    res.send({ success: false });
  }
}


exports.getAdPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    if (adId) {
      const directoryPath = path.join('uploads', 'ad');
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
      let raw = fs.createReadStream(path.join('uploads', 'ad', adId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getAdPostPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getAdPostPhotoById()', err);
    res.send({ success: false });
  }
};
exports.getAdPostDescriptionPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let adId = req.params.adId;
    let photoId = req.params.photoId;
    console.log('adId', adId, photoId);
    if (adId && photoId) {
      const directoryPath = path.join('uploads', 'ad', 'photos-' + adId);
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
      let raw = fs.createReadStream(path.join('uploads', 'ad', 'photos-' + adId, photoId + '.png'));
      raw.on('error', function (err) {
        console.log(err)
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/blogController -> getAdPostDescriptionPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/blogController -> getAdPostDescriptionPhotoById()', err);
    res.send({ success: false });
  }
};*/

const createPost = exports.createPost = (body, collection, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const comments = body.comments || false; // allow comments?
      const name = body.name;
      const textShort = body.textShort;
      const schedulePost = body.schedulePost || Date.now();
      const mainHashtag = body.mainHashtag;
      const hashtags = body.hashtags;
      const selectedFormat = body.selectedFormat; // 0 story 1 wall post
      const description = body.description;
      const descriptionArray = body.descriptionArray;

      /*let blogPostGet = await db.collection(collections.blogPost).get();
      let newId = blogPostGet.size + 1;*/

      const uid = generateUniqueId();

      if (name && textShort) {
        let data: any = {
          comments: comments,
          name: name,
          textShort: textShort,
          schedulePost: schedulePost,
          mainHashtag: mainHashtag,
          hashtags: hashtags,
          selectedFormat: selectedFormat,
          description: description,
          descriptionArray: descriptionArray,
          descriptionImages: [],
          responses: [],
          pinned: false,
          hasPhoto: false,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: null,
        };

        if(collection === 'blogPost') {
          data.communityId = body.communityId;
          await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.blogPost).doc('' + uid), data);
          });
        } else if(collection === 'podWallPost') {
          data.podId = body.podId;
          await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.podWallPost).doc('' + uid), data);
          });
        } else if(collection === 'creditWallPost') {
          data.creditPoolId = body.creditPoolId;
          await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.creditWallPost).doc('' + uid), data);
          });
        } else if(collection === 'insuranceWallPost') {
          data.insuranceId = body.insuranceId;
          await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.insuranceWallPost).doc('' + uid), data);
          });
        } else if(collection === 'communityWallPost') {
          data.communityId = body.communityId;
          await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.communityWallPost).doc('' + uid), data);
          });
        }

        let ret = {id: uid, ...data};

        resolve(ret);
      } else {
        console.log('parameters required missing');
        reject('Error in createPost: ' + 'parameters required missing')
      }
    } catch (e) {
      reject('Error in createPost: ' + e)
    }
  });
}

const likeItemPost = exports.likeItemPost = (dbRef, dbGet, dbItem, userId, creator) => {
  return new Promise(async(resolve, reject) => {
    try {
      let likes = [...dbItem.likes];
      let dislikes = [...dbItem.dislikes];
      let numLikes = dbItem.numLikes;
      let numDislikes = dbItem.numDislikes;

      let likeIndex = likes.findIndex(user => user === userId);
      if(likeIndex === -1) {
        likes.push(userId);
        numLikes = dbItem.numLikes + 1;
      }

      let dislikeIndex = dislikes.findIndex(user => user === userId);
      if(dislikeIndex !== -1) {
        dislikes.splice(dislikeIndex, 1);
        numDislikes = numDislikes - 1;
      }

      await dbRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes
      });

      dbItem.likes = likes;
      dbItem.dislikes = dislikes;
      dbItem.numLikes = numLikes;
      dbItem.numDislikes = numDislikes;

      if(creator !== userId) {
        await userController.updateUserCred(creator, true);
      }

      resolve(dbItem);
    } catch (e) {
      console.log('Error in controllers/blogController -> likeItemPost()', e)
      reject('Error in controllers/blogController -> likeItemPost()' + e)
    }
  })
}

const dislikeItemPost = exports.dislikeItemPost = (dbRef, dbGet, dbItem, userId, creator) => {
  return new Promise(async(resolve, reject) => {
    try {
      let likes = [...dbItem.likes];
      let dislikes = [...dbItem.dislikes];
      let numLikes = dbItem.numLikes;
      let numDislikes = dbItem.numDislikes;

      let likeIndex = likes.findIndex(user => user === userId);
      if(likeIndex !== -1) {
        likes.splice(likeIndex, 1);
        numLikes = numLikes - 1;
      }

      let dislikeIndex = dislikes.findIndex(user => user === userId);
      if(dislikeIndex === -1) {
        dislikes.push(userId);
        numDislikes = dbItem.numDislikes + 1
      }

      await dbRef.update({
        likes: likes,
        dislikes: dislikes,
        numLikes: numLikes,
        numDislikes: numDislikes
      });

      dbItem.likes = likes;
      dbItem.dislikes = dislikes;
      dbItem.numLikes = numLikes;
      dbItem.numDislikes = numDislikes;

      if(creator !== userId) {
        await userController.updateUserCred(creator, true);
      }

      resolve(dbItem);
    } catch (e) {
      console.log('Error in controllers/blogController -> dislikeItemPost()', e)
      reject('Error in controllers/blogController -> dislikeItemPost()' + e)
    }
  })
}

const pinItemPost = exports.pinItemPost = (dbRef, dbGet, dbItem, pinned) => {
  return new Promise(async(resolve, reject) => {
    try {
      await dbRef.update({
        pinned: pinned
      });

      dbItem.pinned = pinned;
      resolve(dbItem);
    } catch (e) {
      console.log('Error in controllers/blogController -> pinItemPost()', e)
      reject('Error in controllers/blogController -> pinItemPost()' + e)
    }
  })
}

exports.removeStories = cron.schedule('* * */1 * *', async () => {
  // TODO at some point we should add here request with limit and offset to avoid performance issue
  try {
    console.log("********* Stories removeStories() cron job started *********");

    // Communities
    await elementWallPost(collections.communityWallPost, collections.community, 'communityId')

    // Pod
    await elementWallPost(collections.podWallPost, collections.podsFT, 'podId')

    // Credit
    await elementWallPost(collections.creditWallPost, collections.priviCredits, 'creditPoolId')

    // Insurance
    await elementWallPost(collections.insuranceWallPost, collections.insurance, 'insuranceId')

  } catch (err) {
    console.log('Error in controllers/blogController -> removeStories()', err)
  }
});

const elementWallPost = async (postCollection, itemCollection, itemIdLabel) => {
  let timeStampYesterday = Math.round(new Date().getTime() / 1000) - (24 * 3600);
  let yesterdayDateTimestamp = new Date(timeStampYesterday*1000).getTime();

  const postQuery = await db.collection(postCollection)
    .where("createdAt", "<", yesterdayDateTimestamp).get();

  if(!postQuery.empty) {
    for (const doc of postQuery.docs) {
      let data = doc.data();
      let id = doc.id;

      const itemRef = db.collection(itemCollection)
        .doc(data[itemIdLabel]);
      const itemGet = await itemRef.get();
      const item: any = itemGet.data();

      if(item && item.Posts) {
        let posts = [...item.Posts];
        let indexFound = posts.findIndex(post => post === id);

        posts.splice(indexFound, 1);
        await itemRef.update({
          Posts: posts
        });

        await db.collection(postCollection).doc(id).delete();
      }
    }
  }
}