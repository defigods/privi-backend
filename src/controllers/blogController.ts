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

      let dir = 'uploads/blog-post/' + req.file.originalname;

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