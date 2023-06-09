import express, { response } from 'express';

import Web3 from 'web3';
import { ETH_INFURA_KEY, ETH_PRIVI_ADDRESS, ETH_CONTRACTS_ABI_VERSION, ETH_PRIVI_KEY } from '../constants/configuration';

import podFTProtocol from '../blockchain/podFTProtocol';
import podNFTProtocol from '../blockchain/podNFTProtocol';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import {
  updateFirebase,
  getRateOfChangeAsMap,
  getEmailUidMap,
  generateUniqueId,
  getMarketPrice,
  getSellTokenAmountPod,
  getBuyTokenAmountPod,
  addZerosToHistory,
} from '../functions/functions';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import axios from 'axios';
import cron from 'node-cron';
const fs = require('fs');
const path = require('path');
import coinBalance from '../blockchain/coinBalance.js';
import mediaPod from '../blockchain/mediaPod';
const { keccak } = require("ethereumjs-util")

const notificationsController = require('./notificationsController');
const chatController = require('./chatController');
const communityController = require('./communityController');
const tasks = require('./tasksController');
require('dotenv').config();
const apiKey = 'PRIVI'; // process.env.API_KEY;

/////////////////////////// COMMON //////////////////////////////

// auxiliar function used to update common fields of both NFT and FT pod (name, desc, hashtags..)
async function updateCommonFields(body: any, podId: string, isPodFT: boolean) {
  const name = body.Name;
  const description = body.Description;
  const mainHashtag = body.MainHashtag; // recently added
  const hashtags = body.Hashtags;
  const isPrivate = body.Private;
  const hasPhoto = body.HasPhoto;
  const dicordId = body.DiscordID; // recently added
  const endorsementScore = body.EndorsementScore;
  const trustScore = body.TrustScore;
  const admins = body.Admins;
  const requiredTokens = body.RequiredTokens; // {$Token: Amount} recently added (maybe handled by blockchain, thus don't need to add it again here)
  const advertising = body.Advertising;
  const verified = body.Verified || false;

  let podRef = db.collection(collections.podsFT).doc(podId);
  if (!isPodFT) podRef = db.collection(collections.podsNFT).doc(podId);

  podRef.set(
    {
      Name: name || '',
      Description: description || '',
      MainHashtag: mainHashtag || '',
      Hashtags: hashtags || [],
      Private: isPrivate || false,
      HasPhoto: hasPhoto || false,
      EndorsementScore: endorsementScore || 0.5,
      TrustScore: trustScore || 0.5,
      Admins: admins || [],
      DiscordId: dicordId || '',
      RequiredTokens: requiredTokens || {},
      Advertising: advertising || true,
      Verified: verified || false,
    },
    { merge: true }
  );
}

// edit community
exports.editPod = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let collection = body.IsDigital ? 'PodsNFT' : 'PodsFT';

    const podRef = db.collection(collection).doc(body.PodAddress);

    await podRef.update({
      Name: body.Name,
      Description: body.Description,
      urlSlug: body.urlSlug,
    });

    res.send({
      success: true,
      data: {
        Name: body.Name,
        Description: body.Description,
        urlSlug: body.urlSlug,
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> editPod()', err);
    res.send({ success: false });
  }
};

// adds +1 to views counter
exports.sumTotalViews = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let totalViews = body.TotalViews ? body.TotalViews : 0;
    let collection = body.IsDigital ? 'PodsNFT' : 'PodsFT';

    const podRef = db.collection(collection).doc(body.PodAddress);

    await podRef.update({
      TotalViews: totalViews + 1,
    });

    res.send({
      success: true,
      data: {
        TotalViews: totalViews + 1,
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> sumTotalViews()', err);
    res.send({ success: false });
  }
};

exports.like = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podAddress = body.PodAddress;
    const userAddress = body.userAddress;
    let collection = body.IsDigital ? 'podNFT' : 'podFT';
    const userSnap = await db.collection(collections.user).doc(userAddress).get();
    const podSnap = await db.collection(collection).doc(podAddress).get();
    const userData: any = userSnap.data();
    const podData: any = podSnap.data();

    let userLikes = userData.Likes ?? [];
    let podLikes = podData.Likes ?? [];

    if (body.liked) {
      userLikes.push({
        date: Date.now(),
        type: collection,
        id: podAddress,
      });
      podLikes.push({
        date: Date.now(),
        userId: userAddress,
      });
    } else {
      userLikes = userLikes.filter((item) => item.id !== podAddress);
      podLikes = podLikes.filter((item) => item.userId !== userAddress);
    }

    userSnap.ref.update({
      Likes: userLikes,
    });
    podSnap.ref.update({
      Likes: podLikes,
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/podController -> like(): ', err);
    res.send({ success: false });
  }
};

/**
 * Pod creator/admin invites a list of users to assume some role // the list could be only one elem
 * @param req array (invitationlist) of object {adminId, isPodFT, podId, invitedUser, role}. isPodFT boolean, adminId is an uid and inivtedUser an email
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.inviteRole = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const invitationList: any[] = body.invitationList;
    let ok: boolean = true;
    for (var i = 0; i < invitationList.length && ok; i++) {
      const obj = invitationList[i];
      const inviterId: string = obj.inviterId; // uid
      const isPodFT: boolean = obj.isPodFT;
      const podId: string = obj.podId;
      const invitedUser: string = obj.invitedUser; // email
      const role: string = obj.role;

      const emailToUid = await getEmailUidMap();
      const adminSnap = await db.collection(collections.user).doc(inviterId).get();
      if (!adminSnap.exists) ok = false;
      const invitedSnap = await db.collection(collections.user).doc(emailToUid[invitedUser]).get();
      if (!invitedSnap.exists) ok = false;
      let podCol = collections.podsFT;
      if (!isPodFT) podCol = collections.podsNFT;
      const podSnap = await db.collection(podCol).doc(podId).get();
      // // check if inviterId is one of the admins of the pod
      // const podData = podSnap.data();
      // if (!podData || !podData.Admin || !podData.Admin.includes(inviterId)) ok = false;
      if (ok) {
        // save invitation in pod invitation colecction
        const map = 'RoleInvitation.' + invitedUser;
        const newDocRef = await podSnap.ref.collection(collections.podRoleInvitation).add({
          invitedEmail: invitedUser,
          invitedId: emailToUid[invitedUser],
          role: role,
          date: Date.now(),
          replied: false,
          accept: false,
        });
        // save invitation at user invitation collection (both invitation doc have same docId)
        invitedSnap.ref.collection(collections.podRoleInvitation).doc(newDocRef.id).set({
          podId: podId,
          isPodFT: isPodFT,
          inviter: inviterId,
          role: role,
          date: Date.now(),
          replied: false,
          accept: false,
        });
      }
    }
    if (ok) res.send({ success: true });
    else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/podController -> inviteRole(): ', err);
    res.send({ success: false });
  }
};

/**
 * Invited users (by pod admins) can accept or decline the role invitation, then this invitation pass to be replied
 * @param req {userId, invitationId, accept}. userId is the uid of the user, invitationId the doc id of the invitation, accept is a boolean
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.replyRoleInvitation = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId: string = body.userId;
    const invitationId: string = body.invitationId;
    const accept: boolean = body.accept;
    const invitationSnap = await db
      .collection(collections.user)
      .doc(userId)
      .collection(collections.podRoleInvitation)
      .doc(invitationId)
      .get();
    if (invitationSnap.exists) {
      const invitationData = invitationSnap.data();
      // only not replied invitations
      if (invitationData && !invitationData.replied) {
        const podId = invitationData.podId;
        let podCol = collections.podsFT;
        if (!invitationData.isPodFT) podCol = collections.podsNFT;
        // when accepted, update pod roles (map) field
        if (accept) {
          const podSnap = await db.collection(podCol).doc(podId).get();
          const podData = podSnap.data();
          if (podData) {
            const currRoleArray: string[] = podData.roles[invitationData.role]; // get current users (array) for this role
            if (!currRoleArray.includes(userId)) currRoleArray.push(userId); // add this new accepted user
            const rolesMap = 'roles.' + invitationData.role; // update
            podSnap.ref.update({ rolesMap: currRoleArray });
          }
        }
        // update user invitation (doc)  to replied
        invitationSnap.ref.update({ replied: true, accept: accept });
        // update pod invitation (doc) to replied
        db.collection(podCol)
          .doc(podId)
          .collection(collections.podRoleInvitation)
          .doc(invitationId)
          .update({ replied: true, accept: accept });
      }
    }
  } catch (err) {
    console.log('Error in controllers/podController -> inviteRole(): ', err);
    res.send({ success: false });
  }
};

/**
 * Invite user to view a pod, this function store a view invitation doc in users collection
 * @param req {userId, inviterId, podId, isPodFT}. userId is the uid of the user, inviterId the uid of the persone who invites,
 * podId the id of teh pod, isPodFT boolean that tells if the pod is FT/NFT
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.inviteView = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId: string = body.userId;
    const inviterId: string = body.inviterId;
    const podId: string = body.podId;
    const isPodFT: boolean = body.isPodFT;
    const userSnap = await db.collection(collections.user).doc(userId).get();
    if (userSnap.exists) {
      let url = 'https://privibeta.web.app/#/FTPod/' + podId;
      if (!isPodFT) url = 'https://privibeta.web.app/#/NFTPod/' + podId;
      userSnap.ref.collection(collections.podViewInvitation).add({
        inviter: inviterId,
        podId: podId,
        isPodFT: isPodFT,
        url: url,
        date: Date.now(),
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> inviteView(): invited user doesnt exists');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> inviteView(): ', err);
    res.send({ success: false });
  }
};

/**
 * Function used to change a pods photo, that is uploading the image file (name = podId) to the server's storage
 * @param req file, the file to upload to server's disk
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.changeFTPodPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const podRef = db.collection(collections.podsFT).doc(req.file.originalname);

      const podGet = await podRef.get();
      const pod: any = await podGet.data();

      if (pod.HasPhoto !== undefined) {
        await podRef.update({
          HasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> changePodPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> changePodPhoto()', err);
    res.send({ success: false });
  }
};

exports.updateFTPodPhotoDimensions = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const podRef = db.collection(collections.podsFT).doc(body.id);

    await podRef.update({
      dimensions: body.dimensions || '',
    });

    res.send({
      success: true,
      data: {
        dimensions: body.dimensions || '',
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> updateFTPodPhotoDimensions()', err);
    res.send({ success: false });
  } 
};

exports.changeNFTPodPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const podRef = db.collection(collections.podsNFT).doc(req.file.originalname);

      const podGet = await podRef.get();
      const pod: any = await podGet.data();

      if (pod.HasPhoto !== undefined) {
        await podRef.update({
          HasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> changePodPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> changePodPhoto()', err);
    res.send({ success: false });
  }
};

exports.updateNFTPodPhotoDimensions = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const podRef = db.collection(collections.podsNFT).doc(body.id);

    await podRef.update({
      dimensions: body.dimensions || '',
    });

    res.send({
      success: true,
      data: {
        dimensions: body.dimensions || '',
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> updateNFTPodPhotoDimensions()', err);
    res.send({ success: false });
  } 
};

exports.changeWIPPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const workInProgressRef = db.collection(collections.workInProgress).doc(req.file.originalname);

      const workInProgressGet = await workInProgressRef.get();
      const workInProgress: any = await workInProgressGet.data();

      if (workInProgress.HasPhoto !== undefined) {
        await workInProgressRef.update({
          HasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> changeWIPPhoto()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> changeWIPPhoto()', err);
    res.send({ success: false, error: err });
  }
};
exports.changeWIPPhotoToken = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const workInProgressRef = db.collection(collections.workInProgress).doc(req.file.originalname);

      const workInProgressGet = await workInProgressRef.get();
      const workInProgress: any = await workInProgressGet.data();

      if (workInProgress.HasPhoto !== undefined) {
        await workInProgressRef.update({
          HasPhotoToken: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> changeWIPPhotoToken()', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> changeWIPPhotoToken()', err);
    res.send({ success: false, error: err });
  }
};

exports.getPhotoWIP = async (req: express.Request, res: express.Response) => {
  try {
    let wipId = req.params.wipId;
    if (wipId) {
      const directoryPath = path.join('uploads', 'wip');
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
      let raw = fs.createReadStream(path.join('uploads', 'wip', wipId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podController -> getPhotoWIP()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getPhotoWIP()', err);
    res.send({ success: false, error: err });
  }
};

exports.getPhotoTokenWIP = async (req: express.Request, res: express.Response) => {
  try {
    let wipId = req.params.wipId;
    if (wipId) {
      const directoryPath = path.join('uploads', 'wipToken');
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
      let raw = fs.createReadStream(path.join('uploads', 'wipToken', wipId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podController -> getPhotoTokenWIP()', "There's no post id...");
      res.send({ success: false, error: "There's no post id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getPhotoTokenWIP()', err);
    res.send({ success: false, error: err });
  }
};

/**
 * Function used to retrieve a pod's photo from server, if the pod has image then this image is stored with name = podId
 * @param req podId as params
 * @param res {success}. success: boolean that indicates if the opreaction is performed. And the image is transferred to client with pipe
 */
exports.getPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    console.log(podId);
    if (podId) {
      const directoryPath = path.join('uploads', 'pods');
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
      let raw = fs.createReadStream(path.join('uploads', 'pods', podId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podController -> getPhotoId()', "There's no pod id...");
      res.send({ success: false, error: "There's no pod id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getPhotoId()', err);
    res.send({ success: false, error: err });
  }
};

/**
 * Function used to retrieve a pod's photo from server, if the pod has image then this image is stored with name = podId
 * @param req podId as params
 * @param res {success}. success: boolean that indicates if the opreaction is performed. And the image is transferred to client with pipe
 */
exports.getNFTPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    console.log(podId);
    if (podId) {
      const directoryPath = path.join('uploads', 'pods');
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
      let raw = fs.createReadStream(path.join('uploads', 'pods', podId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/podController -> getPhotoId()', "There's no pod id...");
      res.send({ success: false, error: "There's no pod id..." });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getPhotoId()', err);
    res.send({ success: false, error: err });
  }
};

/**
 * Function called when a user request to follow a pod (FT/NFT), updating both user and firebase docs
 * @param req {userId, podId, podType} podType in [FT, NFT]
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.followPod = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId = body.userId;
    const podId = body.podId;
    const podType = body.podType; // FT or NFT

    // update user
    const userSnap = await db.collection(collections.user).doc(userId).get();
    let podRef = collections.podsFT;
    if (podType == 'NFT') podRef = collections.podsNFT;

    let followingPodsFieldName = 'followingFTPods';
    let numFollowingPodsFieldName = 'numFollowingFTPods';
    if (podType == 'NFT') {
      followingPodsFieldName = 'followingNFTPods';
      numFollowingPodsFieldName = 'numFollowingNFTPods';
    }

    let followingPods: string[] = [];
    let numFollowingPods = 0;
    const userData: any = userSnap.data();

    if (userData && userData[followingPodsFieldName]) followingPods = userData[followingPodsFieldName];
    if (userData && userData[numFollowingPodsFieldName]) numFollowingPods = userData[numFollowingPodsFieldName];
    followingPods.push(podId);
    numFollowingPods += 1;

    const userUpdateObj = {};
    userUpdateObj[followingPodsFieldName] = followingPods;
    userUpdateObj[numFollowingPodsFieldName] = numFollowingPods;

    userSnap.ref.update(userUpdateObj);

    // update pod
    const podSnap = await db.collection(podRef).doc(podId).get();
    let followerArray: any[] = [];
    const podData: any = podSnap.data();
    if (podData && podData.Followers) followerArray = podData.Followers;
    followerArray.push({
      date: Date.now(),
      id: userId,
    });

    podSnap.ref.update({
      Followers: followerArray,
    });

    await notificationsController.addNotification({
      userId: userId,
      notification: {
        type: 13,
        typeItemId: 'Pod',
        itemId: podId,
        follower: userData.firstName,
        pod: podData.Name,
        comment: '',
        token: '',
        amount: '',
        onlyInformation: false,
        otherItemId: '',
      },
    });

    await notificationsController.addNotification({
      userId: podData.Creator,
      notification: {
        type: 32,
        typeItemId: 'user',
        itemId: userId,
        follower: userData.firstName,
        pod: podData.Name,
        comment: '',
        token: '',
        amount: '',
        onlyInformation: false,
        otherItemId: podId,
      },
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/podController -> followPod(): ', err);
    res.send({ success: false });
  }
};

/**
 * Function called when a user request to unfollow a pod (FT/NFT), updating both user and firebase docs
 * @param req {userId, podId, podType} podType in [FT, NFT]
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.unFollowPod = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId = body.userId;
    const podId = body.podId;
    const podType = body.podType; // FT or NFT

    // update user
    const userSnap = await db.collection(collections.user).doc(userId).get();
    let podRef = collections.podsFT;
    if (podType == 'NFT') podRef = collections.podsNFT;

    let followingPodsFieldName = 'followingFTPods';
    let numFollowingPodsFieldName = 'numFollowingFTPods';
    if (podType == 'NFT') {
      followingPodsFieldName = 'followingNFTPods';
      numFollowingPodsFieldName = 'numFollowingNFTPods';
    }

    let followingPods: string[] = [];
    let numFollowingPods = 0;
    const userData = userSnap.data();

    if (userData && userData[followingPodsFieldName]) followingPods = userData[followingPodsFieldName];
    if (userData && userData[numFollowingPodsFieldName]) numFollowingPods = userData[numFollowingPodsFieldName];
    followingPods = followingPods.filter((val, index, arr) => {
      return val !== podId;
    });
    numFollowingPods -= 1;

    const userUpdateObj = {};
    userUpdateObj[followingPodsFieldName] = followingPods;
    userUpdateObj[numFollowingPodsFieldName] = numFollowingPods;

    console.log(userUpdateObj);
    userSnap.ref.update(userUpdateObj);

    // update pod
    const podSnap = await db.collection(podRef).doc(podId).get();
    let followerArray: any[] = [];
    const podData: any = podSnap.data();
    if (podData && podData.Followers) followerArray = podData.Followers;
    followerArray = followerArray.filter((val, index, arr) => {
      return val.id && val.id !== userId;
    });

    podSnap.ref.update({
      Followers: followerArray,
    });

    await notificationsController.addNotification({
      userId: userId,
      notification: {
        type: 14,
        typeItemId: 'Pod',
        itemId: podId,
        follower: '',
        pod: podData.Name,
        comment: '',
        token: '',
        amount: '',
        onlyInformation: false,
        otherItemId: '',
      },
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/podController -> unfollowPod(): ', err);
    res.send({ success: false });
  }
};

/////////////////////////// POD FT //////////////////////////////

exports.initiateFTPOD = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    console.log('initiateFTPOD', body);
    const creator = body.PodInfo.Creator;
    const fundingToken = body.PodInfo.FundingToken;
    const interestDue = body.InterestDue;
    const dimensions = body.dimensions;

    let rateOfChangeBody: any = {};
    const rateOfChange = await getRateOfChangeAsMap();
    for (let key in body.RateChange) {
      rateOfChangeBody[body.RateChange[key]] = rateOfChange[body.RateChange[key]];
    }

    const blockchainRes = await podFTProtocol.initiatePOD(
      body.PodInfo,
      rateOfChangeBody,
      body.Hash,
      body.Signature,
      apiKey
    );

    if (blockchainRes && blockchainRes.success) {
      console.log(blockchainRes.output);
      const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
      await updateFirebase(blockchainRes); // update blockchain res
      await updateCommonFields(body, podId, true); // update common fields

      // Add Pod Id into user myFTPods array
      const userRef = db.collection(collections.user).doc(creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const discordChatCreation: any = await chatController.createDiscordChat(creator, user.firstName);
      await chatController.createDiscordRoom(
        discordChatCreation.id,
        'Discussions',
        creator,
        user.firstName,
        'general',
        false,
        []
      );
      await chatController.createDiscordRoom(
        discordChatCreation.id,
        'Information',
        creator,
        user.firstName,
        'announcements',
        false,
        []
      );

      await db.collection(collections.podsFT).doc(podId).set(
        {
          InterstDue: interestDue,
          DiscordId: discordChatCreation.id,
          Posts: [],
          PodReachInvestors: false,
          dimensions: dimensions ||'',
        },
        { merge: true }
      );

      const userSnap = await db.collection(collections.user).doc(creator).get();
      const userData: any = userSnap.data();

      await notificationsController.addNotification({
        userId: creator,
        notification: {
          type: 10,
          typeItemId: 'pod',
          itemId: podId,
          follower: creator,
          pod: body.PodInfo.TokenSymbol,
          comment: '',
          token: fundingToken,
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });

      userData.followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.user,
          notification: {
            type: 56,
            typeItemId: 'user',
            itemId: creator,
            follower: userData.firstName,
            pod: podId,
            comment: '',
            token: '',
            amount: '',
            onlyInformation: false,
            otherItemId: podId,
          },
        });
      });

      // // Create Pod Rate Doc
      // const newPodRate = 0.01;
      // db.collection(collections.rates).doc(podId).set({ type: collections.ftToken, rate: newPodRate });
      const podSnap = await db.collection(collections.podsFT).doc(podId).get();

      let myFTPods: any[] = user.myFTPods || [];
      // todo: consider, which info we really want to put here
      myFTPods.push(podSnap.id);

      await userRef.update({
        myFTPods: myFTPods,
      });

      res.send({ success: true, data: podId });
    } else {
      console.log('Error in controllers/podController -> initiatePOD(): success = false.', blockchainRes.message);
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> initiateFTPOD(): ', err);
    res.send({ success: false, error: err });
  }
};

exports.deleteFTPOD = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const publicId = body.Creator;
    const podId = body.PodAddress;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await podFTProtocol.deletePod(publicId, podId, hash, signature, apiKey);

    const podSnap = await db.collection(collections.PodsFT).doc(podId).get();
    const podData: any = podSnap.data();
    const userSnap = await db.collection(collections.user).doc(podData.Creator).get();
    const userData: any = userSnap.data();

    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      /*createNotification(publicId, "FT Pod - Pod Deleted",
                ` `,
                notificationTypes.podDeletion
            );*/
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 11,
          typeItemId: 'pod',
          itemId: podId,
          follower: podData.Creator,
          pod: podData.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });

      podData.Followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.id,
          notification: {
            type: 57,
            typeItemId: 'user',
            itemId: podData.Creator,
            follower: podData.Creator,
            pod: podData.Name,
            comment: '',
            token: '',
            amount: '',
            onlyInformation: false,
            otherItemId: '',
          },
        });
      });
      userData.followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.user,
          notification: {
            type: 57,
            typeItemId: 'user',
            itemId: podData.Creator,
            follower: podData.Creator,
            pod: podData.Name,
            comment: '',
            token: '',
            amount: '',
            onlyInformation: false,
            otherItemId: '',
          },
        });
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> deletePOD(): success = false.', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> deletePOD(): ', err);
    res.send({ success: false });
  }
};

exports.investFTPOD = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    // console.log('investFTPOD body',body)
    const investorId = body.Investor;
    const podId = body.PodAddress;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podFTProtocol.investPOD(investorId, podId, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      // calculate pod tokens to receive
      const podSnap = await db.collection(collections.podsFT).doc(podId).get();
      const data: any = podSnap.data();
      const supplyReleased = data.SupplyReleased;
      const amm = data.AMM;
      const podTokenToReceive = getBuyTokenAmountPod(amm, supplyReleased, amount);
      const fundingTokenPerPodToken = amount / podTokenToReceive;

      // add txn to pod
      const output = blockchainRes.output;
      console.log('investFT:', JSON.stringify(output, null, 4));
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        podSnap.ref.collection(collections.podTransactions).doc(tid).set({ Transactions: txnArray });
      }
      // add to PriceOf the day
      podSnap.ref.collection(collections.priceOfTheDay).add({
        price: fundingTokenPerPodToken,
        date: Date.now(),
      });
      // add new investor entry
      let newInvestors = {};
      if (data.Investors) newInvestors = data.Investors;

      if (newInvestors[investorId]) newInvestors[investorId] += amount;
      else newInvestors[investorId] = amount;
      podSnap.ref.update({ Investors: newInvestors });

      //update discord chat
      const discordRoomSnap = await db
        .collection(collections.discordChat)
        .doc(data.DiscordId)
        .collection(collections.discordRoom)
        .get();
      if (!discordRoomSnap.empty) {
        for (const doc of discordRoomSnap.docs) {
          let dataRoom = doc.data();
          if (!dataRoom.private) {
            chatController.addUserToRoom(data.DiscordId, doc.id, investorId, 'Member');
          }
        }
      }

      /*createNotification(investorId, "FT Pod - Pod Invested",
                ` `,
                notificationTypes.podInvestment
            );*/
      const podData: any = podSnap.data();
      const investorSnap = await db.collection(collections.user).doc(investorId).get();
      const investorData: any = investorSnap.data();

      await notificationsController.addNotification({
        userId: investorId,
        notification: {
          type: 12,
          typeItemId: 'user',
          itemId: podId,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: podData.TokenSymbol,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 15,
          typeItemId: 'user',
          itemId: investorId,
          follower: investorData.firstName,
          pod: podData.Name,
          comment: '',
          token: podData.TokenSymbol,
          amount: amount,
          onlyInformation: false,
          otherItemId: podId,
        },
      });
      if (podData.Followers && podData.Followers.length > 0) {
        podData.Followers.forEach(async (item, i) => {
          if (item.id !== investorId) {
            await notificationsController.addNotification({
              userId: item.id,
              notification: {
                type: 60,
                typeItemId: 'user',
                itemId: investorId,
                follower: investorData.firstName,
                pod: podData.Name,
                comment: '',
                token: '',
                amount: amount,
                onlyInformation: false,
                otherItemId: '',
              },
            });
          }
        });
      }

      if (!podData.PodReachInvestors && Object.keys(newInvestors).length >= 5) {
        let task = await tasks.updateTask(
          podData.Creator,
          'Your Pod has at least 5 investors who invested test tokens'
        );
        await podSnap.ref.update({ PodReachInvestors: true });
        res.send({ success: true });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> investPOD(): success = false.', blockchainRes.message);
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> investPOD(): ', err);
    res.send({ success: false, error: err });
  }
};

exports.sellFTPOD = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    // console.log('sellFTPOD', body)
    const investorId = body.Investor;
    const podId = body.PodAddress;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podFTProtocol.sellPOD(investorId, podId, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      // calculate funding token to receive
      const podSnap = await db.collection(collections.podsFT).doc(podId).get();
      const data: any = podSnap.data();
      const fundingTokenToReceive = getSellTokenAmountPod(data.AMM, data.SupplyReleased, amount, data.RegimePoint);
      const fundingTokenPerPodToken = fundingTokenToReceive / amount;

      // add txn to pod
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        podSnap.ref.collection(collections.podTransactions).doc(tid).set({ Transactions: txnArray });
      }
      // add to PriceOf the day
      podSnap.ref.collection(collections.priceOfTheDay).add({
        price: fundingTokenPerPodToken,
        date: Date.now(),
      });
      // delete investor entry
      let newInvestors = {};
      if (data.Investors) newInvestors = data.Investors;

      if (newInvestors[investorId]) {
        newInvestors[investorId] -= amount;
        if (newInvestors[investorId] <= 0) delete newInvestors[investorId];
      }
      podSnap.ref.update({ Investors: newInvestors });

      /*createNotification(investorId, "FT Pod - Pod Token Sold",
                ` `,
                notificationTypes.podInvestment
            );*/
      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> sellFTPOD(): success = false.', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> sellFTPOD(): ', err);
    res.send({ success: false });
  }
};

exports.swapFTPod = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const investorId = body.investorId;
    const liquidityPoolId = body.liquidityPoolId;
    const podId = body.podId;
    const amount = body.amount;
    const rateOfChange = await getRateOfChangeAsMap();
    const blockchainRes = await podFTProtocol.swapPOD(investorId, liquidityPoolId, podId, amount, rateOfChange);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      console.log(blockchainRes);
      /*createNotification(investorId, "FT Pod - Pod Swapped",
                ` `,
                notificationTypes.podSwapGive
            );*/
      const podSnap = await db.collection(collections.PodsFT).doc(podId).get();
      const podData: any = podSnap.data();
      const investorSnap = await db.collection(collections.user).doc(investorId).get();
      const investorData: any = investorSnap.data();
      await notificationsController.addNotification({
        userId: investorId,
        notification: {
          type: 17,
          typeItemId: 'user',
          itemId: podId,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: podData.TokenSymbol,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 16,
          typeItemId: 'user',
          itemId: investorId,
          follower: investorData.firstName,
          pod: podData.Name,
          comment: '',
          token: podData.TokenSymbol,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      if (podData.Investors && podData.size !== 0) {
        let investorsId: any[] = [...podData.Investors.keys()];
        investorsId.forEach(async (item, i) => {
          await notificationsController.addNotification({
            userId: item,
            notification: {
              type: 19,
              typeItemId: 'user',
              itemId: podId,
              follower: investorData.firstName,
              pod: podData.Name,
              comment: '',
              token: '',
              amount: amount,
              onlyInformation: false,
              otherItemId: '',
            },
          });
        });
      }
      investorData.followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.user,
          notification: {
            type: 18,
            typeItemId: 'user',
            itemId: podId,
            follower: investorData.firstName,
            pod: podData.Name,
            comment: '',
            token: '',
            amount: amount,
            onlyInformation: false,
            otherItemId: '',
          },
        });
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/podController -> swapPod(): success = false.', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> swapPod(): ', err);
    res.send({ success: false });
  }
};

// ------------------------ Price Calculations -----------------------------

// get pod price for API
exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podId = body.podId;
    const amount = body.amount;
    const podSnap = await db.collection(collections.podsFT).doc(podId).get();
    const data: any = podSnap.data();
    const price = getBuyTokenAmountPod(data.AMM, data.SupplyReleased, amount);
    res.send({ success: true, data: price });
  } catch (err) {
    console.log('Error in controllers/podController -> getBuyTokenAmount(): ', err);
    res.send({ success: false });
  }
};

// get funding tokens for API
exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const podId = body.podId;
    const amount = body.amount;
    const podSnap = await db.collection(collections.podsFT).doc(podId).get();
    const data: any = podSnap.data();
    const price = getSellTokenAmountPod(data.AMM, data.SupplyReleased, amount, data.RegimePoint);
    res.send({ success: true, data: price });
  } catch (err) {
    console.log('Error in controllers/podController -> getSellTokenAmount(): ', err);
    res.send({ success: false });
  }
};

// get funding tokens for API
exports.getMarketPrice = async (req: express.Request, res: express.Response) => {
  try {
    const podId = req.params.podId;
    const podSnap = await db.collection(collections.podsFT).doc(podId).get();
    const data = podSnap.data();
    let price = NaN;
    if (data) {
      const supplyReleased = data.SupplyReleased;
      const amm = data.AMM;
      price = getMarketPrice(amm, supplyReleased);
    }
    res.send({ success: true, data: price });
  } catch (err) {
    console.log('Error in controllers/podController -> getSellTokenAmount(): ', err);
    res.send({ success: false });
  }
};

exports.getMyPodsFT = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    res.send({ success: true, data: user.myFTPods });
  } catch (err) {
    console.log('Error in controllers/podController -> getMyPods()', err);
    res.send({ success: false });
  }
};

// filtering the top 10 pods with most followers
const countLastWeekPods = (exports.countLastWeekPods = (allPodsArray): Promise<any[]> => {
  return new Promise<any[]>((resolve, reject) => {
    let lastWeek = new Date();
    let pastDate = lastWeek.getDate() - 7;
    lastWeek.setDate(pastDate);

    if (allPodsArray && allPodsArray.length > 0) {
      allPodsArray.forEach((item, i) => {
        if (item.Followers && item.Followers.length > 0) {
          let lastWeekFollowers = item.Followers.filter(
            (follower) => follower.date._seconds > lastWeek.getTime() / 1000
          );
          item.lastWeekFollowers = lastWeekFollowers.length;
        } else {
          item.lastWeekFollowers = 0;
        }
        if (allPodsArray.length === i + 1) {
          let sortedArray = allPodsArray.sort((a, b) =>
            a.lastWeekFollowers > b.lastWeekFollowers ? 1 : b.lastWeekFollowers > a.lastWeekFollowers ? -1 : 0
          );
          let trendingArray = sortedArray.slice(0, 10);
          resolve(trendingArray);
        }
      });
    } else {
      resolve([]);
    }
  });
});

exports.getOtherPodsFT = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let query;
    for (const pod of user.myFTPods) {
      query = db.collection(collections.podsFT).where('PodAddress', '!=', pod.PodAddress);
    }
    if (!query) {
      query = db.collection(collections.podsFT);
    }

    let podsFTSnap = await query.get();
    let podsFT: any[] = [];
    podsFTSnap.docs.forEach((p) => {
      podsFT.push(p.data());
    });

    res.send({ success: true, data: podsFT });
  } catch (err) {
    console.log('Error in controllers/podController -> getOtherPods()', err);
    res.send({ success: false });
  }
};

exports.getAllFTPodsInfo = async (req: express.Request, res: express.Response) => {
  try {
    const lastCommunity = +req.params.pagination;
    const lastId: string = req.params.lastId;

    let allFTPods = await getFTPods(lastCommunity, lastId);

    res.send({
      success: true,
      data: {
        FTPods: allFTPods ?? [],
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> getOtherPods()', err);
    res.send({ success: false });
  }
};

exports.getTrendingPodsFT = async (req: express.Request, res: express.Response) => {
  try {
    const trendingFTPods: any[] = [];
    const ftPodsSnap = await db.collection(collections.trendingPodsFT).get();
    for (let podSnap of ftPodsSnap.docs) {
      let podData = podSnap.data();
      let ftPod = await db.collection(collections.podsFT).doc(podData.id).get();
      if (ftPod.exists) {
        trendingFTPods.push(ftPod.data());
      }
    }

    res.send({ success: true, data: { trending: trendingFTPods } });
  } catch (e) {
    console.log('Error in controllers/podController -> getTrendingFTPods()', e);
    res.send({ success: false, message: e });
  }
};

exports.setTrendingPodsFT = cron.schedule('* * * * *', async () => {
  try {
    let allFTPods: any[] = [];
    let podsFT = await db.collection(collections.podsFT).get();
    podsFT.docs.forEach((p) => {
      let data = p.data();
      data.id = p.id;
      allFTPods.push(data);
    });
    let trendingFTPods: any[] = await countLastWeekPods(allFTPods);

    let batch = db.batch();

    await db
      .collection(collections.trendingPodsFT)
      .listDocuments()
      .then((val) => {
        val.map((val) => {
          batch.delete(val);
        });
      });
    await trendingFTPods.forEach((doc) => {
      let docRef = db.collection(collections.trendingPodsFT).doc();
      batch.set(docRef, { id: doc.id });
    });
    await batch.commit();
  } catch (err) {
    console.log('Error in controllers/podController -> setTrendingFTPods()', err);
  }
});

const removeSomePodsFromArray = (fullArray, arrayToRemove): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    if (arrayToRemove && arrayToRemove.length !== 0) {
      arrayToRemove.forEach((item, i) => {
        let index = fullArray.findIndex((itemFullArray) => itemFullArray.id === item.id);

        if (index && index === -1) {
          fullArray = fullArray.slice(index, 1);
        }

        if (arrayToRemove.length === i + 1) {
          resolve(fullArray);
        }
      });
    } else {
      resolve(fullArray);
    }
  });
};

const getFTPods = (exports.getFTPods = (pagination, lastId): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    let podsFT: any;

    if (lastId && lastId !== 'null') {
      const podFTRef = db.collection(collections.podsFT).doc(lastId);
      const podFTGet = await podFTRef.get();
      const podFT: any = podFTGet.data();

      podsFT = await db.collection(collections.podsFT).orderBy('Date').startAfter(podFT.Date).limit(6).get();
    } else {
      podsFT = await db.collection(collections.podsFT).orderBy('Date').limit(6).get();
    }

    let array: any[] = [];
    podsFT.docs.map((doc) => {
      let data = doc.data();
      data.id = doc.id;
      array.push(data);
    });
    resolve(array);
  });
});

exports.getFTPod = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    console.log(podId);
    if (podId) {
      const podRef = db.collection(collections.podsFT).doc(podId);
      const podGet = await podRef.get();
      const pod: any = podGet.data();

      // also send back pod rate and PC rate
      const val = 0.01; // val by default
      pod.rates = {};
      pod.rates[pod.FundingToken] = val;
      pod.rates[podId] = val;
      pod.id = podGet.id;
      const rateSnap = await db.collection(collections.rates).get();
      rateSnap.forEach((doc) => {
        if (doc.id == pod.FundingToken || doc.id == podId) {
          // only need these two
          const rate = doc.data().rate;
          pod.rates[doc.id] = rate;
        }
      });
      pod.PostsArray = [];
      if (pod.Posts && pod.Posts.length > 0) {
        for (const post of pod.Posts) {
          const podWallPostSnap = await db.collection(collections.podWallPost).doc(post).get();
          const podWallPostData: any = podWallPostSnap.data();
          podWallPostData.id = podWallPostSnap.id;
          pod.PostsArray.push(podWallPostData);
        }
      }

      pod.VotingsArray = [];
      if (pod.Votings && pod.Votings.length > 0) {
        for (const voting of pod.Votings) {
          const votingSnap = await db.collection(collections.voting).doc(voting).get();
          const votingData: any = votingSnap.data();
          votingData.id = votingSnap.id;
          pod.VotingsArray.push(votingData);
        }
      }

      const discordChatSnap = await db.collection(collections.discordChat).doc(pod.DiscordId).get();
      const discordChatData: any = discordChatSnap.data();
      if (discordChatData && discordChatData.admin) {
        pod.DiscordAdminId = discordChatData.admin.id;
      }

      // add url if empty //
      if (!pod.hasOwnProperty('urlSlug') || pod.urlSlug == '') {
        await db
          .collection(collections.podsFT)
          .doc(podId)
          .update({
            urlSlug: pod.Name.split(' ').join(''),
          });
      }

      res.send({ success: true, data: pod });
    } else {
      console.log('Error in controllers/podController -> getFTPod()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getFTPod()', err);
    res.send({ success: false });
  }
};

exports.getFTPodTransactions = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    const txns: any[] = [];
    // console.log('getFTPodTransactions request', podId)
    if (podId) {
      const podTxnSnapshot = await db
        .collection(collections.podsFT)
        .doc(podId)
        .collection(collections.podTransactions)
        .get();

      if (!podTxnSnapshot.empty) {
        // console.log('getFTPodTransactions snap', podTxnSnapshot.docs)
        podTxnSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          // console.log('getFTPodTransactions doc', data)
          txns.push(data.Transactions);
        });
        res.send({ success: true, data: txns });
      } else {
        res.send({ success: false, data: txns });
      }
    } else {
      console.log('Error in controllers/podController -> getFTPodTransactions()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getFTPodTransactions()', err);
    res.send({ success: false });
  }
};

// get price history and today prices, merged and sorted (by ascending date)
exports.getFTPodPriceHistory = async (req: express.Request, res: express.Response) => {
  try {
    // comparator function used to sort by ascending date
    const comparator = (a, b) => {
      if (a.date > b.date) return 1;
      if (b.date > a.date) return -1;
      return 0;
    };
    let podId = req.params.podId;
    const data: any[] = [];
    if (podId) {
      const priceHistorySnap = await db
        .collection(collections.podsFT)
        .doc(podId)
        .collection(collections.priceHistory)
        .get();
      priceHistorySnap.forEach((doc) => {
        data.push(doc.data());
      });
      const todayPriceSnap = await db
        .collection(collections.podsFT)
        .doc(podId)
        .collection(collections.priceOfTheDay)
        .get();
      todayPriceSnap.forEach((doc) => {
        data.push(doc.data());
      });
      // sort data by ascending date
      data.sort(comparator);
      res.send({ success: true, data: data });
    } else {
      console.log('Error in controllers/podController -> getFTPodTransactions()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getFTPodTransactions()', err);
    res.send({ success: false });
  }
};
// get supply history merged sorted by ascending date
exports.getFTPodSupplyHistory = async (req: express.Request, res: express.Response) => {
  try {
    // comparator function used to sort by ascending date
    const comparator = (a, b) => {
      if (a.date > b.date) return 1;
      if (b.date > a.date) return -1;
      return 0;
    };
    let podId = req.params.podId;
    const data: any[] = [];
    if (podId) {
      const priceHistorySnap = await db
        .collection(collections.podsFT)
        .doc(podId)
        .collection(collections.supplyHistory)
        .get();
      priceHistorySnap.forEach((doc) => {
        data.push(doc.data());
      });
      // sort data by ascending date
      data.sort(comparator);
      res.send({ success: true, data: data });
    } else {
      console.log('Error in controllers/podController -> getFTPodSupplyHistory()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getFTPodSupplyHistory()', err);
    res.send({ success: false });
  }
};

//////////////////////////////////////////////////////////////
/////////////////////////// NFT //////////////////////////////
//////////////////////////////////////////////////////////////

/**
 * Get all the information of NFT pods, that is the users pod, others pod and treding pods.
 * @param req {userId as params}.
 * @param res {success, data{myNFTPods, otherNFTPods, trendingNFTPods} }. success: boolean that indicates if the opreaction is performed, data: containing the requested data
 */
exports.getAllNFTPodsInfo = async (req: express.Request, res: express.Response) => {
  try {
    const lastCommunity = +req.params.pagination;
    const lastId: string = req.params.lastId;

    let allNFTPods: any[] = await getNFTPods(lastCommunity, lastId);
    res.send({
      success: true,
      data: {
        NFTPods: allNFTPods ?? [],
      },
    });
  } catch (err) {
    console.log('Error in controllers/podController -> getOtherPods()', err);
    res.send({ success: false });
  }
};

exports.getMyPodsNFT = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    res.send({ success: true, data: user.myNFTPods });
  } catch (err) {
    console.log('Error in controllers/podController -> getMyPods()', err);
    res.send({ success: false });
  }
};

/**
 * Get others NFT pods, that is all pods which are not created by the user
 * @param req {userId as params}.
 * @param res {success, otherNFTPods}. success: boolean that indicates if the opreaction is performed, otherNFTPods contains the requested others pods
 */
exports.getOtherPodsNFT = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let query;
    for (const pod of user.myNFTPods) {
      query = db.collection(collections.podsNFT).where('PodAddress', '!=', pod.PodAddress);
    }
    if (!query) {
      query = db.collection(collections.podsNFT);
    }

    let podsNFTSnap = await query.get();
    let podsNFT: any[] = [];
    podsNFTSnap.docs.forEach((p) => {
      podsNFT.push(p.data());
    });

    res.send({ success: true, data: podsNFT });
  } catch (err) {
    console.log('Error in controllers/podController -> getOtherPodsNFT()', err);
    res.send({ success: false });
  }
};

/**
 * Get trending NFT pods
 * @param req
 * @param res {success, data }. success: boolean that indicates if the opreaction is performed, data: containing the requested trending pods
 */
exports.getTrendingPodsNFT = async (req: express.Request, res: express.Response) => {
  try {
    const trendingNFTPods: any[] = [];
    const nftPodsSnap = await db.collection(collections.trendingPodsNFT).get();
    for (let podSnap of nftPodsSnap.docs) {
      let podData = podSnap.data();
      let nftPod = await db.collection(collections.podsNFT).doc(podData.id).get();
      if (nftPod.exists) {
        trendingNFTPods.push(nftPod.data());
      }
    }

    res.send({ success: true, data: trendingNFTPods });
  } catch (err) {
    console.log('Error in controllers/podController -> getTrendingPods()', err);
    res.send({ success: false });
  }
};

exports.setTrendingPodsNFT = cron.schedule('* * * * *', async () => {
  try {
    let allNFTPods: any[] = [];
    let podsNFT = await db.collection(collections.podsNFT).get();
    podsNFT.docs.forEach((p) => {
      let data = p.data();
      data.id = p.id;
      allNFTPods.push(data);
    });
    let trendingNFTPods: any[] = await countLastWeekPods(allNFTPods);

    let batch = db.batch();

    await db
      .collection(collections.trendingPodsNFT)
      .listDocuments()
      .then((val) => {
        val.map((val) => {
          batch.delete(val);
        });
      });
    await trendingNFTPods.forEach((doc) => {
      let docRef = db.collection(collections.trendingPodsNFT).doc();
      batch.set(docRef, { id: doc.id });
    });
    await batch.commit();
  } catch (err) {
    console.log('Error in controllers/podController -> setTrendingNFTPods()', err);
  }
});

// function to get all NFT Pods
const getNFTPods = (exports.getNFTPods = (pagination, lastId): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    // let podsNFT;
    // if (lastNFTPod) {
    //   podsNFT = await db.collection(collections.podsNFT).startAfter(lastNFTPod).limit(5).get();
    // } else {
    //   podsNFT = await db.collection(collections.podsNFT).limit(6).get();
    // }

    let podsNFT: any;

    if (lastId && lastId !== 'null') {
      const podNFTRef = db.collection(collections.podsNFT).doc(lastId);
      const podNFTGet = await podNFTRef.get();
      const podNFT: any = podNFTGet.data();
  
      podsNFT = await db.collection(collections.podsNFT).orderBy('Date').startAfter(podNFT.Date).limit(6).get();
    } else {
      podsNFT = await db.collection(collections.podsNFT).orderBy('Date').limit(6).get();
    }

    let array: any[] = [];
    podsNFT.docs.map((doc, i) => {
      array.push(doc.data());
    });
    resolve(array);
  });
});


/**
 * Get the complete information of a particular pod
 * @param req {podId}
 * @param res {success, data }. success: boolean that indicates if the opreaction is performed, data: containing the requested pod
 */
exports.getNFTPod = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    if (podId) {
      const podSnap = await db.collection(collections.podsNFT).doc(podId).get();

      // add selling orders
      const sellingOffers: any[] = [];
      const sellingSnap = await podSnap.ref.collection(collections.sellingOffers).get();
      sellingSnap.forEach((doc) => sellingOffers.push(doc.data()));
      // add buying orders
      const buyingOffers: any[] = [];
      const buyingSnap = await podSnap.ref.collection(collections.buyingOffers).get();
      buyingSnap.forEach((doc) => buyingOffers.push(doc.data()));

      let pod: any = podSnap.data();
      pod.PostsArray = [];
      if (pod.Posts && pod.Posts.length > 0) {
        for (const post of pod.Posts) {
          const podWallPostSnap = await db.collection(collections.podNFTWallPost).doc(post).get();
          const podWallPostData: any = podWallPostSnap.data();
          podWallPostData.id = podWallPostSnap.id;
          pod.PostsArray.push(podWallPostData);
        }
      }

      // add url if empty //
      if (!pod.hasOwnProperty('urlSlug') || pod.urlSlug == '') {
        await db
          .collection(collections.podsNFT)
          .doc(podId)
          .update({
            urlSlug: pod.Name.split(' ').join(''),
          });
      }

      res.send({
        success: true,
        data: {
          pod: pod,
          sellingOffers: sellingOffers,
          buyingOffers: buyingOffers,
        },
      });
    } else {
      console.log('Error in controllers/podController -> getNFTPod()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getNFTPod()', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function, used to initiate a NFT pod
 * if the operation is performed (success = true) then update firebase accordingly
 * @param req {creator, token, royalty, offers}. creator: uid of the creator, token: crypto in which the NFT will be sold/bought,
 * royalty: [0,1] number, offers: object {amount: price} that represent the initial token supply
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.initiateNFTPod = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;
    const tokenSymbol = body.TokenSymbol;
    const tokenName = body.TokenName;
    const supply = body.Supply;
    const royalty = body.Royalty;
    const expirationDate = new Date(body.ExpirationDate);
    const dimensions = body.dimensions;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podNFTProtocol.initiatePodNFT(
      creator,
      tokenSymbol,
      tokenName,
      supply,
      royalty,
      expirationDate,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes); // update blockchain res
      const output = blockchainRes.output;
      const podAddress = Object.keys(output.UpdatePods)[0];

      updateCommonFields(body, podAddress, false); // update common fields
      const podDocRef = db.collection(collections.podsNFT).doc(podAddress);
      // add zeros to graph
      addZerosToHistory(podDocRef.collection(collections.supplyHistory), 'supply');
      addZerosToHistory(podDocRef.collection(collections.priceHistory), 'price');

      // Update fields that only NFT Pods have
      const isDigital: boolean = body.IsDigital;
      podDocRef.set({ IsDigital: isDigital,           dimensions: dimensions || ''}, { merge: true });

      const name = body.Name;
      const userSnap = await db.collection(collections.user).doc(creator).get();
      const userData: any = userSnap.data();
      /*await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 0,
                    typeItemId: 'user',
                    itemId: podAddress,
                    follower: '',
                    pod: name,
                    comment: '',
                    token: tokenSymbol,
                    amount: '',
                    onlyInformation: false,
                    otherItemId: ''
                }
            });*/
      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
      let myNFTPods: any[] = userData.myNFTPods || [];
      myNFTPods.push(podSnap.id);

      await userSnap.ref.update({
        myNFTPods: myNFTPods,
      });

      userData.followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.user,
          notification: {
            type: 56,
            typeItemId: 'user',
            itemId: creator,
            follower: userData.firstName,
            pod: name,
            comment: '',
            token: '',
            amount: '',
            onlyInformation: false,
            otherItemId: '',
          },
        });
      });
      res.send({ data: podAddress, success: true });
    } else {
      console.log(
        'Error in controllers/podController -> initiateNFTPod(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> initiateNFTPod(): ', err);
    res.send({ success: false });
  }
};

exports.saveNFTMedia = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if (body) {
      const nftMediaObj: any = {
        HasPhoto: body.HasPhoto ?? false,
        HasPhotoToken: body.HasPhotoToken ?? false,
        Name: body.Name ?? '',
        Description: body.Description ?? '',
        Date: new Date().getTime(),

        MainHashtag: body.MainHashtag ?? '',
        Hashtags: body.Hashtags ?? [],
        OpenAdvertising: body.OpenAdvertising ?? false,
        OpenInvestment: body.openInvestment ?? false,
        SharingPercent: body.SharingPercent ?? '',

        Media: body.Media ?? 0,

        TokenName: body.TokenName ?? '',
        TokenSymbol: body.TokenSymbol ?? '',
        TokenDescription: body.TokenDescription ?? '',
        FundingToken: body.FundingToken ?? '',
        FundingTargetSupply: body.FundingTargetSupply ?? '',
        MaximumSupply: body.MaximumSupply ?? '',
        MaxPrice: body.MaxPrice ?? '',
        FundingPrice: body.FundingPrice ?? '',
        TradingSpread: body.TradingSpread ?? '',
        DividendFreq: body.DividendFreq ?? '',
        InitialSupply: body.InitialSupply ?? 0,
        InvestorShare: body.InvestorShare ?? 0,
        AMM: body.AMM ?? '',

        TokenNameValidation: body.TokenNameValidation ?? false,
        TokenSymbolValidation: body.TokenSymbolValidation ?? false,
        TokenDescriptionValidation: body.TokenDescriptionValidation ?? false,
        // FundingTokenValidation: body.FundingTokenValidation ?? false,
        FundingTargetSupplyValidation: body.FundingTargetSupplyValidation ?? false,
        MaximumSupplyValidation: body.MaximumSupplyValidation ?? false,
        MaxPriceValidation: body.MaxPriceValidation ?? false,
        FundingPriceValidation: body.FundingPriceValidation ?? false,
        TradingSpreadValidation: body.TradingSpreadValidation ?? false,
        InitialSupplyValidation: body.InitialSupplyValidation ?? false,
        InvestorShareValidation: body.InvestorShareValidation ?? false,
      };

      let mediaIdNFT = body.id;

      const creatorSnap = await db.collection(collections.user).doc(body.Creator).get();
      const creator: any = creatorSnap.data();

      if (body.id) {
        const workInProgressRef = db.collection(collections.workInProgress).doc(mediaIdNFT);
        const workInProgressGet = await workInProgressRef.get();
        const workInProgress: any = workInProgressGet.data();

        if (body.directlyUpdate) {
          nftMediaObj.Offers = body.Offers;
          await workInProgressRef.update(nftMediaObj);
        } else {
          await workInProgressRef.update(nftMediaObj);

          let diffOffers = body.Offers.filter(
            (item1) =>
              !workInProgress.Offers.some(
                (item2) => item2.userId === item1.userId && item2.amount === item1.amount && item2.token === item1.token
              )
          );

          for (let offer of diffOffers) {
            await changeOfferToWorkInProgressNFTPod(
              offer.userId,
              body.id,
              offer.status,
              offer.token,
              offer.amount,
              false,
              offer.paymentDate
            );
          }
        }
      } else {
        mediaIdNFT = generateUniqueId();

        db.collection(collections.workInProgress)
          .doc(mediaIdNFT)
          .set({
            ...nftMediaObj,
            Creator: body.Creator,
            Offers: body.Offers ?? [],
            WIPType: 'NFTMedia',
            dimensions: body.dimensions ?? '',
          });

        for (let offer of body.Offers) {
          const userSnap = await db.collection(collections.user).doc(offer.userId).get();
          const userData: any = userSnap.data();
          chatController.createChatWIPFromUsers(
            mediaIdNFT,
            body.Creator,
            offer.userId,
            creator.firstName,
            userData.firstName
          );

          await notificationsController.addNotification({
            userId: offer.userId,
            notification: {
              type: 99,
              typeItemId: 'user',
              itemId: body.Creator,
              follower: creator.firstName,
              pod: '',
              comment: '',
              token: offer.token,
              amount: offer.amount,
              onlyInformation: false,
              otherItemId: mediaIdNFT,
            },
          });
        }
      }

      res.send({
        success: true,
        data: {
          nftPodId: mediaIdNFT,
        },
      });
    } else {
      console.log('Error in controllers/podController -> saveNFTMedia(): success = false');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> saveNFTMedia(): ', err);
    res.send({ success: false, error: err });
  }
};

exports.addOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if (
      body &&
      body.userId &&
      body.offer &&
      body.offer.token &&
      body.offer.amount &&
      body.offer.paymentDate &&
      body.offer.userId &&
      body.offer.wipId &&
      body.Creator
    ) {
      const creatorSnap = await db.collection(collections.user).doc(body.Creator).get();
      const creator: any = creatorSnap.data();

      let mediaNFT: any;
      for (let offer of body.Offers) {
        const userSnap = await db.collection(collections.user).doc(offer.userId).get();
        const userData: any = userSnap.data();

        mediaNFT = await communityController.addOfferToWorkInProgress(body.userId, body.mediaIdNFT, body.offer);
        chatController.createChatWIPFromUsers(
          body.offer.wipId,
          body.Creator,
          offer.userId,
          creator.firstName,
          userData.firstName
        );
      }
      res.send({ success: true, data: mediaNFT });
    } else {
      console.log('Error in controllers/podController -> addOffer()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

exports.changeOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if (body && body.userId && body.mediaIdNFT && body.status) {
      let mediaNFT: any = await communityController.changeOfferToWorkInProgress(
        body.userId,
        body.mediaIdNFT,
        body.status,
        body.token,
        body.amount,
        body.notificationId || false,
        null,
        'mediaNFT'
      );

      res.send({ success: true, data: mediaNFT });
    } else {
      console.log('Error in controllers/podController -> addOffer()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> addOffer()', err);
    res.send({ success: false, error: err });
  }
};

exports.signTransactionAcceptOffer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    if (
      body &&
      body.sender &&
      body.receiver &&
      body.amountPeriod &&
      body.token &&
      body.startDate &&
      body.endDate &&
      body.Hash &&
      body.Signature &&
      body.userId &&
      body.mediaIdNFT
    ) {
      const blockchainRes = await mediaPod.createStreaming(
        body.sender,
        body.receiver,
        body.amountPeriod,
        body.token,
        body.startDate,
        body.endDate,
        body.Hash,
        body.Signature,
        apiKey
      );
      if (blockchainRes && blockchainRes.success) {
        const userRef = db.collection(collections.user).doc(body.userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let notificationIndex = user.notifications.findIndex(
          (not) => not.otherItemId === body.mediaIdNFT && not.type === 103
        );
        if (notificationIndex !== -1) {
          await notificationsController.removeNotification({
            userId: body.userId,
            notificationId: user.notifications[notificationIndex].id,
          });
        }
        res.send({ success: true });
      } else {
        console.log(
          'Error in controllers/podController -> signTransactionAcceptOffer(): success = false',
          blockchainRes.message
        );
        res.send({ success: false, error: 'Blockchain error' });
      }
    } else {
      console.log('Error in controllers/podController -> signTransactionAcceptOffer()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> signTransactionAcceptOffer()', err);
    res.send({ success: false, error: err });
  }
};

exports.getWIP = async (req: express.Request, res: express.Response) => {
  try {
    const params = req.params;

    console.log(params);

    if (params.mediaIdNFT) {
      const workInProgressRef = db.collection(collections.workInProgress).doc(params.mediaIdNFT);
      const workInProgressGet = await workInProgressRef.get();
      const workInProgress: any = workInProgressGet.data();

      if (params.notificationId && params.userId) {
        await notificationsController.removeNotification({
          userId: params.userId,
          notificationId: params.notificationId,
        });
      }

      res.send({ success: true, data: workInProgress });
    } else {
      console.log('Error in controllers/podController -> getWIP()', 'Missing data');
      res.send({ success: false, error: 'Missing data' });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getWIP()', err);
    res.send({ success: false, error: err });
  }
};

//TODO: Modify for NFTPod
const changeOfferToWorkInProgressNFTPod = (userId, wipId, status, token, amount, notificationId, paymentDate) => {
  return new Promise(async (resolve, reject) => {
    try {
      const workInProgressRef = db.collection(collections.workInProgress).doc(wipId);
      const workInProgressGet = await workInProgressRef.get();
      let workInProgress: any = workInProgressGet.data();

      let offers = [...workInProgress.Offers];
      let previousStatus: string = '';
      let userSavedId: string = '';

      let offerIndex = offers.findIndex((off) => off.userId === userId);
      if (offerIndex !== -1) {
        previousStatus = offers[offerIndex].status;
        offers[offerIndex].status = status;
        offers[offerIndex].token = token;
        offers[offerIndex].amount = amount;
        userSavedId = offers[offerIndex].userId;
      } else {
        userSavedId = userId;
        offers.push({
          status: 'pending',
          token: token,
          amount: amount,
          paymentDate: paymentDate,
          userId: userId,
        });
      }

      workInProgress.Offers = offers;
      await workInProgressRef.update({
        Offers: offers,
      });

      const creatorSnap = await db.collection(collections.user).doc(workInProgress.Creator).get();
      const creator: any = creatorSnap.data();

      const userSnap = await db.collection(collections.user).doc(userSavedId).get();
      const user: any = userSnap.data();

      if (status === 'accepted') {
        // ACCEPTED OFFER NOTIFICATION
        await notificationsController.addNotification({
          userId: workInProgress.Creator,
          notification: {
            type: 98,
            typeItemId: 'user',
            itemId: offers[offerIndex].userId,
            follower: user.firstName,
            pod: user.address, //userAddress
            comment: offers[offerIndex].paymentDate, //endDate
            token: offers[offerIndex].token,
            amount: offers[offerIndex].amount,
            onlyInformation: false,
            otherItemId: wipId,
          },
        });
      } else if (status === 'declined') {
        // DECLINED OFFER NOTIFICATION
        await notificationsController.addNotification({
          userId: workInProgress.Creator,
          notification: {
            type: 96,
            typeItemId: 'user',
            itemId: offers[offerIndex].userId,
            follower: user.firstName,
            pod: '',
            comment: '',
            token: offers[offerIndex].token,
            amount: offers[offerIndex].amount,
            onlyInformation: false,
            otherItemId: wipId,
          },
        });
        if (notificationId) {
          await notificationsController.removeNotification({
            userId: userId,
            notificationId: notificationId,
          });
        }

        let room: string = '';
        if (
          user &&
          user.firstName &&
          creator &&
          creator.firstName &&
          user.firstName.toLowerCase() < creator.firstName.toLowerCase()
        ) {
          room = '' + wipId + '' + userSavedId + '' + workInProgress.Creator;
        } else {
          room = '' + wipId + '' + workInProgress.Creator + '' + userSavedId;
        }
        const chatQuery = await db.collection(collections.chat).where('room', '==', room).get();
        if (!chatQuery.empty) {
          for (const doc of chatQuery.docs) {
            let data = doc.data();
            await db.collection(collections.chat).doc(doc.id).delete();
            if (data.messages && data.messages.length > 0) {
              for (const msg of data.messages) {
                await db.collection(collections.message).doc(msg).delete();
              }
            }
          }
        }
      } else if (status === 'negotiating') {
        if (token === null || amount === null) {
          // REFUSED OFFER NOTIFICATION
          await notificationsController.addNotification({
            userId: workInProgress.Creator,
            notification: {
              type: 97,
              typeItemId: 'user',
              itemId: offers[offerIndex].userId,
              follower: user.firstName,
              pod: '',
              comment: '',
              token: offers[offerIndex].token,
              amount: offers[offerIndex].amount,
              onlyInformation: false,
              otherItemId: wipId,
            },
          });
        } else {
          if (previousStatus === 'pending') {
            // FIRST OFFER -> STATUS CHANGE FROM PENDING TO NEGOTIATING
            chatController.createChatWIPFromUsers(
              wipId,
              workInProgress.Creator,
              userSavedId,
              creator.firstName,
              user.firstName
            );

            if (notificationId) {
              await notificationsController.removeNotification({
                userId: userId,
                notificationId: notificationId,
              });
            }
          } else {
            let notificationIndex = creator.notifications.findIndex(
              (not) => not.otherItemId === wipId && not.type === 97
            );
            if (notificationIndex !== -1) {
              await notificationsController.removeNotification({
                userId: workInProgress.Creator,
                notificationId: user.notifications[notificationIndex].id,
              });
            }
            // ANOTHER OFFER NOTIFICATION
            await notificationsController.addNotification({
              userId: offers[offerIndex].userId,
              notification: {
                type: 95,
                typeItemId: 'user',
                itemId: workInProgress.Creator,
                follower: creator.firstName,
                pod: '',
                comment: '',
                token: offers[offerIndex].token,
                amount: offers[offerIndex].amount,
                onlyInformation: false,
                otherItemId: wipId,
              },
            });
          }
        }
      } else if (status === 'pending') {
        //First offer - WIP already created
        await notificationsController.addNotification({
          userId: userSavedId,
          notification: {
            type: 94,
            typeItemId: 'user',
            itemId: workInProgress.Creator,
            follower: creator.firstName,
            pod: '',
            comment: '',
            token: token,
            amount: amount,
            onlyInformation: false,
            otherItemId: wipId,
          },
        });
      }

      resolve(workInProgress);
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Blockchain-Backend function, a user request a buy offer specifying the conditions
 * if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, amount, price}. trader: buyer
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.newBuyOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const orderId = body.Offer.OrderId;
    const buyerAddress = body.Offer.BAddress;
    const podAddress = body.Offer.PodAddress;
    const amount = body.Offer.Amount;
    const price = body.Offer.Price;
    const token = body.Offer.Token;

    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await podNFTProtocol.newBuyOrder(
      orderId,
      amount,
      price,
      token,
      podAddress,
      buyerAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
      const podData: any = podSnap.data();
      await notificationsController.addNotification({
        userId: buyerAddress,
        notification: {
          type: 20,
          typeItemId: 'user',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 21,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> newBuyOrder(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> newBuyOrder(): ', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function, a user who must hold some pod token, post a selling offer specifying the conditions (price, amount)
 * if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, amount, price}. trader: buyer
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.newSellOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const orderId = body.Offer.OrderId;
    const sellerAddress = body.Offer.SAddress;
    const podAddress = body.Offer.PodAddress;
    const amount = body.Offer.Amount;
    const price = body.Offer.Price;
    const token = body.Offer.Token;

    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await podNFTProtocol.newSellOrder(
      orderId,
      amount,
      price,
      token,
      podAddress,
      sellerAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
      const podData: any = podSnap.data();
      await notificationsController.addNotification({
        userId: sellerAddress,
        notification: {
          type: 22,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 23,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> newSellOrder(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> newSellOrder(): ', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function, the buy offer creator deletes the offer, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}.
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.deleteBuyOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const requesterAddress = body.RequesterAddress;
    const podAddress = body.PodAddress;
    const orderId = body.OrderId;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podNFTProtocol.deleteBuyOrder(
      orderId,
      requesterAddress,
      podAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // manually delete order
      db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId).delete();

      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
      const podData: any = podSnap.data();
      await notificationsController.addNotification({
        userId: requesterAddress,
        notification: {
          type: 24,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 25,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> deleteBuyOrder(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> deleteBuyOrder(): ', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function used to buy an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}.
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.deleteSellOrder = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const requesterAddress = body.RequesterAddress;
    const podAddress = body.PodAddress;
    const orderId = body.OrderId;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podNFTProtocol.deleteSellOrder(
      orderId,
      requesterAddress,
      podAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // manually delete order
      db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId).delete();

      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
      const podData: any = podSnap.data();
      await notificationsController.addNotification({
        userId: requesterAddress,
        notification: {
          type: 26,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      await notificationsController.addNotification({
        userId: podData.Creator,
        notification: {
          type: 27,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: podData.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function used to sell an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}. trader: the user that sells the pod token
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.sellPodTokens = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const buyerAddress = body.BAddress;
    const sellerAddress = body.SellerAddress;
    const amount = body.Amount;
    const podAddress = body.PodAddress;
    const orderId = body.OrderId;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await podNFTProtocol.sellPodTokens(
      podAddress,
      buyerAddress,
      orderId,
      amount,
      sellerAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();

      let price = 0;
      const data: any = podSnap.data();
      const orderSnap = await db
        .collection(collections.podsNFT)
        .doc(podAddress)
        .collection(collections.buyingOffers)
        .doc(orderId)
        .get();
      if (orderSnap.exists) {
        const data: any = orderSnap.data();
        price = data.Price;
      }
      // add txn to pod
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        podSnap.ref.collection(collections.podTransactions).doc(tid).set({ Transactions: txnArray });
      }
      // add to PriceOf the day
      if (price) {
        podSnap.ref.collection(collections.priceOfTheDay).add({
          price: price,
          date: Date.now(),
        });
      }

      await notificationsController.addNotification({
        userId: sellerAddress,
        notification: {
          type: 28,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: data.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
    res.send({ success: false });
  }
};

/**
 * Blockchain-Backend function used to buy an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}. trader: the user that buys the pod token
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.buyPodTokens = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const buyerAddress = body.BuyerAddress;
    const sellerAddress = body.SAddress;
    const amount = body.Amount;
    const podAddress = body.PodAddress;
    const orderId = body.OrderId;

    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await podNFTProtocol.buyPodTokens(
      podAddress,
      sellerAddress,
      orderId,
      amount,
      buyerAddress,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();

      let price = 0;
      const data: any = podSnap.data();
      const orderSnap = await db
        .collection(collections.podsNFT)
        .doc(podAddress)
        .collection(collections.sellingOffers)
        .doc(orderId)
        .get();
      if (orderSnap.exists) {
        const data: any = orderSnap.data();
        price = data.Price;
      }
      // add txn to pod
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        podSnap.ref.collection(collections.podTransactions).doc(tid).set({ Transactions: txnArray });
      }
      // add to PriceOf the day
      if (price) {
        podSnap.ref.collection(collections.priceOfTheDay).add({
          price: price,
          date: Date.now(),
        });
      }

      await notificationsController.addNotification({
        userId: buyerAddress,
        notification: {
          type: 29,
          typeItemId: 'NFTPod',
          itemId: podAddress,
          follower: '',
          pod: data.Name,
          comment: '',
          token: '',
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });

      let userTokens = await coinBalance.getTokensOfAddress(buyerAddress);
      if (userTokens && userTokens.success) {
        const output = userTokens.output;
        if (userTokens['NFTPOD'].length >= 5) {
          const userRef = db.collection(collections.user).doc(buyerAddress);
          const userGet = await userRef.get();
          const user: any = userGet.data();
          if (!user.boughtFiveTokens) {
            let task = await tasks.updateTask(buyerAddress, 'Own 5 different NFT Pod Tokens');
            await userRef.update({ boughtFiveTokens: true });
            res.send({ success: true });
          }
        }
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/podController -> buyPodTokens(), blockchain success = false, ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> buyPodTokens(): ', err);
    res.send({ success: false });
  }
};

/**
 * Function to get all the trasactions of the given pod
 * @param req {podId}. podId: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: transaction array
 */
exports.getNFTPodTransactions = async (req: express.Request, res: express.Response) => {
  try {
    let podId = req.params.podId;
    const txns: any[] = [];
    if (podId) {
      const podTxnSnapshot = await db
        .collection(collections.podsNFT)
        .doc(podId)
        .collection(collections.podTransactions)
        .get();
      podTxnSnapshot.forEach((doc) => {
        const data = doc.data();
        const transactions: any[] = data.Transactions ?? [];
        transactions.forEach((txn) => {
          txns.push(txn);
        });
      });
      console.log(txns);
      res.send({ success: true, data: txns });
    } else {
      console.log('Error in controllers/podController -> getNFTPodTransactions()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getNFTPodTransactions()', err);
    res.send({ success: false });
  }
};

/**
 * Function to get pod histories (price and supply) used by FE for graphs
 * @param req {podId}. podId: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: price and supply history arrays
 */
exports.getNFTPodHistories = async (req: express.Request, res: express.Response) => {
  try {
    // comparator function used to sort by ascending date
    const comparator = (a, b) => {
      if (a.date > b.date) return 1;
      if (b.date > a.date) return -1;
      return 0;
    };

    let podId = req.params.podId;
    if (podId) {
      // price history
      const priceHistory: any[] = [];
      const priceHistorySnap = await db
        .collection(collections.podsNFT)
        .doc(podId)
        .collection(collections.priceHistory)
        .get();
      priceHistorySnap.forEach((doc) => {
        priceHistory.push(doc.data());
      });
      const todayPriceSnap = await db
        .collection(collections.podsNFT)
        .doc(podId)
        .collection(collections.priceOfTheDay)
        .get();
      todayPriceSnap.forEach((doc) => {
        priceHistory.push(doc.data());
      });
      priceHistory.sort(comparator);
      // supply history
      const supplyHistory: any[] = [];
      const supplyHistorySnap = await db
        .collection(collections.podsNFT)
        .doc(podId)
        .collection(collections.supplyHistory)
        .get();
      supplyHistorySnap.forEach((doc) => {
        supplyHistory.push(doc.data());
      });
      supplyHistory.sort(comparator);

      res.send({
        success: true,
        data: {
          priceHistory: priceHistory,
          supplyHistory: supplyHistory,
        },
      });
    } else {
      console.log('Error in controllers/podController -> getNFTPodHistories()', "There's no pod id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/podController -> getNFTPodHistories()', err);
    res.send({ success: false });
  }
};

/**
 * Function to check pods data before creation.
 * @param req {podName}. podName: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: transaction array
 */
exports.checkPodInfo = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    const podSnap = await db.collection(collections.podsFT).where('Name', '==', body.podName).get();
    const podCheckSize: number = podSnap.size;
    let podExists: boolean = podCheckSize === 1 ? true : false;

    res.send({
      success: true,
      data: { podExists: podExists },
    });
  } catch (e) {
    return 'Error in controllers/podController -> checkPodInfo(): ' + e;
  }
};

exports.getNFTsList = async (req: express.Request, res: express.Response) => {
  const { address } = req.query;
  axios.post('https://api.thegraph.com/subgraphs/name/seniordev32/privi-pods', {
    query: `
      {
        nfts {
          id
          tokenId
          tokenURI
          account (where: { address: "${address}" } ) {
            id
            address
          }
        }
      }
    `
  })
  .then((response) => {
    if (response.data.errors) {
      res.send({ success: false, error: [response.data.errors[0].message] });
      return;
    }
    const nfts = [...(response.data.data.nfts || [])];
    for (const nft of nfts) {
      console.log(nft);
    }
    res.send({ success: true, nfts });
  })
  .catch((error) => {
    console.error(error)
    res.send({ success: false, error });
  })
}

//////////////////////////////////////////////////////////////
/////////////////////////// CRON JOBS //////////////////////////////
//////////////////////////////////////////////////////////////

// // helper function: calculate if deposited collateral is below required ccr level
// function isPodCollateralBellowLiquidation(amount: number, token: string, requiredLevel: number, collaterals: { [key: string]: number }, ratesOfChange: { [key: string]: number }) {
//     if (!requiredLevel || !collaterals || !ratesOfChange) return false;
//     let sum: number = 0; // collateral sum in USD
//     amount = amount * ratesOfChange[token];   // amount in USD
//     for (const [token, colValue] of Object.entries(collaterals)) {
//         let conversionRate = ratesOfChange[token];
//         if (!conversionRate) conversionRate = 1;
//         sum += colValue * conversionRate;
//     }
//     return (sum / amount < requiredLevel);
// }

// // helper function: get array of object of tokens whice values are list of uids of users that have loan with ccr lower than required level
// async function getPodList() {
//     const res: string[] = [];
//     const rateOfChange = await getRateOfChangeAsMap();
//     const podsSnap = await db.collection(collections.podsFT).get();
//     podsSnap.forEach(async (podDoc) => {
//         const data = podDoc.data();
//         const podId: string = podDoc.id;
//         const minLiquidation: number = data.P_liquidation;
//         const amount: number = data.Principal;
//         const token: string = data.Token;
//         const collaterals: { [key: string]: number } = data.Pools.Collateral_Pool;
//         if (isPodCollateralBellowLiquidation(amount, token, minLiquidation, collaterals, rateOfChange)) res.push(podId);
//     });
//     return res;
// }
/**
 * cron job scheduled every 5 min, checks the liquidation of each pod (that is ccr below required level)
 */
// exports.checkLiquidation = cron.schedule('*/5 * * * *', async () => {
//     try {
//         console.log("********* Pod checkLiquidation() cron job started *********");
//         const rateOfChange = await getRateOfChangeAsMap();
//         const candidates = await getPodList();
//         const podIdUidMap = {}; // maps podId to creatorId, used to notify creator when pod liquidated
//         const podsSnap = await db.collection(collections.podsFT).get();
//         podsSnap.forEach((doc) => {
//         podIdUidMap[doc.id] = doc.data().Creator;
//      });
//         candidates.forEach(async (podId) => {
//             const blockchainRes = await podFTProtocol.checkPODLiquidation(podId, rateOfChange);
//             if (blockchainRes && blockchainRes.success && blockchainRes.output.Liquidated == "YES") {
//                 updateFirebase(blockchainRes);
//                 createNotification(podIdUidMap[podId], "FT Pod - Pod Liquidated",
//                     ` `,
//                     notificationTypes.podLiquidationFunds
//                 );
//                 const podSnap = await db.collection(collections.podsFT).doc(podId).get();
//                 const podData : any = podSnap.data();
//                 await notificationsController.addNotification({
//                     userId: podIdUidMap[podId],
//                     notification: {
//                         type: 58,
//                         typeItemId: 'FTPod',
//                         itemId: podId,
//                         follower: '',
//                         pod: podData.Name,
//                         comment: '',
//                         token: '',
//                         amount: '',
//                         onlyInformation: false,
//                          otherItemId: ''
//                     }
//                 });
//             } else {
//                 console.log('Error in controllers/podController -> checkLiquidation().', podId, blockchainRes.message);
//             }
//         });
//         console.log("--------- Pod checkLiquidation() finished ---------");
//     } catch (err) {
//         console.log('Error in controllers/podController -> checkLiquidation()', err);
//     }
// });

/**
 * cron job scheduled every day at 00:00, calculate if its a payment day for a pod.
 * For each candidate pod call blockchain/payInterest function
 */
// exports.payInterest = cron.schedule('0 0 * * *', async () => {
//     try {
//         console.log("********* Pod payInterest() cron job started *********");
//         const rateOfChange = await getRateOfChangeAsMap();
//         const podsSnap = await db.collection(collections.podsFT).get();
//         podsSnap.forEach(async (pod) => {
//             const data = pod.data();
//             if (data.State.Status == "INITIATED") {
//                 const duration: number = data.Duration;
//                 const payments: number = data.Payments;
//                 // both duration and payments exists and diferent than 0
//                 if (payments && duration) {
//                     const step = parseInt((duration / payments).toString());  // step to int
//                     const podDay = data.State.POD_Day
//                     // payment day
//                     if (podDay % step == 0) {
//                         const blockchainRes = await podFTProtocol.interestPOD(pod.id, rateOfChange);
//                         if (blockchainRes && blockchainRes.success) {
//                             updateFirebase(blockchainRes);
//                             // send notification to interest payer when payment done
//                             const updateWallets = blockchainRes.output.UpdateWallets;
//                             let uid: string = "";
//                             let walletObj: any = null;
//                             for ([uid, walletObj] of Object.entries(updateWallets)) {
//                                 if (walletObj["Transaction"].length > 0) {
//                                     createNotification(uid, "FT Pod - Interest Payment",
//                                         ` `,
//                                         notificationTypes.traditionalInterest
//                                     );
//                                     const podSnap = await db.collection(collections.podsFT).doc(pod.id).get();
//                                     const podData : any = podSnap.data();
//                                     await notificationsController.addNotification({
//                                         userId: uid,
//                                         notification: {
//                                             type: 59,
//                                             typeItemId: 'FTPod',
//                                             itemId: pod.id,
//                                             follower: '',
//                                             pod: podData.Name,
//                                             comment: '',
//                                             token: '',
//                                             amount: '',
//                                             onlyInformation: false,
//                                              otherItemId: ''
//                                         }
//                                     });
//                                 }
//                             }
//                             console.log("--------- Pod payInterest() finished ---------");
//                         }
//                         else {
//                             console.log('Error in controllers/podController -> payInterest(): success = false.', blockchainRes.message);
//                         }
//                     }
//                 }
//             }
//         })
//     } catch (err) {
//         console.log('Error in controllers/podController -> payInterest()', err);
//     }
// });

/**
 * NFT-FT cron job, scheduled every day at 00:00. For each pod, this function gets the lowest sale price of the day from the "SalesOfTheDay" colection
 * and add this to "PriceHistory" colection. Then resets (clearing) "SalesOfTheDay".
 */
exports.managePriceHistory = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Pod managePriceHistory() cron job started *********');
    let podsSnap = await db.collection(collections.podsFT).get();
    // FT
    podsSnap.forEach(async (pod) => {
      const date = Date.now();
      const podData: any = pod.data();
      const supplyReleased = podData.SupplyReleased;
      const amm = podData.AMM;
      if (supplyReleased != undefined && amm != undefined) {
        // add price to price history
        const price = getMarketPrice(amm, supplyReleased);
        pod.ref.collection(collections.priceHistory).add({
          price: price,
          date: date,
        });
        // add to supply history
        pod.ref.collection(collections.supplyHistory).add({
          supply: supplyReleased,
          date: date,
        });
      }
      // reset (empty) PriceOfTheDay
      const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get();
      priceOfTheDaySnap.forEach((doc) => doc.ref.delete());
    });
    // NFT
    podsSnap = await db.collection(collections.podsNFT).get();
    podsSnap.forEach(async (pod) => {
      // --- add to price history ---
      let lowestPrice = Infinity;
      let date = Date.now();
      // get lowest price from Sales Book
      const sellingOffersSnap = await pod.ref.collection(collections.sellingOffers).get();
      sellingOffersSnap.forEach((sellingOffer) => {
        const offerData: any = sellingOffer.data();
        if (offerData.Price && offerData.Price < lowestPrice) lowestPrice = offerData.Price;
      });

      // get price for nearest (date) price history, to use in case that have no active sale offers.
      if (lowestPrice == Infinity) {
        const priceHistorySnap = await pod.ref
          .collection(collections.priceHistory)
          .orderBy('date', 'desc')
          .limit(1)
          .get();
        if (priceHistorySnap.docs.length) {
          const data = priceHistorySnap.docs[0].data();
          lowestPrice = data.price;
          date = data.date;
        }
      }
      // add this new price and date to PriceHistory colection
      if (lowestPrice != Infinity) {
        pod.ref.collection(collections.priceHistory).add({
          price: lowestPrice,
          date: date,
        });
      }
      // reset (empty) PriceOfTheDay
      const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get();
      priceOfTheDaySnap.forEach((doc) => doc.ref.delete());

      // --- add to supply history ---
      const podData = pod.data();
      const supply = podData.Supply ?? 0;
      pod.ref.collection(collections.supplyHistory).add({
        supply: supply,
        date: date,
      });
    });
    console.log('--------- Pod managePriceHistory() finished ---------');
  } catch (err) {
    console.log('Error in controllers/podController -> managePriceHistory()', err);
  }
});

const getWeb3forChain = (chainId: any): Web3 => {
  if(chainId === '0x3' || chainId === '3' || chainId === 3){
      console.log('getWeb3forChain', chainId)
      return new Web3(new Web3.providers.HttpProvider(`https://ropsten.infura.io/v3/${ETH_INFURA_KEY}`))
  } else if (chainId === '0x4' || chainId === '4' || chainId === 4) {
      console.log('getWeb3forChain', chainId)
      return new Web3(new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${ETH_INFURA_KEY}`))
  } else if (chainId === '0x97' || chainId === '97' || chainId === 97) {
      console.log('getWeb3forChain', chainId)
      return new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-1-s1.binance.org:8545`))
  } else {
      return new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${ETH_INFURA_KEY}`))
  }        
}

exports.exportToEthereum = async (req: express.Request, res: express.Response) => {
  const { podName, podSymbol, mediaSymbol, creators, royalties, seller } = req.body;
  const chainId = 3;
  const web3_l: Web3 = getWeb3forChain(3);
  // get factory
  let erc721RoyaltyFactoryJsonContract = JSON.parse(fs.readFileSync(path.join(__dirname, '../contracts/' + ETH_CONTRACTS_ABI_VERSION + '/PRIVIPodERC721RoyaltyFactory.json')));
  const factoryContract = new web3_l.eth.Contract(erc721RoyaltyFactoryJsonContract.abi, erc721RoyaltyFactoryJsonContract.networks['3']["address"]);

  // add privi to accoutn
  await web3_l.eth.accounts.privateKeyToAccount(ETH_PRIVI_KEY);

  const totalPods = await factoryContract.methods.getTotalTokenCreated().call();
  const method = factoryContract.methods.createMultiCreatorPod('' + (totalPods + 1), podName, podSymbol, 'ipfs://test', 2, royalties, creators).encodeABI();

  // Transaction parameters
  const paramsTX = {
    chainId: chainId,
    fromAddress: ETH_PRIVI_ADDRESS,
    fromAddressKey: ETH_PRIVI_KEY,
    encodeABI: method,
    toAddress: factoryContract.options.address,
  };

  // Execute transaction to withdraw in Ethereum
  const { success, error, data } = await executeTX(paramsTX);

  if (success) {
    updateFirebase(data);

    // get deployed address
    const mintMethod = factoryContract.methods.mintPodToken('' + (totalPods + 1), keccak(mediaSymbol), seller).encodeABI();

    // Transaction parameters
    const mintParamsTX = {
      chainId: chainId,
      fromAddress: ETH_PRIVI_ADDRESS,
      fromAddressKey: ETH_PRIVI_KEY,
      encodeABI: mintMethod,
      toAddress: factoryContract.options.address,
    };

    // Execute transaction to withdraw in Ethereum
    const { success, error, data: data1 } = await executeTX(mintParamsTX);
    if (success)
      updateFirebase(data);

    res.send({success, error, data})
  }
};

/**
 * @notice Generic function to execute Ethereum transactions with signature
 * @return @result: true if transaction was executed successfuly, or false otherwise
 * @return @error: error description if transaction failed
 * @return @res: transaction response  
 * @param params.fromAddress        From account
 * @param params.fromAddressKey     From private key   
 * @param params.encodeABI         Contract data 
 * @param params.contractAddress    Contract address
 */
 const executeTX = (params: any) => {
  return new Promise<PromiseResponse>(async (resolve) => {
      // get proper chain web3
      const chainId = params.chainId;
      const web3_l = getWeb3forChain((typeof chainId !== 'string') ? chainId.toString() : chainId);
      // console.log('executeTX: web3 ', web3_l)
      
      // Prepare transaction
      // remark: added 'pending' to avoid 'Known Transaction' error
      const nonce = await web3_l.eth.getTransactionCount(params.fromAddress, 'pending');
      const tx = {
          gas: 3000000,
          gasPrice: '30000000000',
          from: params.fromAddress,
          data: params.encodeABI,
          chainId: chainId,
          to: params.toAddress,
          nonce: nonce,
      };
      console.log('executeTX: trying to sign and send:', tx)

      // Sign transaction
      let txHash = '0x'
      web3_l.eth.accounts.signTransaction(tx, params.fromAddressKey)
          .then((signed: any) => {
              // Send transaction
              web3_l.eth.sendSignedTransaction(signed.rawTransaction, 
                  async (err, hash) => {
                      if (err) {
                        console.error("sendSignedTransaction error", err);
                      } else {
                          txHash = hash;
                          console.error("sendSignedTransaction hash", 'hash', hash);
                      }
                    }
                  )
                  // .on('receipt', (recipt) => {
                  //     if (recipt.status) {
                  //         resolve({ success: true, error: '', data: recipt });
                  //     } else {
                  //         resolve({ success: false, error: 'Error in ethUtils.js (A) -> executeTX()', data: recipt });
                  //     }
                  // })
                  .on('confirmation', function(confirmationNumber, receipt) {
                      if (receipt.status) {
                          resolve({ success: true, error: '', data: receipt });
                      } else {
                          resolve({ success: false, error: 'Error in ethUtils.js (A) -> executeTX()', data: receipt });
                      }
                  })
                  .on('error', (err) => {
                      resolve({ success: false, error: err.toString(), data: txHash });
                  });
          })
          .catch((err: any) => {
              console.log('Error in ethUtils.js (B) -> executeTX(): ', err);
              resolve({ success: false, error: err, data: txHash });
          });
  });
};

// Promise return type for ethereum transactions
type PromiseResponse = {
  success: boolean,
  error: string,
  data: any
};
