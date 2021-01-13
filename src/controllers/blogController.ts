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