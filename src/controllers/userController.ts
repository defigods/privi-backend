import express from 'express';
// import * as fs from 'fs';
// import * as path from 'path';
// import { stringify } from 'querystring';
import Web3 from 'web3';
import collections from '../firebase/collections';
import dataProtocol from '../blockchain/dataProtocol';
import coinBalance from '../blockchain/coinBalance';
import { db } from '../firebase/firebase';
import badge from '../blockchain/badge';
import {
  addZerosToHistory,
  generateUniqueId,
  getRateOfChangeAsMap,
  getUidFromEmail,
  updateFirebase,
  getMarketPrice,
} from '../functions/functions';
import path from 'path';
import fs from 'fs';
import configuration from '../constants/configuration';
import { sendEmailValidation, sendForgotPasswordEmail } from '../email_templates/emailTemplates';
import { sockets } from './serverController';
import { LEVELS, ONE_DAY } from '../constants/userLevels';

const levels = require('./userLevelsController');
const tasks = require('./tasksController');
const bcrypt = require('bcrypt');
const FieldValue = require('firebase-admin').firestore.FieldValue;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bip39 = require('bip39');
const hdkey = require('hdkey');
const { privateToPublic, publicToAddress, toChecksumAddress } = require('ethereumjs-util');
const { PRIVI_WALLET_PATH } = require('../constants/configuration');

// require('dotenv').config();
//const apiKey = process.env.API_KEY;
const notificationsController = require('./notificationsController');

const apiKey = 'PRIVI'; // just for now

const emailValidation = async (req: express.Request, res: express.Response) => {
  let success = false;
  let message = '';
  // let message_key = "";

  const validation_slug = req.params.validation_slug;

  const decodeValidationSlug = Buffer.from(validation_slug, 'base64').toString('ascii');
  const split = decodeValidationSlug.split('_');
  if (split.length == 2) {
    const uid = split[0];
    const validationSecret = split[1];

    // look for user record given uid
    const userRef = db.collection(collections.user).doc(uid);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    if (user == null) {
      message = 'user not found';
      // message_key = "USER_NOT_FOUND";
    } else {
      if (user.isEmailValidated) {
        message = 'user already validated';
        // message_key = "USER_ALREADY_VALIDATED";
      } else {
        if (user.validationSecret == validationSecret) {
          // update user
          user.isEmailValidated = true;
          user.validationSecret = '';

          db.collection(collections.user).doc(uid).update(user);

          message = 'We have successfully verified your email address, please log in here https://privibeta.web.app/';
          // message_key = "VALIDATION_SUCCESS";

          success = true;
        } else {
          message = 'failed to validate user';
          // message_key = "INVALID_VALIDATION_SECRET";
        }
      }
    }
  } else {
    message = 'invalid validation link';
    // message_key = "INVALID_VALIDATION_LINK";
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(message);
}; // emailValidation

const forgotPassword = async (req: express.Request, res: express.Response) => {
  const body = req.body;

  const email = body.email;
  if (email) {
    const user = await db.collection(collections.user).where('email', '==', email).get();

    if (user.empty) {
      console.log('not found');
      res.send({ success: false, message: 'user not found' });
    } else {
      // create a temporary password
      let tempPassword = crypto.randomBytes(8).toString('hex');
      // console.log("temporary password:", tempPassword);

      const data = user.docs[0].data();

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(tempPassword, salt);
      data['temp_password'] = hash;

      let expiryDate = new Date();
      expiryDate.setDate(new Date().getDate() + configuration.FORGOT_PASSWORD_EXPIRY_DAYS);
      data['temp_password_expiry'] = expiryDate.getTime(); // 1 day temporary password expiry

      data['lastUpdate'] = Date.now();

      // save to db
      db.collection(collections.user).doc(user.docs[0].id).update(data);

      let successEmail = await sendForgotPasswordEmail(data, tempPassword);
      if (successEmail) {
        res.send({
          success: true,
          message: 'Temporary password sent to email.',
        });
      } else {
        res.send({
          success: false,
          message: 'Failed to send temporary password email.',
        });
      }
    }
  } else {
    console.log('email required');
    res.send({ success: false, message: 'email required' });
  }
}; // forgotPassword

const resendEmailValidation = async (req: express.Request, res: express.Response) => {
  const body = req.body;

  const email = body.email;
  if (email) {
    const user = await db.collection(collections.user).where('email', '==', email).get();

    if (user.empty) {
      console.log('not found');
      res.send({ success: false, message: 'user not found' });
    } else {
      const data = user.docs[0].data();

      if (data.isEmailValidated) {
        res.send({ success: false, message: 'user already validated' });
      } else {
        if (!data.validationSecret) {
          // no validation secret field
          data.validationSecret = crypto.randomBytes(8).toString('hex');
          data.isEmailValidated = false;

          // save to db
          db.collection(collections.user).doc(user.docs[0].id).update(data);
        }

        data.id = user.docs[0].id;
        let successEmail = await sendEmailValidation(data, true);
        if (!successEmail) {
          console.log('failed to resend email validation');
        }

        res.send({ success: true, message: 'email validation resent' });
      }
    }
  } else {
    console.log('email required');
    res.send({ success: false, message: 'email required' });
  }
}; // resendEmailValidation

const signIn = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const email = body.email;
    const password = body.password;
    if (email && password) {
      // Compare user & passwd between login input and DB
      const user = await db.collection(collections.user).where('email', '==', email).get();
      // Return result
      if (user.empty) {
        console.log('not found');
        res.send({ isSignedIn: false, userData: {} });
      } else {
        console.log('found from email');
        const data = user.docs[0].data();
        /*const allWallPost: any[] = [];
                const wallPostSnap = await db.collection(collections.wallPost)
                    .where("fromUserId", "==", user.docs[0].id).get();
                wallPostSnap.forEach((doc) => {
                    let data = doc.data();
                    data.id = doc.id;
                    data.type = 'post';
                    allWallPost.push(data)
                });*/
        if (!data.notifications) {
          data.notifications = [];
        }
        // data.notifications.concat(allWallPost);

        if (!data.isEmailValidated) {
          res.send({
            isSignedIn: false,
            userData: {},
            message: 'please validate your email',
            message_key: 'EMAIL_VALIDATION_REQUIRED',
          });
        } else {
          let success = false;

          if (data.password == password) {
            // unencrypted so let's encrypt this password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            data['password'] = hash;

            db.collection(collections.user).doc(user.docs[0].id).update(data);

            success = true;
            console.log('password encrypted');
          } else {
            let isSame = await bcrypt.compare(password, data.password);
            success = isSame;

            if (!isSame && data.temp_password && data.temp_password_expiry > Date.now()) {
              // has temporary password that is not yet expired
              isSame = await bcrypt.compare(password, data.temp_password);
              success = isSame;

              if (isSame) {
                // let's use the temporary password going forward
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                data['password'] = hash;

                // delete temp fields
                data['temp_password'] = FieldValue.delete();
                // data["temp_password_expiry"] = FieldValue.delete(); // retain so we know the last forgot request

                data['lastUpdate'] = Date.now();

                db.collection(collections.user).doc(user.docs[0].id).update(data);

                console.log('temporary password used');
              }
            }
          }

          data.id = user.docs[0].id;
          if (success) {
            console.log('Login successful');

            // Generate an access token
            let expiryDate = new Date();
            expiryDate.setDate(new Date().getDate() + configuration.LOGIN_EXPIRY_DAYS);

            const accessToken = jwt.sign(
              {
                id: data.id,
                email: data.email,
                role: data.role,
                iat: Date.now(),
                exp: expiryDate.getTime(),
              },
              configuration.JWT_SECRET_STRING
            );

            res.send({
              isSignedIn: true,
              userData: data,
              accessToken: accessToken,
            });
          } else {
            console.log('wrong password');
            res.send({ isSignedIn: false, userData: {} });
            return;
          }
        }
      }
    } else {
      console.log('email and password required');
      res.send({ isSignedIn: false, userData: {} });
    }
  } catch (err) {
    console.log('Error in controllers/user.ts -> signIn(): ', err);
  }
};

const attachAddress = async (userPublicId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('got call from', userPublicId);
      // const role = body.role; // role should not be coming from user input?
      const role = 'USER';
      const caller = apiKey;
      const lastUpdate = Date.now();

      // generate mnemonic and save it in DB ** only for testnet
      /*
                this is a bad approach and must be moved to frontend
                and mnemonic should be encripted with a password and saved in user local machine
            */
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const path = PRIVI_WALLET_PATH;
      const hdwallet = await hdkey.fromMasterSeed(seed);
      const wallet = hdwallet.derive(path);
      //    const privateKey = '0x' + wallet._privateKey.toString('hex');
      const pubKey = await privateToPublic(wallet._privateKey);
      const publicKey = '0x04' + pubKey.toString('hex');
      const address = '0x' + (await publicToAddress(pubKey).toString('hex'));
      // const addressCheckSum = await toChecksumAddress(address);

      const blockchainRes = await dataProtocol.attachAddress(userPublicId, address, caller);

      if (blockchainRes && blockchainRes.success) {
        // set address and mnemonic in User DB
        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.update(db.collection(collections.user).doc(userPublicId), {
            mnemonic: mnemonic,
            pubKey: publicKey,
            address: address,
            lastUpdate: lastUpdate,
          });
        });

        resolve({
          success: true,
          uid: userPublicId,
          address: address,
          lastUpdate: lastUpdate,
        });
      } else {
        console.log('Warning in controllers/user.ts -> attachaddress():', blockchainRes);
        reject({ success: false });
      }
    } catch (err) {
      console.log('Error in controllers/user.ts -> attachaddress(): ', err);
      reject({ success: false });
    }
  });
};

const signUp = async (req: express.Request, res: express.Response) => {
  try {
    /*
                const {
                    role
                    , firstName
                    , lastName
                    , gender
                    , age
                    , country
                    , location
                    , address
                    , postalCode
                    , dialCode
                    , phone
                    , currency
                    , email
                    , password } = req.query;
        */

    const body = req.body;

    const firstName = body.firstName;
    const country = body.country;
    const currency = body.currency;
    const email = body.email;
    const password = body.password;

    // const role = body.role; // role should not be coming from user input?
    const role = 'USER';

    if (email == '' || password == '') {
      // basic requirement validation
      console.log('email and password required');
      res.send({ success: false, message: 'email and password required' });
      return;
    }

    /*
                const lastName = body.lastName;
                const gender = body.gender;
                const age = body.age;
                const location = body.location;
                const address = body.address;
                const postalCode = body.postalCode;
                const dialCode = body.dialCode;
                const phone = body.phone;
        */

    let uid: string = '';
    const lastUpdate = Date.now();

    // check if email is in database
    const emailUidMap = await getUidFromEmail(email);
    let toUid = emailUidMap[email!.toString()];

    if (toUid) {
      res.send({ success: false, message: 'email is already in database' });
      return;
    }

    const orgName = 'companies'; // hardcoded for now
    const userPublicId = generateUniqueId(); // now we generate it
    const caller = apiKey;
    const blockchainRes = await dataProtocol.registerUser(orgName, userPublicId, role, caller);

    if (blockchainRes && blockchainRes.success) {
      // Get IDs from blockchain response
      uid = userPublicId;

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const validationSecret = crypto.randomBytes(8).toString('hex');

      // Creates User in DB
      await db.runTransaction(async (transaction) => {
        // userData - no check if firestore insert works? TODO
        transaction.set(db.collection(collections.user).doc(uid), {
          firstName: firstName,
          country: country,
          currency: currency,
          email: email,
          password: hash,
          role: role,
          validationSecret: validationSecret,
          isEmailValidated: false,
          lastUpdate: lastUpdate,
          endorsementScore: 0.5,
          trustScore: 0.5,
          awards: [],
          creds: 0,
          badges: [],
          points: 0,
          followings: [],
          numFollowings: 0,
          followers: [],
          numFollowers: 0,
          followingNFTPods: [],
          followingFTPods: [],
          myNFTPods: [],
          myFTPods: [],
          investedNFTPods: [],
          investedFTPods: [],
          Likes: [],
          twitter: '',
          instagram: '',
          facebook: '',
          level: 1,
          notifications: [],
          verified: false,
          anon: false,
          anonAvatar: 'ToyFaces_Colored_BG_111.jpg',
          hasPhoto: false,
          mnemonic: '',
          pubKey: '',
          address: '',
          userAddress: '',
          dob: 0,
          tutorialsSeen: {
            communities: false,
            pods: false,
            creditPools: false,
          },
          urlSlug: uid,
        });

        /* // since we do not have any data for this- remove for now according to Marta
                                // cloudDatabase
                                transaction.set(db.collection(collections.cloudDatabase).doc(did), {
                                    gender: gender,
                                    age: age,
                                    country: country,
                                    location: location
                                });
                */
      });

      // ------------------------- attach address only test net ----------------------------
      await attachAddress(userPublicId);

      // ------------------------- add zero to balance history to make graph prettier ----------------------------
      addZerosToHistory(db.collection(collections.wallet).doc(uid).collection(collections.historyCrypto), 'price');
      addZerosToHistory(db.collection(collections.wallet).doc(uid).collection(collections.historyFT), 'price');
      addZerosToHistory(db.collection(collections.wallet).doc(uid).collection(collections.historyNFT), 'price');
      addZerosToHistory(db.collection(collections.wallet).doc(uid).collection(collections.historySocial), 'price');

      // ------------------------- Provisional for TestNet ---------------------------------
      // give user some balance in each tokens (50/tokenRate).
      const updatedUserSnap = await db.collection(collections.user).doc(uid).get();
      const updatedUserData: any = updatedUserSnap.data();
      const userAddress = updatedUserData.address;
      const coinsVal = 100; // value in USD to be sent
      const blockchainRes2 = await coinBalance.getTokenListByType('CRYPTO', apiKey);
      const registeredCryptoTokens: string[] = blockchainRes2.output ?? [];
      const rateOfChange: any = await getRateOfChangeAsMap(); // get rate of tokens
      registeredCryptoTokens.forEach((token) => {
        const rate = rateOfChange[token] ?? 1;
        const amount = coinsVal / rate;
        coinBalance.mint('transfer', '', userAddress, amount, token, apiKey).then((blockchainRes3) => {
          console.log(blockchainRes3);
          if (!blockchainRes3.success) {
            console.log(`user ${uid} dindt get ${token}, ${blockchainRes3.message}`);
          }
        });
      });

      // ------------------------------------------------------------------------------------

      // send email validation here
      let userData = {
        id: uid,
        email: email,
        validationSecret: validationSecret,
        firstName: firstName,
      };

      let successEmail = await sendEmailValidation(userData, false);
      if (!successEmail) {
        console.log('failed to send email validation');
      }

      res.send({ success: true, uid: uid, lastUpdate: lastUpdate });
    } else {
      console.log('Warning in controllers/user.ts -> signUp():', blockchainRes);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/user.ts -> signUp(): ', err);
    res.send({ success: false });
  }
};

// const createMnemonic = async (req: express.Request, res: express.Response) => {
//     try {
//         const body = req.body;
//         const userPublicId = body.userId;
//         console.log('got call from', userPublicId)
//         // const role = body.role; // role should not be coming from user input?
//         const role = "USER";
//         const caller = apiKey;
//         const lastUpdate = Date.now();

//         // generate mnemonic and save it in DB ** only for testnet
//         /*
//             this is a bad approach and must be moved to frontend
//             and mnemonic should be encripted with a password and saved in user local machine
//         */
//         const mnemonic = bip39.generateMnemonic();
//         const seed = await bip39.mnemonicToSeed(mnemonic);
//         const path = PRIVI_WALLET_PATH;
//         const hdwallet = await hdkey.fromMasterSeed(seed);
//         const wallet = hdwallet.derive(path);
//         //    const privateKey = '0x' + wallet._privateKey.toString('hex');
//         const pubKey =  await privateToPublic(wallet._privateKey);
//         const publicKey = '0x04' + pubKey.toString("hex");
//         const address = '0x' + await publicToAddress(pubKey).toString('hex');
//         const addressCheckSum = await toChecksumAddress(address);

//         const blockchainRes = await dataProtocol.attachAddress(userPublicId, publicKey, caller);

//         if (blockchainRes && blockchainRes.success) {

//             // set address and mnemonic in User DB
//             await db.runTransaction(async (transaction) => {

//                 // userData - no check if firestore insert works? TODO
//                 transaction.update(db.collection(collections.user).doc(userPublicId), {
//                     mnemonic: mnemonic,
//                     pubKey: publicKey,
//                     address: addressCheckSum,
//                     lastUpdate: lastUpdate,
//                 });

//             });

//             res.send({ success: true, uid: userPublicId, address: addressCheckSum, lastUpdate: lastUpdate });

//         } else {
//             console.log('Warning in controllers/user.ts -> attachaddress():', blockchainRes);
//             res.send({ success: false });
//         }
//     } catch (err) {
//         console.log('Error in controllers/user.ts -> attachaddress(): ', err);
//         res.send({ success: false });
//     }
// };

// MY WALL FUNCTIONS

// ----------------------------- Basic Info --------------------------

interface BasicInfo {
  name: string;
  trustScore: number;
  endorsementScore: number;
  points: number;
  awards: any[];
  creds: number;
  badges: any[];
  numFollowers: number;
  numFollowings: number;
  followers: any[];
  followings: any[];
  likes: any[];
  bio: string;
  level: number;
  twitter: string;
  facebook: string;
  instagram: string;
  notifications: any[];
  anon: boolean;
  anonAvatar: string;
  hasPhoto: boolean;
  verified: boolean;
  urlSlug: string;
}

const getBasicInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    let basicInfo: BasicInfo = {
      name: '',
      trustScore: 0.5,
      endorsementScore: 0.5,
      numFollowers: 0,
      followers: [],
      awards: [],
      creds: 0,
      badges: [],
      points: 0,
      numFollowings: 0,
      followings: [],
      likes: [],
      bio: '',
      level: 1,
      twitter: '',
      instagram: '',
      facebook: '',
      notifications: [],
      anon: false,
      anonAvatar: 'ToyFaces_Colored_BG_111.jpg',
      hasPhoto: false,
      verified: false,
      urlSlug: userId,
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();

    // If not slagUrl, set name of user //
    if (userData !== undefined && userData.urlSlug == '') {
      await db
        .collection(collections.user)
        .doc(userId)
        .update({ urlSlug: userData.firstName + userData.lastName });
    }

    if (userData !== undefined) {
      /*const allWallPost: any[] = [];
            const wallPostSnap = await db.collection(collections.wallPost)
                .where("fromUserId", "==", userId).get();
            wallPostSnap.forEach((doc) => {
                let data = doc.data();
                data.id = doc.id;
                data.type = 'post';
                allWallPost.push(data)
            });*/
      // update return data
      basicInfo.name = userData.firstName + (userData.lastName ? ' ' + userData.lastName : '');
      basicInfo.trustScore = userData.trustScore;
      basicInfo.endorsementScore = userData.endorsementScore;
      basicInfo.creds = userData.creds || 0;
      basicInfo.awards = userData.awards || [];
      basicInfo.badges = userData.badges || [];
      basicInfo.points = userData.points || 0;
      basicInfo.numFollowers = userData.numFollowers || 0;
      basicInfo.numFollowings = userData.numFollowings || 0;
      basicInfo.followers = userData.followers || [];
      basicInfo.followings = userData.followings || [];
      basicInfo.bio = userData.bio || '';
      basicInfo.likes = userData.Likes || [];
      basicInfo.level = userData.level || 1;
      basicInfo.twitter = userData.twitter || '';
      basicInfo.instagram = userData.instagram || '';
      basicInfo.facebook = userData.facebook || '';
      basicInfo.notifications = userData.notifications || [];
      // basicInfo.notifications = basicInfo.notifications.concat(allWallPost);
      basicInfo.notifications.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0));
      basicInfo.anon = userData.anon || false;
      basicInfo.anonAvatar = userData.anonAvatar || 'ToyFaces_Colored_BG_111.jpg';
      basicInfo.hasPhoto = userData.hasPhoto || false;
      basicInfo.verified = userData.verified || false;
      basicInfo.urlSlug = userData.urlSlug || userData.firstName + userData.lastName;

      res.send({ success: true, data: basicInfo });
    } else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/profile -> getBasicInfo()', err);
    res.send({ success: false });
  }
};

const getLoginInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    if (userData !== undefined) {
      // update return data
      userData.id = userSnap.id;
      /*const allWallPost: any[] = [];
            const wallPostSnap = await db.collection(collections.wallPost)
                .where("fromUserId", "==", userId).get();
            wallPostSnap.forEach((doc) => {
                let data = doc.data();
                data.id = doc.id;
                data.type = 'post';
                allWallPost.push(data)
            });*/
      if (!userData.notifications) {
        userData.notifications = [];
      }

      // userData.notifications = userData.notifications.concat(allWallPost);
      userData.notifications.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0));
      res.send({ success: true, data: userData });
    } else {
      res.send({ success: false, error: 'User not found' });
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getBasicInfo()', err);
    res.send({ success: false, error: err });
  }
};

const getAllInfoProfile = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    let userAddress = req.params.address;

    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    if (userData !== undefined) {
      let badges = await getBadgesFunction(userId);
      let myPodsAndInvested = await getMyPodsAndInvestedFunction(userId);
      //let myPods = await getMyPodsFunction(userId);
      //let podsFollowed = await getPodsFollowedFunction(userId);
      //let podsInvestments = await getPodsInvestmentsFunction(userId);
      //let followPodsInfo = await getFollowPodsInfoFunction(userId);
      let myCommunities = await getMyCommunitiesFunction(userId);
      let mySocialTokens = await getMySocialTokensFunction(userId, userAddress);
      let myCreditPools = await getMyCreditPools(userId);
      let myWorkInProgress = await getMyWorkInProgressFunction(userId);

      res.send({
        success: true,
        data: {
          badges: badges,
          myPods: myPodsAndInvested,
          //myPods: myPods,
          //podsFollowed: podsFollowed,
          //podsInvestments: podsInvestments,
          //followPodsInfo: followPodsInfo,
          myCommunities: myCommunities,
          mySocialTokens: mySocialTokens,
          myCreditPools: myCreditPools,
          myWorkInProgress: myWorkInProgress,
        },
      });
    } else {
      res.send({ success: false, error: 'User not found' });
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getBasicInfo()', err);
    res.send({ success: false, error: err });
  }
};

/*exports.changeProfilePhoto = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const imgData = body.imgData;
        res.send({ success: true, data: imgData });
    } catch (err) {
        console.log('Error in controllers/profile -> changeProfilePhoto()', err);
        res.send({ success: false });
    }
}*/

// ----------------------------- MY WALL --------------------------
interface Action {
  name: string;
  profilePhoto: string;
  description: string;
  date: number;
}

const getFollowPodsInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);

    let actions = await getFollowPodsInfoFunction(userId);

    res.send({ success: true, data: actions });
  } catch (err) {
    console.log('Error in controllers/profile -> getFollowPodsInfo()', err);
    res.send({ success: false, error: err });
  }
};

const getFollowPodsInfoFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const actions = [];
      let action: Action = {
        name: '',
        profilePhoto: '',
        description: '',
        date: Date.now(),
      };
      const userSnap = await db.collection(collections.user).doc(userId).get();
      const userData = userSnap.data();
      if (userData !== undefined) {
        const followingFTPods = userData.followingFTPods;
        const followingNFTPods = userData.followingNFTPods;
        for (let i = 0; i < followingFTPods.length; i++) {
          const podSnap = await db.collection(collections.podsFT).doc(followingFTPods[i]).get();
          const podData = podSnap.data();
          // create action and fill actions (to be specified)
        }
        resolve(actions);
      } else {
        reject('User not found');
      }
    } catch (e) {
      reject(e);
    }
  });
};

const getFollowingUserInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);
    const actions = [];
    let action: Action = {
      name: '',
      profilePhoto: '',
      description: '',
      date: Date.now(),
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    if (userData !== undefined) {
      const followings = userData.followings;
      for (let i = 0; i < followings.length; i++) {
        const followUserSnap = await db.collection(collections.user).doc(followings[i]).get();
        const followUserData = followUserSnap.data();
        // create action and fill actions (to be specified)
      }
      res.send({ success: true, data: actions });
    } else {
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getFollowingUserInfo()', err);
    res.send({ success: false });
  }
};

const getOwnInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);
    const actions = [];
    let action: Action = {
      name: '',
      profilePhoto: '',
      description: '',
      date: Date.now(),
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    // create action and fill actions (to be specified)
    res.send({ success: true, data: actions });
  } catch (err) {
    console.log('Error in controllers/profile -> getOwnInfo()', err);
    res.send({ success: false });
  }
};
const getNotifications = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData: any = userSnap.data();

    if (userSnap.exists && userData) {
      if (!userData || !userData.notifications) {
        userData.notifications = [];
      }
      userData.notifications.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0));

      res.send({ success: true, data: userData.notifications });
    } else {
      res.send({ success: true, data: [] });
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getNotifications()', err);
    res.send({ success: false });
  }
};

const postToWall = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const wallContent = body.wallContent;
    const wallId = body.wallId;

    let wallPostGet = await db.collection(collections.wallPost).get();
    let uid = generateUniqueId();

    if (wallContent && wallId) {
      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.wallPost).doc(uid), {
          wallContent: wallContent,
          wallId: wallId, // whose wall was posted to
          fromUserId: req.body.priviUser.id, // who posted to the wall
          date: Date.now(),
          updatedAt: null,
          hasPhoto: false,
          likes: [],
          dislikes: [],
          numLikes: 0,
          numDislikes: 0,
        });
      });

      let data = {
        success: true,
        data: {
          id: uid,
          wallContent: wallContent,
          wallId: wallId, // whose wall was posted to
          fromUserId: req.body.priviUser.id, // who posted to the wall
          date: Date.now(),
          updatedAt: null,
          hasPhoto: false,
          likes: [],
          dislikes: [],
          numLikes: 0,
          numDislikes: 0,
        },
      };
      res.send(data);

      // send message back to socket
      if (sockets[req.body.priviUser.id]) {
        sockets[req.body.priviUser.id].emit('new wall post', data);
      }
    } else {
      console.log('parameters required');
      res.send({ success: false, message: 'parameters required' });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> postToWall()', err);
    res.send({ success: false });
  }
};

const changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const wallPostRef = db.collection(collections.wallPost).doc(req.file.originalname);
      const wallPostGet = await wallPostRef.get();
      const wallPost: any = wallPostGet.data();
      if (wallPost.HasPhoto) {
        await wallPostRef.update({
          HasPhoto: true,
        });
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> changePostPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> changePostPhoto()', err);
    res.send({ success: false });
  }
};

const likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const wallPostRef = db.collection(collections.wallPost).doc(body.wallPostId);
    const wallPostGet = await wallPostRef.get();
    const wallPost: any = wallPostGet.data();

    let likes = [...wallPost.likes];
    let dislikes = [...wallPost.dislikes];
    let numLikes = wallPost.numLikes;
    let numDislikes = wallPost.numDislikes;

    let likeIndex = likes.findIndex((user) => user === body.userId);
    if (likeIndex === -1) {
      likes.push(body.userId);
      numLikes = wallPost.numLikes + 1;
    }

    let dislikeIndex = dislikes.findIndex((user) => user === body.userId);
    if (dislikeIndex !== -1) {
      dislikes.splice(dislikeIndex, 1);
      numDislikes = numDislikes - 1;
    }

    await wallPostRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    wallPost.likes = likes;
    wallPost.dislikes = dislikes;
    wallPost.numLikes = numLikes;
    wallPost.numDislikes = numDislikes;

    if (wallPost.fromUserId !== body.userId) {
      await updateUserCred(wallPost.fromUserId, true);
    }

    res.send({
      success: true,
      data: wallPost,
    });
  } catch (err) {
    console.log('Error in controllers/userController -> likePost()', err);
    res.send({ success: false });
  }
};

const dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const wallPostRef = db.collection(collections.wallPost).doc(body.wallPostId);
    const wallPostGet = await wallPostRef.get();
    const wallPost: any = wallPostGet.data();

    let dislikes = [...wallPost.dislikes];
    let likes = [...wallPost.likes];
    let numLikes = wallPost.numLikes;
    let numDislikes = wallPost.numDislikes;

    let likeIndex = likes.findIndex((user) => user === body.userId);
    if (likeIndex !== -1) {
      likes.splice(likeIndex, 1);
      numLikes = numLikes - 1;
    }

    let dislikeIndex = dislikes.findIndex((user) => user === body.userId);
    if (dislikeIndex === -1) {
      dislikes.push(body.userId);
      numDislikes = wallPost.numDislikes + 1;
    }

    await wallPostRef.update({
      likes: likes,
      dislikes: dislikes,
      numLikes: numLikes,
      numDislikes: numDislikes,
    });

    wallPost.likes = likes;
    wallPost.dislikes = dislikes;
    wallPost.numLikes = numLikes;
    wallPost.numDislikes = numDislikes;

    if (wallPost.fromUserId !== body.userId) {
      await updateUserCred(wallPost.fromUserId, false);
    }

    res.send({
      success: true,
      data: wallPost,
    });
  } catch (err) {
    console.log('Error in controllers/userController -> dislikePost()', err);
    res.send({ success: false });
  }
};

const getPostPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let postId = req.params.postId;
    console.log(postId);
    if (postId) {
      const directoryPath = path.join('uploads', 'wallPost');
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
      let raw = fs.createReadStream(path.join('uploads', 'wallPost', postId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/userController -> getPostPhotoById()', "There's no post id...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getPostPhotoById()', err);
    res.send({ success: false });
  }
};

// CONNECTIONS FUNCTIONS

const getFollowers = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  let ownUser = req.params.ownUser;

  try {
    const userRef = await db.collection(collections.user).doc(userId).get();
    const user: any = userRef.data();

    if (user && user.followers) {
      if (user.followers.length === 0) {
        res.send({
          success: true,
          data: {
            followers: 0,
          },
        });
      } else {
        let followers: any[] = [];
        user.followers.forEach(async (follower, id) => {
          if (follower.accepted) {
            const followerInfo = await db.collection(collections.user).doc(follower.user).get();
            const followerData: any = followerInfo.data();

            let numFollowing: number = 0;
            if (ownUser) {
              let isFollowing = user.followings.find((following) => following.user === follower.user);

              if (isFollowing && isFollowing.accepted) {
                numFollowing = 2;
              } else if (isFollowing && !isFollowing.accepted) {
                numFollowing = 1;
              }
            }

            let followerObj = {
              id: follower,
              name: followerData.firstName,
              endorsementScore: followerData.endorsementScore,
              trustScore: followerData.trustScore,
              numFollowers: followerData.numFollowers,
              numFollowings: followerData.numFollowings,
              isFollowing: numFollowing,
            };

            followers.push(followerObj);
          }

          if (user.followers.length === id + 1) {
            res.send({
              success: true,
              data: {
                followers: followers,
              },
            });
          }
        });
      }
    } else {
      console.log('Error in controllers/profile -> getFollowers()', 'Error getting followers');
      res.send({ success: false, error: 'Error getting followers' });
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getFollowers()', err);
    res.send({ success: false, error: err });
  }
};

const getFollowing = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  let ownUser = req.params.ownUser;

  try {
    const userRef = await db.collection(collections.user).doc(userId).get();
    const user: any = userRef.data();

    let followings: any[] = [];
    if (user && user.followings) {
      if (user.followings.length === 0) {
        res.send({
          success: true,
          data: {
            followers: 0,
          },
        });
      } else {
        user.followings.forEach(async (following, id) => {
          const followingInfo = await db.collection(collections.user).doc(following.user).get();
          const followingData: any = followingInfo.data();

          let numFollowing: number = 0;
          if (ownUser) {
            if (following && following.accepted) {
              numFollowing = 2;
            } else if (following && !following.accepted) {
              numFollowing = 1;
            }
          }

          let followingObj = {
            id: following,
            name: followingData.firstName,
            endorsementScore: followingData.endorsementScore,
            trustScore: followingData.trustScore,
            numFollowers: followingData.numFollowers,
            numFollowings: followingData.numFollowings,
            isFollowing: numFollowing,
          };

          followings.push(followingObj);

          if (user.followings.length === id + 1) {
            res.send({
              success: true,
              data: {
                followings: followings,
              },
            });
          }
        });
      }
    }
  } catch (err) {
    console.log('Error in controllers/profile -> getFollowing()', err);
    res.send({ success: false });
  }
};

const followUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let userToFollow = body.userToFollow;

    const userRef = db.collection(collections.user).doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToFollowRef = db.collection(collections.user).doc(userToFollow.id);
    const userToFollowGet = await userToFollowRef.get();
    const userToFollowData: any = userToFollowGet.data();

    let alreadyFollower = userToFollowData.followers.find((item) => item === body.user.id);
    let userFollowersLength = userToFollowData.followers.length;
    if (!alreadyFollower) {
      userToFollowData.followers.push({
        user: body.user.id,
        accepted: false,
      });
    }
    let task;
    let userFollowersLengthAfter = user.followings.length;
    if (userFollowersLength == 4 && userFollowersLengthAfter == 5) {
      task = await tasks.updateTask(userToFollowData.user, 'Follow 5 people');
    }
    await userToFollowRef.update({
      followers: userToFollowData.followers,
    });

    let alreadyFollowing = user.followings.find((item) => item.user === body.user.id);
    let userFollowingsLength = user.followings.length;
    if (!alreadyFollowing) {
      user.followings.push({
        user: body.userToFollow.id,
        accepted: false,
      });
    }
    let userFollowingsLengthAfter = user.followings.length;
    if (userFollowingsLength == 4 && userFollowingsLengthAfter == 5) {
      task = tasks.updateTask(body.user.id, 'Follow 5 people');
    }
    await userRef.update({
      followings: user.followings,
    });

    await notificationsController.addNotification({
      userId: userToFollow.id,
      notification: {
        type: 1,
        typeItemId: 'user',
        itemId: body.user.id,
        follower: user.firstName,
        pod: '',
        comment: '',
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: '',
      },
    });
    if (task) {
      res.send({ success: true, data: userToFollowData, task: task });
    }
    res.send({ success: true, data: userToFollowData });
  } catch (err) {
    console.log('Error in controllers/followUser -> followUser()', err);
    res.send({ success: false, error: err });
  }
};

const acceptFollowUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let userToAcceptFollow = body.userToAcceptFollow;

    const userRef = db.collection(collections.user).doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToAcceptRef = db.collection(collections.user).doc(userToAcceptFollow.id);
    const userToAcceptGet = await userToAcceptRef.get();
    const userToAcceptData: any = userToAcceptGet.data();

    let alreadyFollowerIndex = user.followers.findIndex((item) => item.user === userToAcceptFollow.id);
    if (alreadyFollowerIndex !== -1) {
      user.followers[alreadyFollowerIndex] = {
        user: userToAcceptFollow.id,
        accepted: true,
      };
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found' });
      return;
    }

    let followersAccepted = user.followers.filter((item) => item.accepted === true);
    user.numFollowers = followersAccepted.length;

    let alreadyFollowingIndex = userToAcceptData.followings.findIndex((item) => item.user === body.user.id);
    if (alreadyFollowingIndex !== -1) {
      userToAcceptData.followings[alreadyFollowingIndex] = {
        user: body.user.id,
        accepted: true,
      };
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found' });
      return;
    }

    let followingAccepted = userToAcceptData.followings.filter((item) => item.accepted === true);
    userToAcceptData.numFollowings = followingAccepted.length;

    await userRef.update({
      followers: user.followers,
      numFollowers: user.numFollowers,
    });

    await userToAcceptRef.update({
      followings: userToAcceptData.followings,
      numFollowings: userToAcceptData.numFollowings,
    });

    if (body.idNotification) {
      await notificationsController.removeNotification({
        userId: body.user.id,
        notificationId: body.idNotification,
      });
    }

    await notificationsController.addNotification({
      userId: userToAcceptFollow.id,
      notification: {
        type: 2,
        typeItemId: 'user',
        itemId: body.user.id,
        follower: user.firstName,
        pod: '',
        comment: '',
        token: '',
        amount: 0,
        onlyInformation: false,
        otherItemId: '',
      },
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/userController -> acceptFollowUser()', err);
    res.send({ success: false, error: err });
  }
};

const declineFollowUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let userToDeclineFollow = body.userToDeclineFollow;

    const userRef = db.collection(collections.user).doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToDeclineRef = db.collection(collections.user).doc(userToDeclineFollow.id);
    const userToDeclineGet = await userToDeclineRef.get();
    const userToDeclineData: any = userToDeclineGet.data();

    let alreadyFollowerIndex = user.followers.findIndex((item) => item.user === userToDeclineFollow.id);
    if (alreadyFollowerIndex !== -1) {
      user.followers.splice(alreadyFollowerIndex, 1);
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found' });
      return;
    }

    let followersAccepted = user.followers.filter((item) => item.accepted === true);
    user.numFollowers = followersAccepted.length;

    let alreadyFollowingIndex = userToDeclineData.followings.findIndex((item) => item.user === body.user.id);
    if (alreadyFollowingIndex !== -1) {
      userToDeclineData.followings.splice(alreadyFollowingIndex, 1);
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found' });
      return;
    }

    let followingAccepted = userToDeclineData.followings.filter((item) => item.accepted === true);
    userToDeclineData.numFollowings = followingAccepted.length;

    await userRef.update({
      followers: user.followers,
      numFollowers: user.numFollowers,
    });

    await userToDeclineRef.update({
      followings: userToDeclineData.followings,
      numFollowings: userToDeclineData.numFollowings,
    });

    if (body.idNotification) {
      await notificationsController.removeNotification({
        userId: body.user.id,
        notificationId: body.idNotification,
      });
    }

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/userController -> declineFollowUser()', err);
    res.send({ success: false, error: err });
  }
};

const unFollowUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let userToUnFollow = body.userToUnFollow;

    const userRef = db.collection(collections.user).doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToUnFollowRef = db.collection(collections.user).doc(userToUnFollow.id);
    const userToUnFollowGet = await userToUnFollowRef.get();
    const userToUnFollowData: any = userToUnFollowGet.data();

    let newFollowings = user.followings.filter((item) => item.user != userToUnFollow.id);
    let newFollowingNum = user.followings.filter((item) => item.user != userToUnFollow.id && item.accepted === true);

    let newFollowers = userToUnFollowData.followers.filter((item) => item.user !== body.user.id);
    let newFollowersNum = userToUnFollowData.followers.filter(
      (item) => item.user !== body.user.id && item.accepted === true
    );

    await userToUnFollowRef.update({
      followers: newFollowers,
      numFollowers: newFollowersNum.length,
    });
    await userRef.update({
      followings: newFollowings,
      numFollowings: newFollowingNum.length,
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/userController -> unFollowUser()', err);
    res.send({ success: false, error: err });
  }
};

// INVESTMENTS

const getMyPods = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    let myPods = await getMyPodsFunction(userId);

    res.send({ success: true, data: myPods });
  } catch (err) {
    console.log('Error in controllers/profile -> getMyPods()', err);
    res.send({ success: false, error: err });
  }
};

const getMyPodsFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const user: any = userRef.data();
      let myNFTPods: any[] = [];
      let myFTPods: any[] = [];

      if (user.myNFTPods && user.myNFTPods.length > 0) {
        myNFTPods = await getPodsArray(user.myNFTPods, collections.podsNFT, 'NFT');
      }

      if (user.myFTPods && user.myFTPods.length > 0) {
        myFTPods = await getPodsArray(user.myFTPods, collections.podsFT, 'FT');
      }

      resolve({
        NFT: myNFTPods || [],
        FT: myFTPods || [],
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getPodsInvestments = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    let pods = await getPodsInvestmentsFunction(userId);

    res.send({
      success: true,
      data: pods,
    });
  } catch (err) {
    console.log('Error in controllers/profile -> getPodsInvestments()', err);
    res.send({ success: false });
  }
};

const getPodsInvestmentsFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const user: any = userRef.data();

      let investedNFTPods: any[] = [];
      let investedFTPods: any[] = [];

      if (user.investedNFTPods && user.investedNFTPods.length > 0) {
        investedNFTPods = await getPodsArray(user.investedNFTPods, collections.podsNFT, 'NFT');
      }

      if (user.investedFTPods && user.investedFTPods.length > 0) {
        investedFTPods = await getPodsArray(user.investedFTPods, collections.podsFT, 'FT');
      }
      resolve({
        NFT: investedNFTPods,
        FT: investedFTPods,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getMyPodsAndInvestedFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const user: any = userRef.data();
      let myNFTPods: any[] = [];
      let myFTPods: any[] = [];

      if (user.myNFTPods && user.myNFTPods.length > 0) {
        myNFTPods = await getPodsArray(user.myNFTPods, collections.podsNFT, 'NFT');
      }

      if (user.myFTPods && user.myFTPods.length > 0) {
        myFTPods = await getPodsArray(user.myFTPods, collections.podsFT, 'FT');
      }

      let investedNFTPods: any[] = [];
      let investedFTPods: any[] = [];

      if (user.investedNFTPods && user.investedNFTPods.length > 0) {
        investedNFTPods = await getPodsArray(user.investedNFTPods, collections.podsNFT, 'NFT');

        investedNFTPods.forEach((nftPod) => {
          if (myNFTPods.some((pod) => pod.PodAddress === nftPod.PodAddress)) {
            myNFTPods.push(nftPod);
          }
        });
      }

      if (user.investedFTPods && user.investedFTPods.length > 0) {
        investedFTPods = await getPodsArray(user.investedFTPods, collections.podsFT, 'FT');

        investedFTPods.forEach((ftPod) => {
          if (myFTPods.some((pod) => pod.PodAddress === ftPod.PodAddress)) {
            myFTPods.push(ftPod);
          }
        });
      }

      resolve({
        NFT: myNFTPods || [],
        FT: myFTPods || [],
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getPodsFollowed = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    let pods = await getPodsFollowedFunction(userId);

    res.send({ success: true, data: pods });
  } catch (err) {
    console.log('Error in controllers/profile -> getPodsFollowed()', err);
    res.send({ success: false, error: err });
  }
};

const getPodsFollowedFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const user: any = userRef.data();

      let followingNFTPods: any[] = [];
      let followingFTPods: any[] = [];

      if (user.followingNFTPods && user.followingNFTPods.length > 0) {
        followingNFTPods = await getPodsArray(user.followingNFTPods, collections.podsNFT, 'NFT');
      }

      if (user.followingFTPods && user.followingFTPods.length > 0) {
        followingFTPods = await getPodsArray(user.followingFTPods, collections.podsFT, 'FT');
      }
      resolve({
        NFT: followingNFTPods,
        FT: followingFTPods,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getPodsArray = (arrayPods: any[], collection: any, type: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    let podInfo: any[] = [];
    arrayPods.forEach(async (item, i) => {
      const podRef = await db.collection(collection).doc(item).get();

      if (podRef.exists) {
        let podData: any = podRef.data();
        podData.type = type;

        if (podData.TokenSymbol) {
          const token = await db.collection(collections.tokens).doc(podData.TokenSymbol).get();
          podData.tokenData = token.data();
        }

        await podInfo.push(podData);
      }

      if (arrayPods.length === i + 1) {
        resolve(podInfo);
      }
    });
  });
};

//get communities
const getMyCommunitiesFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      const user: any = userRef.data();
      let myCommunities: any[] = [];

      if (user.JoinedCommunities && user.JoinedCommunities.length > 0) {
        myCommunities = await getCommunitiesArray(user.JoinedCommunities, collections.community);
      }
      resolve(myCommunities);
    } catch (e) {
      reject(e);
    }
  });
};

const getCommunitiesArray = (arrayCommunities: any[], collection: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    let communityInfo: any[] = [];
    arrayCommunities.forEach(async (item, i) => {
      const communityRef = await db.collection(collection).doc(item).get();

      if (communityRef.exists) {
        let communityData: any = communityRef.data();

        if (communityData.TokenSymbol) {
          const token = await db.collection(collections.tokens).doc(communityData.TokenSymbol).get();
          communityData.tokenData = token.data();
        }

        if (!communityInfo.some((community) => community.CommunityAddress === item)) {
          await communityInfo.push(communityData);
        }
      }

      if (arrayCommunities.length === i + 1) {
        resolve(communityInfo);
      }
    });
  });
};

//get social tokens
const getMySocialTokensFunction = (userId, address) => {
  return new Promise(async (resolve, reject) => {
    try {
      const retData: any[] = [];
      // get those social tokens which the user is the creator or has some balance
      const blockchainRes = await coinBalance.getBalancesByType(address, collections.socialToken, 'PRIVI');
      if (blockchainRes && blockchainRes.success) {
        const balances = blockchainRes.output;
        const socialSnap = await db.collection(collections.socialPools).get();
        socialSnap.forEach(async (doc) => {
          const data: any = doc.data();
          const balance = balances[data.TokenSymbol] ? balances[data.TokenSymbol].Amount : 0;
          if (balance || data.Creator == userId) {
            let marketPrice = getMarketPrice(
              data.AMM,
              data.SupplyReleased,
              data.InitialSupply,
              data.TargetPrice,
              data.TargetSupply
            );

            let tokenData: any = '';

            if (data.TokenSymbol) {
              const token = await db.collection(collections.tokens).doc(data.TokenSymbol).get();
              tokenData = token.data();
            }

            await retData.push({
              ...data,
              MarketPrice: marketPrice,
              UserBalance: balance,
              tokenData,
            });
          }
        });
        resolve(retData);
      } else {
        console.log(
          'Error in controllers/socialController -> getSocialPools(): blockchain = false ',
          blockchainRes.message
        );
      }
    } catch (err) {
      console.log('Error in controllers/socialController -> getSocialPools(): ', err);
    }
  });
};

//get credit pools
const getMyCreditPools = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = await db.collection(collections.user).doc(userId).get();
      let myBorrowingPriviCredits: any[] = [];
      let myLendingPriviCredits: any[] = [];

      const borrowingSnap = await db.collection(collections.user).doc(userId).collection('PriviCreditsBorrowing').get();
      const lendingSnap = await db.collection(collections.user).doc(userId).collection('PriviCreditsLending').get();

      if (!borrowingSnap.empty) {
        myBorrowingPriviCredits = await getCreditPoolsArray(borrowingSnap, collections.priviCredits);
      }
      if (!lendingSnap.empty) {
        myLendingPriviCredits = await getCreditPoolsArray(lendingSnap, collections.priviCredits);
      }

      resolve({ myBorrowingPriviCredits: myBorrowingPriviCredits, myLendingPriviCredits: myLendingPriviCredits });
    } catch (e) {
      reject(e);
    }
  });
};

const getCreditPoolsArray = (arrayCreditPools: any, collection: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    let creditPools: any[] = [];
    let counter = 0;
    const size = arrayCreditPools.size;
    arrayCreditPools.forEach(async (item) => {
      const creditPoolRef = await db.collection(collection).doc(item.id).get();

      if (creditPoolRef.exists) {
        let creditPoolData: any = creditPoolRef.data();

        if (creditPoolData.TokenSymbol) {
          const token = await db.collection(collections.tokens).doc(creditPoolData.TokenSymbol).get();
          creditPoolData.tokenData = token.data();
        }

        await creditPools.push(creditPoolData);
      }

      counter++;

      if (counter === size) {
        resolve(creditPools);
      }
    });
  });
};

//get communities
const getMyWorkInProgressFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let myWorkInProgress: any[] = [];

      myWorkInProgress = await getWorkInProgressArray(userId, collections.workInProgress);

      resolve(myWorkInProgress);
    } catch (e) {
      reject(e);
    }
  });
};

const getWorkInProgressArray = (userId: string, collection: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    let wipInfo: any[] = [];

    db.collection(collection)
      .get()
      .then((querySnapshot) => {
        let counter = 0;
        if (querySnapshot.size > 0) {
          querySnapshot.forEach((wip) => {
            if (wip.data().Creator === userId) {
              const wipCopy = wip.data();
              wipCopy.id = wip.id;
              wipCopy.isCreator = true;
              wipInfo.push(wipCopy);
            } else {
              if (wip.data().Offers && wip.data().Offers.length > 0) {
                if (wip.data().Offers.some((offer) => offer.userId === userId && (offer.status === "negotiating" || offer.status === "accepted"))) {
                  const wipCopy = wip.data();
                  wipCopy.id = wip.id;
                  wipCopy.isCreator = false;
                  wipInfo.push(wipCopy);
                }
              }
            }
            counter++;
            if (counter === querySnapshot.size) {
              resolve(wipInfo);
            }
          });
        } else {
          resolve(wipInfo);
        }
      });
  });
};

const getReceivables = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  console.log(userId);
};

const getLiabilities = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  console.log(userId);
};

const getSocialTokens = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);

    // GetSocialTokens

    res.send({ success: true, data: [] });
  } catch (err) {
    console.log('Error in controllers/getSocialTokens -> getSocialTokens()', err);
    res.send({ success: false });
  }
};

const editUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const userRef = db.collection(collections.user).doc(body.id);
    const userGet = await userRef.get();
    const user: any = await userGet.data();

    //console.log(body);

    await userRef.update({
      firstName: body.firstName,
      lastName: body.lastName,
      dob: body.dob,
      country: body.country,
      postalCode: body.postalCode,
      location: body.location,
      userAddress: body.userAddress,
      bio: body.bio,
      instagram: body.instagram,
      twitter: body.twitter,
      facebook: body.facebook,
      urlSlug: body.urlSlug,
    });

    if (!user.twitter && body.twitter) {
      body.task = await tasks.updateTask(body.id, 'Connect your Twitter account');
    }

    if (!user.twitch && body.twitch) {
      body.task = await tasks.updateTask(body.id, 'Connect your Twitch account');
    }

    if (!user.tiktok && body.tiktok) {
      body.task = await tasks.updateTask(body.id, 'Connect your Tiktok account');
    }

    res.send({
      success: true,
      data: {
        id: body.id,
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob,
        country: body.country,
        postalCode: body.postalCode,
        location: body.location,
        userAddress: body.userAddress,
        bio: body.bio,
        instagram: body.instagram,
        twitter: body.twitter,
        facebook: body.facebook,
        userSlug: body.userSlug,
        task: body.task,
      },
    });
  } catch (err) {
    console.log('Error in controllers/editUser -> editUser()', err);
    res.send({ success: false });
  }
};

const updateNewLevel = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let userId = body.userId;

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = await userGet.data();

    await userRef.update({
      isLevelUp: body.isLevelUp,
    });

    res.send({
      success: true,
      data: {
        isLevelUp: body.isLevelUp,
      },
    });
  } catch (err) {
    console.log('Error in controllers/userController -> updateNewLevel()', err);
    res.send({ success: false });
  }
};

const updateNewBadge = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let badgeId = body.badgeId;
    let userId = body.userId;

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = await userGet.data();

    let badges = user.badges;

    if (badges && badges.length > 0) {
      badges.forEach(function (badge) {
        if ((badge.badgeId = badgeId)) {
          badge.isNew = false;
        }
      });
    }

    await userRef.update({
      badges: badges,
    });

    res.send({
      success: true,
      data: {
        badgeId: badgeId,
      },
    });
  } catch (err) {
    console.log('Error in controllers/userController -> updateNewBadge()', err);
    res.send({ success: false });
  }
};

const changeUserProfilePhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const userRef = db.collection(collections.user).doc(req.file.originalname);
      const userGet = await userRef.get();
      const user: any = userGet.data();
      if (user.hasPhoto !== undefined) {
        await userRef.update({
          hasPhoto: true,
        });
      } else {
        await userRef.set({
          ...user,
          hasPhoto: true,
        });
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> changeUserProfilePhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> changePodPhoto()', err);
    res.send({ success: false });
  }
};

const getPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    // console.log(userId);
    if (userId) {
      const directoryPath = path.join('uploads', 'users');
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          // console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'users', userId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/userController -> getPhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getPhotoById()', err);
    res.send({ success: false });
  }
};

const getUserList = async (req: express.Request, res: express.Response) => {
  try {
    let filters = req.body;

    if (filters) {
      const userRef = db.collection(collections.user).doc(filters.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const usersRef = db.collection(collections.user);
      usersRef
        .where('endorsementScore', '>', filters.endorsementScore[0] / 100)
        .where('trustScore', '>', filters.trustScore[0] / 100);
      usersRef
        .where('endorsementScore', '<', filters.endorsementScore[1] / 100)
        .where('trustScore', '<', filters.trustScore[1] / 100)
        .orderBy('Followers', 'desc');

      const usersGet = await usersRef.get();

      let arrayUsers: any[] = [];
      usersGet.docs.map((doc, i) => {
        let data = doc.data();
        data.id = doc.id;
        let name = '';
        if (data.lastName && data.lastName !== '') {
          name = data.firstName + ' ' + data.lastName;
        } else {
          name = data.firstName;
        }

        if (filters.name === '' || name.startsWith(filters.name)) {
          arrayUsers.push(data);
        }
        if (usersGet.docs.length === i + 1) {
          if (arrayUsers.length !== 0) {
            arrayUsers.forEach((item, i) => {
              if (user.followings && user.followings.length !== 0) {
                item.isFollowing = user.followings.findIndex((usr) => usr === item.id) !== -1;
              } else {
                item.isFollowing = false;
              }
              if (arrayUsers.length === i + 1) {
                res.send({ success: true, data: arrayUsers });
              }
            });
          } else {
            res.send({ success: true, data: [] });
          }
        }
      });
    } else {
      console.log('Error in controllers/userController -> getUserList()', "There's no filters");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getUserList()', err);
    res.send({ success: false });
  }
};

// get all badges
const getBadges = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    let retData = await getBadgesFunction(userId);

    res.send({ success: true, data: retData });
  } catch (e) {
    console.log('Error in controllers/userController -> getBadges()' + e);
    res.send({ success: false, error: e });
  }
};

const getBadgesFunction = (userId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      let address = userId;
      console.log(userId);
      console.log(Web3.utils.isAddress(userId));
      if (!Web3.utils.isAddress(userId)) {
        const userRef = db.collection(collections.user).doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();
        address = user.address;
      }
      const retData: any[] = [];
      const blockchainRes = await coinBalance.getBalancesByType(address, collections.badgeToken, apiKey);
      if (blockchainRes && blockchainRes.success) {
        const badgesBalance = blockchainRes.output;
        const badgeSnap = await db.collection(collections.badges).get();
        badgeSnap.forEach(async (doc) => {
          let amount = 0;
          let data = doc.data();
          let tokenData: any = '';
          if (badgesBalance[data.Symbol]) {
            amount = badgesBalance[data.Symbol].Amount;
            const token = await db.collection(collections.tokens).doc(data.Symbol).get();
            tokenData = token.data();
          }

          if (amount > 0) {
            retData.push({
              ...doc.data(),
              Amount: amount,
              tokenData: tokenData,
            });
          }
        });
        // console.log(retData)
        resolve(retData);
      } else {
        console.log('Error in controllers/userController -> getBadges()', blockchainRes.message);
        reject(blockchainRes.message);
      }
    } catch (e) {
      reject(e);
    }
  });
};

const getBadgeBySymbol = async (req: express.Request, res: express.Response) => {
  try {
    let badgeSymbol = req.params.badgeSymbol;
    if (badgeSymbol) {
      const badgeRef = await db.collection(collections.badges).where('Symbol', '==', badgeSymbol).get();

      badgeRef.forEach((doc) => {
        let badge = doc.data();
        if (badge) {
          res.send({ success: true, data: badge });
        } else {
          console.log('Error in controllers/userController -> getBadgeBySymbol()', 'Badge not found...');
          res.send({ success: false });
        }
      });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getBadgeBySymbol()', err);
    res.send({ success: false });
  }
};

const createBadge = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;
    const name = body.Name;
    const symbol = body.Symbol;
    const type = body.Type;
    const totalSupply = body.TotalSupply;
    const royalty = body.Royalty;
    const lockUpDate = body.LockUpDate;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await badge.createBadge(
      creator,
      name,
      symbol,
      type,
      totalSupply,
      royalty,
      lockUpDate,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updateBadges = output.UpdateBadges;
      const badgeId = Object.keys(updateBadges)[0];
      const description = body.Description;
      db.collection(collections.badges).doc(badgeId).update({
        Description: description,
        Users: [],
        HasPhoto: false,
      });
      // add badge to user
      //  const userRef = db.collection(collections.user).doc(creator);
      //  const userGet = await userRef.get();
      //  const user: any = userGet.data();
      //  let badges = [...user.badges];

      // console.log('badges', badges, user)

      // await userRef.update({
      //     badges: badges.push(txid)
      // });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> createBadge(): success = false.', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (e) {
    return 'Error in controllers/userController -> createBadge()' + e;
  }
};

const changeBadgePhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const badgeRef = db.collection(collections.badges).doc(req.file.originalname);

      const badgeGet = await badgeRef.get();
      const badge: any = await badgeGet.data();

      if (badge.hasPhoto) {
        await badgeRef.update({
          hasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> changeBadgePhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> changeBadgePhoto()', err);
    res.send({ success: false });
  }
};

const getBadgePhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let badgeId = req.params.badgeId;
    // console.log(badgeId);
    if (badgeId) {
      const directoryPath = path.join('uploads', 'badges');
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
      res.setHeader('Content-Type', 'image');
      let raw = fs.createReadStream(path.join('uploads', 'badges', badgeId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/userController -> getBadgePhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getBadgePhotoById()', err);
    res.send({ success: false });
  }
};

// Points and Levels
const getUserScores = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    if (userId) {
      const userRef = db.collection(collections.user).doc(userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      // Scores:
      let level = user.level || 1;
      let userPoints = user.Points || 0;
      let badges = user.badges;
      let badgesToday: any[] = [];
      let today = Date.now();
      let yesterday = today - ONE_DAY;

      // points
      let points = levels.pointsWonTodayAndHour(userId);
      let pointsWonToday = points.pointsSumHour;
      let pointsWonHour = points.pointsSumHour;

      // Badges earned today
      if (badges && badges.length > 0) {
        badgesToday = badges.filter((badge) => badge.date >= yesterday && badge.date < today);
      }

      let response: any = {
        level: level,
        badges: badges,
        points: userPoints,
        levelPoints: LEVELS,
        badgesToday: badgesToday,
        pointsWonToday: pointsWonToday,
        pointsHour: pointsWonHour,
      };

      res.send({ success: true, data: response });
    } else {
      console.log('Error in controllers/userController -> getUserScores()', 'Missing Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getUserScoress()', err);
    res.send({ success: false });
  }
};

const getStatistics = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    if (userId) {
      const userRef = db.collection(collections.user).doc(userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();
      const userLevel: number = user.level || 1;

      // Statistics:
      let today = Date.now();
      let yesterday = today - ONE_DAY;

      // totalPointsToday
      let pointsGet = await db
        .collection(collections.points)
        .where('date', '>', yesterday)
        .where('date', '<', today)
        .get();
      let totalPointsToday = pointsGet.size;
      let badgesGet = await db
        .collection(collections.badgesHistory)
        .where('date', '>', yesterday)
        .where('date', '<', today)
        .get();
      let totalBadgesToday = badgesGet.size;

      // totalUsersLevels userLevel
      const userCollection = db.collection(collections.user);
      const usersLevelGet = await userCollection.where('level', '==', userLevel).get();
      let totalLevelUsers = usersLevelGet.size;

      // totalUsersLevels1
      const users1Get = await userCollection.where('level', '==', 1).get();
      let totalUsersLevel1 = users1Get.size;
      // totalUsersLevel1
      const users2Get = await userCollection.where('level', '==', 2).get();
      let totalUsersLevel2 = users2Get.size;
      // totalUsersLevel3
      const users3Get = await userCollection.where('level', '==', 3).get();
      let totalUsersLevel3 = users3Get.size;
      // totalUsersLevel4
      const users4Get = await userCollection.where('level', '==', 4).get();
      let totalUsersLevel4 = users4Get.size;
      // totalUsersLevel5
      const users5Get = await userCollection.where('level', '==', 5).get();
      let totalUsersLevel5 = users5Get.size;
      // totalUsersLevel6
      const users6Get = await userCollection.where('level', '==', 6).get();
      let totalUsersLevel6 = users6Get.size;
      // totalUsersLevel7
      const users7Get = await userCollection.where('level', '==', 7).get();
      let totalUsersLevel7 = users7Get.size;
      // totalUsersLevel8
      const users8Get = await userCollection.where('level', '==', 8).get();
      let totalUsersLevel8 = users8Get.size;

      // ranking
      let userRank = await levels.getUserRank(userId);
      let usersSnap = await db.collection(collections.user).orderBy('Points').limit(12).get();

      let ranking: any = [];
      const docs = usersSnap.docs;
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const data: any = doc.data();
        const user: any = {
          user: doc.id,
          name: data.firstName,
          points: data.Points,
          level: data.level,
        };
        ranking.push(user);
      }

      let historySnap = await db.collection(collections.points).orderBy('date').limit(12).get();

      let history: any = [];
      const docs2 = historySnap.docs;
      for (let i = 0; i < docs2.length; i++) {
        const doc2 = docs2[i];
        const data2: any = doc2.data();
        const record: any = {
          user: data2.userId,
          reason: data2.reason,
          date: data2.date,
          points: data2.points,
        };
        history.push(record);
      }

      let usersLevelData = [
        { x: 1, y: totalUsersLevel1 },
        { x: 2, y: totalUsersLevel2 },
        { x: 3, y: totalUsersLevel3 },
        { x: 4, y: totalUsersLevel4 },
        { x: 5, y: totalUsersLevel5 },
        { x: 6, y: totalUsersLevel6 },
        { x: 7, y: totalUsersLevel7 },
        { x: 8, y: totalUsersLevel8 },
      ];

      let response: any = {
        levelPoints: LEVELS,
        totalLevelUsers: totalLevelUsers,
        totalPointsToday: totalPointsToday,
        totalBadgesToday: totalBadgesToday,
        usersLevelData: usersLevelData,
        userRank: userRank.rank,
        ranking: ranking,
        history: history,
      };

      res.send({ success: true, data: response });
    } else {
      console.log('Error in controllers/userController -> getStatistics()', 'Missing Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> getStatistics()', err);
    // res.send({ success: false });
    let response: any = {
      levelPoints: 0,
      totalLevelUsers: 0,
      totalPointsToday: 0,
      totalBadgesToday: 0,
      usersLevelData: [],
      ranking: [],
      history: [],
    };

    res.send({ success: true, data: response });
  }
};

const getIssuesAndProposals = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  console.log(userId);
};

const createIssue = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let issuesGet = await db.collection(collections.issues).get();
    let id = issuesGet.size;

    if (
      body &&
      body.issue &&
      body.userId &&
      body.item &&
      body.itemType &&
      body.itemId &&
      body.question &&
      body.answers &&
      body.description
    ) {
      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.issues).doc('' + (id + 1)), {
          issue: body.issue,
          userId: body.userId,
          date: new Date(),
          item: body.item,
          itemType: body.itemType,
          itemId: body.itemId,
          responses: [],
          question: body.question,
          answers: body.answers,
          votes: [],
          description: body.description,
        });
      });
      res.send({
        success: true,
        data: {
          issue: body.issue,
          userId: body.userId,
          date: new Date(),
          item: body.item,
          itemType: body.itemType,
          itemId: body.itemId,
          responses: [],
          question: body.question,
          answers: body.answers,
          votes: [],
          description: body.description,
          id: id + 1,
        },
      });
    } else {
      console.log('Error in controllers/userController -> createIssue()', 'Missing Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> createIssue()', err);
    res.send({ success: false });
  }
};

const createProposal = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let proposalsGet = await db.collection(collections.proposals).get();
    let id = proposalsGet.size;

    if (body && body.proposal && body.userId && body.item && body.itemType && body.itemId) {
      await db.runTransaction(async (transaction) => {
        transaction.set(db.collection(collections.proposals).doc('' + (id + 1)), {
          proposal: body.proposal,
          userId: body.userId,
          date: new Date(),
          item: body.item,
          itemType: body.itemType,
          itemId: body.itemId,
          isReachResponses: false,
          responses: [],
        });
      });
      res.send({
        success: true,
        data: {
          proposal: body.proposal,
          userId: body.userId,
          date: new Date(),
          item: body.item,
          itemType: body.itemType,
          itemId: body.itemId,
          responses: [],
          id: id + 1,
        },
      });
    } else {
      console.log('Error in controllers/userController -> createIssue()', 'No Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> createIssue()', err);
    res.send({ success: false });
  }
};

const responseIssue = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.userName && body.response && body.issueId) {
      const issueRef = db.collection(collections.issues).doc(body.issueId);
      const issueGet = await issueRef.get();
      const issue: any = issueGet.data();

      let response: any = {
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: new Date(),
      };

      issue.responses.push(response);

      await issueRef.update({
        responses: issue.responses,
      });
      res.send({ success: true, data: issue });
    } else {
      console.log('Error in controllers/userController -> responseIssue()', 'Missing Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> responseIssue()', err);
    res.send({ success: false });
  }
};
const responseProposal = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.userName && body.response && body.proposalId) {
      const proposalRef = db.collection(collections.proposals).doc(body.proposalId);
      const proposalGet = await proposalRef.get();
      const proposal: any = proposalGet.data();

      let response: any = {
        userId: body.userId,
        userName: body.userName,
        response: body.response,
        date: new Date(),
      };

      proposal.responses.push(response);

      await proposalRef.update({
        responses: proposal.responses,
      });

      if (proposal.responses.length >= 10 && proposal.isReachResponses) {
        let task = await tasks.updateTask(
          proposal.userId,
          'Create 1 Proposal in Governance that receives 10 or more responses'
        );
        await proposalRef.update({ isReachResponses: true });
        res.send({ success: true, data: proposal, task: task });
      }
      res.send({ success: true, data: proposal });
    } else {
      console.log('Error in controllers/userController -> responseIssue()', 'Missing Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> responseIssue()', err);
    res.send({ success: false });
  }
};

const voteIssue = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.issueId && body.voteId) {
      const issueRef = db.collection(collections.issues).doc(body.issueId);
      const issueGet = await issueRef.get();
      const issue: any = issueGet.data();

      issue.votes[body.voteId].push(body.userId);

      await issueRef.update({
        votes: issue.votes,
      });
      res.send({ success: true, data: issue });
    } else {
      console.log('Error in controllers/userController -> responseIssue()', 'No Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> responseIssue()', err);
    res.send({ success: false });
  }
};

//CHANGE ANON MODE

const changeAnonMode = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.anonMode != undefined) {
      const userRef = db.collection(collections.user).doc(body.userId);

      await userRef.update({
        anon: body.anonMode,
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> changeAnonMode()', 'No Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> changeAnonMode()', err);
    res.send({ success: false });
  }
};

//CHANGE ANON AVATAR

const changeAnonAvatar = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.anonAvatar) {
      const userRef = db.collection(collections.user).doc(body.userId);

      await userRef.update({
        anonAvatar: body.anonAvatar,
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> changeAnonAvatar()', 'No Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> changeAnonAvatar()', err);
    res.send({ success: false });
  }
};

const searchUsers = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.userSearch && body.userSearch !== '') {
      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let users: any[] = [];

      const userQuery = await db
        .collection(collections.user)
        .orderBy('firstName')
        .startAt(body.userSearch)
        .endAt(body.userSearch + '\uf8ff')
        .get();
      if (!userQuery.empty) {
        for (const doc of userQuery.docs) {
          let data = doc.data();
          if (doc.id !== body.userId) {
            let isFollowing: number = 0;
            // 0 -> Not following
            // 1 -> Requested
            // 2 -> Following
            if (user.followings && user.followings.length > 0) {
              let followingUser = user.followings.find((usr) => usr.user === doc.id);
              if (followingUser && followingUser !== {}) {
                if (followingUser.accepted) {
                  isFollowing = 2;
                } else {
                  isFollowing = 1;
                }
              }
            }
            users.push({
              id: doc.id,
              firstName: data.firstName,
              isFollowing: isFollowing,
            });
          }
        }
        res.status(200).send({
          success: true,
          data: users,
        });
      } else {
        res.send({ success: true, data: [] });
      }
    } else {
      console.log('Error in controllers/userController -> searchUsers()', 'No Information');
      res.send({ success: false, error: 'No Information' });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> searchUsers()', err);
    res.send({ success: false, error: err });
  }
};

const updateUserCred = (userId, sum) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = db.collection(collections.user).doc(userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let creds = user.creds;
      let credsForTask = user.credsForTask;

      if (sum) {
        creds = creds + 1;
      } else {
        creds = creds - 1;
      }
      if (creds >= 15 && !credsForTask) {
        credsForTask = true;
        await userRef.update({
          creds: creds,
          credsForTask: credsForTask,
        });

        let task = await tasks.updateTask(userId, 'Receive 15 creds');
        user.task = task;
        resolve(user);
      } else {
        await userRef.update({
          creds: creds,
        });
      }

      user.creds = creds;

      resolve(user);
    } catch (e) {
      console.log('Error sumCredUser(): ' + e);
      resolve('Error sumCredUser(): ' + e);
    }
  });
};

const updateTutorialsSeen = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId) {
      const userRef = db.collection(collections.user).doc(body.userId);

      await userRef.update({
        tutorialsSeen: body.tutorialsSeen,
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> updateTutorialsSeen()', 'No Information');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> updateTutorialsSeen()', err);
    res.send({ success: false });
  }
};

const removeNotification = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.notificationId) {
      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId,
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/userController -> removeNotification()', 'No Information');
      res.send({ success: false, error: 'No Information' });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> removeNotification()', err);
    res.send({ success: false, error: err });
  }
};

const inviteUserToPod = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.podName && body.podId && body.creatorId) {
      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const userCreatorRef = db.collection(collections.user).doc(body.creatorId);
      const userCreatorGet = await userCreatorRef.get();
      const userCreator: any = userCreatorGet.data();

      let podIndexFound = user.followingFTPods.findIndex((pod) => pod === body.podId);
      if (podIndexFound === -1) {
        await notificationsController.addNotification({
          userId: body.userId,
          notification: {
            type: 85,
            typeItemId: 'user',
            itemId: body.creatorId,
            follower: userCreator.firstName,
            pod: body.podName,
            comment: '',
            token: '',
            amount: 0,
            onlyInformation: false,
            otherItemId: body.podId,
          },
        });
        res.send({
          success: true,
          data: 'Notification sent to ' + user.firstName,
        });
      } else {
        res.send({
          success: true,
          data: user.firstName + ' is already following Pod',
        });
      }
    } else {
      console.log('Error in controllers/userController -> inviteUserToPod()', 'No Information');
      res.send({ success: false, error: 'No Information' });
    }
  } catch (err) {
    console.log('Error in controllers/userController -> inviteUserToPod()', err);
    res.send({ success: false, error: err });
  }
};

const getSuggestedUsers = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const randomArr: any[] = await getRandomForSuggestedUser();
    let sugUsers = new Set();

    let followings = new Set(user.followings);

    if (randomArr[0] > 0 && user.followers) {
      let count = randomArr[0];
      for (let j = 0; j < user.followers.length; ++j) {
        if (count == 0) {
          break;
        }
        let usr = user.followers[j];
        if (!followings.has(usr)) {
          const otherUserRef = db.collection(collections.user).doc(usr.user);
          const otherUserGet = await otherUserRef.get();
          const otherUser: any = otherUserGet.data();

          let numFollowing: number = 0;
          if (user) {
            let isFollowing = user.followings.find((following) => following.user === otherUserGet.id);

            if (isFollowing && isFollowing.accepted) {
              numFollowing = 2;
            } else if (isFollowing && !isFollowing.accepted) {
              numFollowing = 1;
            }
          }

          otherUser.isFollowing = numFollowing;
          otherUser.id = otherUserGet.id;

          sugUsers.add(otherUser);
          count--;
        }
      }
    } else if (randomArr[1] > 0 && user.FollowingCommunities) {
      let count = randomArr[1];
      for (let i = 0; i < user.FollowingCommunities; ++i) {
        if (count == 0) {
          break;
        }

        const communityRef = db.collection(collections.community).doc(user.FollowingCommunities[i]);
        const communityGet = await communityRef.get();
        const community: any = communityGet.data();

        let followers = community.Followers;
        for (let j = 0; j < followers.length; ++j) {
          if (count == 0) {
            break;
          }

          if (!followings.has(followers[i])) {
            const otherUserRef = db.collection(collections.user).doc(followers[i].id);
            const otherUserGet = await otherUserRef.get();
            const otherUser: any = otherUserGet.data();

            let numFollowing: number = 0;
            if (user) {
              let isFollowing = user.followings.find((following) => following.user === otherUserGet.id);

              if (isFollowing && isFollowing.accepted) {
                numFollowing = 2;
              } else if (isFollowing && !isFollowing.accepted) {
                numFollowing = 1;
              }
            }
            otherUser.isFollowing = numFollowing;
            otherUser.id = otherUserGet.id;

            sugUsers.add(otherUser);
            count--;
          }
        }
      }
    } else if (randomArr[2] > 0 && (user.FollowingFTPods || user.FollowingNFTPods)) {
      let count = randomArr[2];
      for (let i = 0; i < user.FollowingFTPods; ++i) {
        if (count == 0) {
          break;
        }
        const podRef = db.collection(collections.podsFT).doc(user.FollowingFTPods[i]);
        const podGet = await podRef.get();
        const pod: any = podGet.data();

        let followers = pod.Followers;
        for (let j = 0; j < followers.length; ++j) {
          if (count == 0) {
            break;
          }
          if (!followings.has(followers[i])) {
            const otherUserRef = db.collection(collections.user).doc(followers[i].id);
            const otherUserGet = await otherUserRef.get();
            const otherUser: any = otherUserGet.data();

            let numFollowing: number = 0;
            if (user) {
              let isFollowing = user.followings.find((following) => following.user === otherUserGet.id);

              if (isFollowing && isFollowing.accepted) {
                numFollowing = 2;
              } else if (isFollowing && !isFollowing.accepted) {
                numFollowing = 1;
              }
            }
            otherUser.isFollowing = numFollowing;
            otherUser.id = otherUserGet.id;

            sugUsers.add(otherUser);
            count--;
          }
        }
      }

      for (let i = 0; i < user.FollowingNFTPods; ++i) {
        if (count == 0) {
          break;
        }
        const podRef = db.collection(collections.podsNFT).doc(user.FollowingNFTPods[i]);
        const podGet = await podRef.get();
        const pod: any = podGet.data();

        let followers = pod.Followers;
        for (let j = 0; j < followers.length; ++j) {
          if (count == 0) {
            break;
          }
          if (!followings.has(followers[i])) {
            const otherUserRef = db.collection(collections.user).doc(followers[i].id);
            const otherUserGet = await otherUserRef.get();
            const otherUser: any = otherUserGet.data();

            let numFollowing: number = 0;
            if (user) {
              let isFollowing = user.followings.find((following) => following.user === otherUserGet.id);

              if (isFollowing && isFollowing.accepted) {
                numFollowing = 2;
              } else if (isFollowing && !isFollowing.accepted) {
                numFollowing = 1;
              }
            }
            otherUser.isFollowing = numFollowing;
            otherUser.id = otherUserGet.id;

            sugUsers.add(otherUser);
            count--;
          }
        }
      }
    } else if (randomArr[3] > 0 && user.FollowingCredits) {
      let count = randomArr[3];
      for (let i = 0; i < user.FollowingCredits; ++i) {
        if (count == 0) {
          break;
        }
        const creditRef = db.collection(collections.priviCredits).doc(user.FollowingCredits[i]);
        const creditGet = await creditRef.get();
        const credit: any = creditGet.data();

        let followers = credit.Followers;
        for (let j = 0; j < followers.length; ++j) {
          if (count == 0) {
            break;
          }
          if (!followings.has(followers[i])) {
            const otherUserRef = db.collection(collections.user).doc(followers[i].id);
            const otherUserGet = await otherUserRef.get();
            const otherUser: any = otherUserGet.data();

            let numFollowing: number = 0;
            if (user) {
              let isFollowing = user.followings.find((following) => following.user === otherUserGet.id);

              if (isFollowing && isFollowing.accepted) {
                numFollowing = 2;
              } else if (isFollowing && !isFollowing.accepted) {
                numFollowing = 1;
              }
            }
            otherUser.isFollowing = numFollowing;
            otherUser.id = otherUserGet.id;

            sugUsers.add(otherUser);
            count--;
          }
        }
      }
    }

    res.send({ success: true, data: Array.from(sugUsers) });
  } catch (e) {
    console.log('Error in controllers/userController -> getSuggestedUsers()', e);
    res.send({ success: false, error: e });
  }
};

async function getRandomForSuggestedUser() {
  let weights = [0.35, 0.3, 0.2, 0.15]; // probabilities
  let results = [0, 1, 2, 3]; // values to return
  let probArr: number[] = [];
  let res: number[] = [];
  let num = Math.random(),
    s = 0,
    lastIndex = weights.length - 1;

  for (let i = 0; i < 5; ++i) {
    let notAdded = true;
    for (let i = 0; i < lastIndex; ++i) {
      s += weights[i];
      if (num < s) {
        probArr.push(results[i]);
        notAdded = false;
        break;
      }
    }
    if (notAdded) {
      probArr.push(results[lastIndex]);
    }
  }

  for (let i = 0; i < lastIndex; i++) {
    if (!res[probArr[i]]) {
      res[probArr[i]] = 1;
    } else {
      res[probArr[i]] = ++res[probArr[i]];
    }
  }

  return res;
}

/**
 * Function to check slug before changing it.
 * @param req {urlSlug, type}. urlSlug : identifier of the user/community/pod. type: string that indicates if it's for a user, community, ft pod or nft pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: boolean confirming if it exists or not
 */
const checkSlugExists = async (req: express.Request, res: express.Response) => {
  try {
    let urlSlug = req.params.urlSlug;
    let id = req.params.id;
    let type = req.params.type;

    let urlSlugExists: boolean = false;
    let collectionSnap;

    //get collection and size
    if (type === 'user') {
      collectionSnap = await db.collection(collections.user).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'community') {
      collectionSnap = await db.collection(collections.community).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'ftpod') {
      collectionSnap = await db.collection(collections.podsFT).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'nftpod') {
      collectionSnap = await db.collection(collections.podsNFT).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'credit') {
      collectionSnap = await db.collection(collections.priviCredits).where('urlSlug', '==', urlSlug).get();
    }

    //check size and id
    if (collectionSnap && collectionSnap.size === 1) {
      if (id === collectionSnap.docs[0].id) {
        urlSlugExists = false; //same id, didn't change the urlSlug
      } else urlSlugExists = true;
    } else urlSlugExists = false;

    res.send({
      success: true,
      data: { urlSlugExists: urlSlugExists },
    });
  } catch (e) {
    return 'Error in controllers/userController -> checkSlugExists(): ' + e;
  }
};

/**
 * Function get the id from a slug.
 * @param req {urlSlug, type}. urlSlug : identifier of the user/community/pod. type: string that indicates if it's for a user, community, ft pod or nft pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: the id
 */
const getIdFromSlug = async (req: express.Request, res: express.Response) => {
  try {
    let urlSlug = req.params.urlSlug;
    let type = req.params.type;

    let docSnap;

    let id: string = '';

    console.log('params', req.params);

    if (type === 'user') {
      docSnap = await db.collection(collections.user).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'community') {
      docSnap = await db.collection(collections.community).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'ftpod') {
      docSnap = await db.collection(collections.podsFT).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'nftpod') {
      docSnap = await db.collection(collections.podsNFT).where('urlSlug', '==', urlSlug).get();
    } else if (type === 'credit') {
      docSnap = await db.collection(collections.priviCredits).where('urlSlug', '==', urlSlug).get();
    }

    if (!docSnap.empty) {
      id = docSnap.docs[0].id;
      res.send({
        success: true,
        data: { id: id },
      });
    } else {
      let docIdSnap;

      if (type === 'user') {
        docIdSnap = await db.collection(collections.user).doc(urlSlug).get();
      } else if (type === 'community') {
        docIdSnap = await db.collection(collections.community).doc(urlSlug).get();
      } else if (type === 'ftpod') {
        docIdSnap = await db.collection(collections.podsFT).doc(urlSlug).get();
      } else if (type === 'nftpod') {
        docIdSnap = await db.collection(collections.podsNFT).doc(urlSlug).get();
      } else if (type === 'credit') {
        docIdSnap = await db.collection(collections.priviCredits).doc(urlSlug).get();
      }

      //return id if slug === id
      if (docIdSnap && docIdSnap.exists && docIdSnap.data()) {
        res.send({
          success: true,
          data: { id: urlSlug },
        });
      } else {
        console.log(`${type} id not found`);
        res.send({ succes: false, message: `${type} id not found` });
      }
    }
  } catch (e) {
    return 'Error in controllers/userController -> getIdFromSlug(): ' + e;
  }
};

/**
 * Function get the slug from an id (for re-routing).
 * @param req {urlId, type}. urlId : identifier of the user/community/pod. type: string that indicates if it's for a user, community, ft pod or nft pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: the id
 */
const getSlugFromId = async (req: express.Request, res: express.Response) => {
  try {
    let urlId = req.params.urlId;
    let type = req.params.type;

    let docSnap;
    let urlSlug: string = '';

    console.log('req.params', req.params);

    if (type === 'user') {
      docSnap = await db.collection(collections.user).doc(urlId).get();
    } else if (type === 'community') {
      docSnap = await db.collection(collections.community).doc(urlId).get();
    } else if (type === 'ftpod') {
      docSnap = await db.collection(collections.podsFT).doc(urlId).get();
      console.log(docSnap);
    } else if (type === 'nftpod') {
      docSnap = await db.collection(collections.podsNFT).doc(urlId).get();
    } else if (type === 'credit') {
      docSnap = await db.collection(collections.priviCredits).doc(urlId).get();
    }

    if (docSnap && docSnap.exists && docSnap.data()) {
      urlSlug = docSnap.data().urlSlug;
    }

    if (urlSlug && urlSlug.length > 0) {
      res.send({
        success: true,
        data: { urlSlug: urlSlug },
      });
    } else {
      let docSlugSnap;
      urlSlug = urlId;

      if (type === 'user') {
        docSlugSnap = await db.collection(collections.user).where('urlSlug', '==', urlSlug).get();
      } else if (type === 'community') {
        docSlugSnap = await db.collection(collections.community).where('urlSlug', '==', urlSlug).get();
      } else if (type === 'ftpod') {
        docSlugSnap = await db.collection(collections.podsFT).where('urlSlug', '==', urlSlug).get();
      } else if (type === 'nftpod') {
        docSlugSnap = await db.collection(collections.podsNFT).where('urlSlug', '==', urlSlug).get();
      } else if (type === 'credit') {
        docSlugSnap = await db.collection(collections.priviCredits).where('urlSlug', '==', urlSlug).get();
      }

      //return slug if id === slug
      if (!docSlugSnap.empty) {
        urlSlug = docSnap.docs[0].id;
        res.send({
          success: true,
          data: { urlSlug: urlSlug },
        });
      } else {
        console.log(`${type} urlSlug not found`);
        res.send({ succes: false, message: `${type} urlSlug not found` });
      }
    }
  } catch (e) {
    return 'Error in controllers/userController -> getSlugFromId(): ' + e;
  }
};

/**
 * Function get user friends (followed and following) from id.
 * @param req {userId}. urlId : identifier of the user/community/pod. type: string that indicates if it's for a user, community, ft pod or nft pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: ids list
 */
const getFriends = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    let docSnap;

    docSnap = await db.collection(collections.user).doc(userId).get();

    if (docSnap && docSnap.exists && docSnap.data()) {
      let friends: string[] = [];
      const followings = docSnap.data().followings;
      const followers = docSnap.data().followers;

      if (followings && followers) {
        const followingsAccepted = followings.filter((following) => following.accepted === true);
        const followersAccepted = followers.filter((following) => following.accepted === true);

        followingsAccepted.forEach((following) => {
          if (followersAccepted.some((f) => f.user === following.user)) {
            friends.push(following.user);
          }
        });

        res.send({
          success: true,
          data: { friends: friends },
        });
      } else {
        console.log(`couldn't load friends list`);
        res.send({ succes: false, message: `couldn't load friends list` });
      }
    } else {
      console.log(`couldn't load friends list`);
      res.send({ succes: false, message: `couldn't load friends list` });
    }
  } catch (e) {
    return 'Error in controllers/userController -> getSlugFromId(): ' + e;
  }
};

module.exports = {
  emailValidation,
  forgotPassword,
  resendEmailValidation,
  signIn,
  signUp,
  // createMnemonic,
  getFollowPodsInfo,
  getFollowingUserInfo,
  getOwnInfo,
  getFollowers,
  getFollowing,
  followUser,
  unFollowUser,
  getMyPods,
  getPodsInvestments,
  getPodsFollowed,
  getReceivables,
  getLiabilities,
  editUser,
  updateNewLevel,
  updateNewBadge,
  changeUserProfilePhoto,
  getSocialTokens,
  getBasicInfo,
  getLoginInfo,
  getPhotoById,
  getUserList,
  getBadges,
  getBadgeBySymbol,
  createBadge,
  changeBadgePhoto,
  getIssuesAndProposals,
  createIssue,
  createProposal,
  responseIssue,
  voteIssue,
  responseProposal,
  acceptFollowUser,
  declineFollowUser,
  getNotifications,
  postToWall,
  changePostPhoto,
  getPostPhotoById,
  getBadgePhotoById,
  changeAnonMode,
  changeAnonAvatar,
  likePost,
  dislikePost,
  updateUserCred,
  searchUsers,
  updateTutorialsSeen,
  removeNotification,
  inviteUserToPod,
  getAllInfoProfile,
  getSuggestedUsers,
  getUserScores,
  getStatistics,
  checkSlugExists,
  getIdFromSlug,
  getSlugFromId,
  getFriends,
};
