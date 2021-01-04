import { updateFirebase, createNotification, getRateOfChangeAsMap, getCurrencyRatesUsdBase, getUidFromEmail } from "../functions/functions";
import { formatDate } from "../functions/utilities";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import express from 'express';
import path from 'path';
import fs from "fs";

module.exports.blogCreate = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    console.log(body);
/*
comments: true,
name: 'title',
textShort: 'text short',
schedulePost: 1609424580000,
mainHashtag: '#main',
hashtags: [ '#main', '#tag2' ],
communityId: 'Px4487bc42-43ff-46cc-b19a-4ab40a4a8417',
selectedFormat: 1,
description: 'sdfsfdsfsdfds',
*/

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

    let blogPostGet = await db.collection(collections.blogPost).get();
    let newId = blogPostGet.size + 1;

    if (name && textShort) {
      let data = {
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

          createdBy: req.body.priviUser.id,
          createdAt: Date.now(),
          updatedAt: null,
        };

      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.blogPost).doc('' + newId), data);
      });

      let ret = {id: newId, ...data};
      res.send({success: true, data: ret});

    } else {
      console.log('parameters required');
      res.send({ success: false, message: "parameters required" });
    }

  } catch (err) {
    console.log('Error in controllers/blogController -> blogCreate()', err);
    res.send({ success: false });
  }


} // blogCreate
