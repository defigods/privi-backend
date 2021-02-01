import express from "express";
// import * as fs from 'fs';
// import * as path from 'path';
// import { stringify } from 'querystring';
import collections from "../firebase/collections";
import dataProtocol from "../blockchain/dataProtocol";
import coinBalance from "../blockchain/coinBalance";
import { db } from "../firebase/firebase";
import badge from "../blockchain/badge";
import {
  getUidFromEmail,
  generateUniqueId,
  addZerosToHistory,
  getRateOfChangeAsMap,
  singTransaction,
  updateFirebase,
} from "../functions/functions";
import { addListener } from "cluster";
import path from "path";
import fs from "fs";
import notificationTypes from "../constants/notificationType";
const bcrypt = require("bcrypt");
const FieldValue = require("firebase-admin").firestore.FieldValue;
import configuration from "../constants/configuration";
import { accessSync } from "fs";
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
import {
  sendForgotPasswordEmail,
  sendEmailValidation,
} from "../email_templates/emailTemplates";
const bip39 = require("bip39");
const hdkey = require("hdkey");
const {
  privateToPublic,
  publicToAddress,
  toChecksumAddress,
} = require("ethereumjs-util");
const { PRIVI_WALLET_PATH } = require("../constants/configuration");

// require('dotenv').config();
//const apiKey = process.env.API_KEY;
const notificationsController = require("./notificationsController");

const apiKey = "PRIVI"; // just for now

import { sockets } from "./serverController";
import {user} from "firebase-functions/lib/providers/auth";

const emailValidation = async (req: express.Request, res: express.Response) => {
  let success = false;
  let message = "";
  // let message_key = "";

  const validation_slug = req.params.validation_slug;

  const decodeValidationSlug = Buffer.from(validation_slug, "base64").toString(
    "ascii"
  );
  const split = decodeValidationSlug.split("_");
  if (split.length == 2) {
    const uid = split[0];
    const validationSecret = split[1];

    // look for user record given uid
    const userRef = db.collection(collections.user).doc(uid);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    if (user == null) {
      message = "user not found";
      // message_key = "USER_NOT_FOUND";
    } else {
      if (user.isEmailValidated) {
        message = "user already validated";
        // message_key = "USER_ALREADY_VALIDATED";
      } else {
        if (user.validationSecret == validationSecret) {
          // update user
          user.isEmailValidated = true;
          user.validationSecret = "";

          db.collection(collections.user).doc(uid).update(user);

          message =
            "We have successfully verified your email address, please log in here https://privibeta.web.app/";
          // message_key = "VALIDATION_SUCCESS";

          success = true;
        } else {
          message = "failed to validate user";
          // message_key = "INVALID_VALIDATION_SECRET";
        }
      }
    }
  } else {
    message = "invalid validation link";
    // message_key = "INVALID_VALIDATION_LINK";
  }

  res.setHeader("Content-Type", "text/html");
  res.send(message);
}; // emailValidation

const forgotPassword = async (req: express.Request, res: express.Response) => {
  const body = req.body;

  const email = body.email;
  if (email) {
    const user = await db
      .collection(collections.user)
      .where("email", "==", email)
      .get();

    if (user.empty) {
      console.log("not found");
      res.send({ success: false, message: "user not found" });
    } else {
      // create a temporary password
      let tempPassword = crypto.randomBytes(8).toString("hex");
      // console.log("temporary password:", tempPassword);

      const data = user.docs[0].data();

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(tempPassword, salt);
      data["temp_password"] = hash;

      let expiryDate = new Date();
      expiryDate.setDate(
        new Date().getDate() + configuration.FORGOT_PASSWORD_EXPIRY_DAYS
      );
      data["temp_password_expiry"] = expiryDate.getTime(); // 1 day temporary password expiry

      data["lastUpdate"] = Date.now();

      // save to db
      db.collection(collections.user).doc(user.docs[0].id).update(data);

      let successEmail = await sendForgotPasswordEmail(data, tempPassword);
      if (successEmail) {
        res.send({
          success: true,
          message: "Temporary password sent to email.",
        });
      } else {
        res.send({
          success: false,
          message: "Failed to send temporary password email.",
        });
      }
    }
  } else {
    console.log("email required");
    res.send({ success: false, message: "email required" });
  }
}; // forgotPassword

const resendEmailValidation = async (
  req: express.Request,
  res: express.Response
) => {
  const body = req.body;

  const email = body.email;
  if (email) {
    const user = await db
      .collection(collections.user)
      .where("email", "==", email)
      .get();

    if (user.empty) {
      console.log("not found");
      res.send({ success: false, message: "user not found" });
    } else {
      const data = user.docs[0].data();

      if (data.isEmailValidated) {
        res.send({ success: false, message: "user already validated" });
      } else {
        if (!data.validationSecret) {
          // no validation secret field
          data.validationSecret = crypto.randomBytes(8).toString("hex");
          data.isEmailValidated = false;

          // save to db
          db.collection(collections.user).doc(user.docs[0].id).update(data);
        }

        data.id = user.docs[0].id;
        let successEmail = await sendEmailValidation(data, true);
        if (!successEmail) {
          console.log("failed to resend email validation");
        }

        res.send({ success: true, message: "email validation resent" });
      }
    }
  } else {
    console.log("email required");
    res.send({ success: false, message: "email required" });
  }
}; // resendEmailValidation

const signIn = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const email = body.email;
    const password = body.password;
    if (email && password) {
      // Compare user & passwd between login input and DB
      const user = await db
        .collection(collections.user)
        .where("email", "==", email)
        .get();
      // Return result
      if (user.empty) {
        console.log("not found");
        res.send({ isSignedIn: false, userData: {} });
      } else {
        console.log("found from email");
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
            message: "please validate your email",
            message_key: "EMAIL_VALIDATION_REQUIRED",
          });
        } else {
          let success = false;

          if (data.password == password) {
            // unencrypted so let's encrypt this password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            data["password"] = hash;

            db.collection(collections.user).doc(user.docs[0].id).update(data);

            success = true;
            console.log("password encrypted");
          } else {
            let isSame = await bcrypt.compare(password, data.password);
            success = isSame;

            if (
              !isSame &&
              data.temp_password &&
              data.temp_password_expiry > Date.now()
            ) {
              // has temporary password that is not yet expired
              isSame = await bcrypt.compare(password, data.temp_password);
              success = isSame;

              if (isSame) {
                // let's use the temporary password going forward
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                data["password"] = hash;

                // delete temp fields
                data["temp_password"] = FieldValue.delete();
                // data["temp_password_expiry"] = FieldValue.delete(); // retain so we know the last forgot request

                data["lastUpdate"] = Date.now();

                db.collection(collections.user)
                  .doc(user.docs[0].id)
                  .update(data);

                console.log("temporary password used");
              }
            }
          }

          data.id = user.docs[0].id;
          if (success) {
            console.log("Login successful");

            // Generate an access token
            let expiryDate = new Date();
            expiryDate.setDate(
              new Date().getDate() + configuration.LOGIN_EXPIRY_DAYS
            );

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
            console.log("wrong password");
            res.send({ isSignedIn: false, userData: {} });
            return;
          }
        }
      }
    } else {
      console.log("email and password required");
      res.send({ isSignedIn: false, userData: {} });
    }
  } catch (err) {
    console.log("Error in controllers/user.ts -> signIn(): ", err);
  }
};

const attachAddress = async (userPublicId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("got call from", userPublicId);
      // const role = body.role; // role should not be coming from user input?
      const role = "USER";
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
      const publicKey = "0x04" + pubKey.toString("hex");
      const address = "0x" + (await publicToAddress(pubKey).toString("hex"));
      // const addressCheckSum = await toChecksumAddress(address);

      const blockchainRes = await dataProtocol.attachAddress(
        userPublicId,
        address,
        caller
      );

      if (blockchainRes && blockchainRes.success) {
        // set address and mnemonic in User DB
        await db.runTransaction(async (transaction) => {
          // userData - no check if firestore insert works? TODO
          transaction.update(
            db.collection(collections.user).doc(userPublicId),
            {
              mnemonic: mnemonic,
              pubKey: publicKey,
              address: address,
              lastUpdate: lastUpdate,
            }
          );
        });

        resolve({
          success: true,
          uid: userPublicId,
          address: address,
          lastUpdate: lastUpdate,
        });
      } else {
        console.log(
          "Warning in controllers/user.ts -> attachaddress():",
          blockchainRes
        );
        reject({ success: false });
      }
    } catch (err) {
      console.log("Error in controllers/user.ts -> attachaddress(): ", err);
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
    const role = "USER";

    if (email == "" || password == "") {
      // basic requirement validation
      console.log("email and password required");
      res.send({ success: false, message: "email and password required" });
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

    let uid: string = "";
    const lastUpdate = Date.now();

    // check if email is in database
    const emailUidMap = await getUidFromEmail(email);
    let toUid = emailUidMap[email!.toString()];

    if (toUid) {
      res.send({ success: false, message: "email is already in database" });
      return;
    }

    const orgName = "companies"; // hardcoded for now
    const userPublicId = generateUniqueId(); // now we generate it
    const caller = apiKey;
    const blockchainRes = await dataProtocol.registerUser(
      orgName,
      userPublicId,
      role,
      caller
    );

    if (blockchainRes && blockchainRes.success) {
      // Get IDs from blockchain response
      uid = userPublicId;

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const validationSecret = crypto.randomBytes(8).toString("hex");

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

          /*
                                        gender: gender,
                                        age: age,
                                        location: location,
                                        address: address,
                                        postalCode: postalCode,
                                        lastName: lastName,
                                        dialCode: dialCode,
                                        phone: phone,
                    */

          lastUpdate: lastUpdate,
          endorsementScore: 0.5,
          trustScore: 0.5,
          awards: [],
          creds: 0,
          badges: [],
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
          twitter: "",
          instagram: "",
          facebook: "",
          level: 1,
          notifications: [],
          verified: false,
          anon: false,
          anonAvatar: "ToyFaces_Colored_BG_111.jpg",
          hasPhoto: false,
          mnemonic: "",
          pubKey: "",
          address: "",
          tutorialsSeen: {
            communities: false,
            pods: false,
            creditPools: false,
          },
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
      addZerosToHistory(
        db
          .collection(collections.wallet)
          .doc(uid)
          .collection(collections.cryptoHistory),
        "balance"
      );
      addZerosToHistory(
        db
          .collection(collections.wallet)
          .doc(uid)
          .collection(collections.ftHistory),
        "balance"
      );
      addZerosToHistory(
        db
          .collection(collections.wallet)
          .doc(uid)
          .collection(collections.nftHistory),
        "balance"
      );
      addZerosToHistory(
        db
          .collection(collections.wallet)
          .doc(uid)
          .collection(collections.socialHistory),
        "balance"
      );

      // ------------------------- Provisional for TestNet ---------------------------------
      // give user some balance in each tokens (50/tokenRate).
      const updatedUserSnap = await db
        .collection(collections.user)
        .doc(uid)
        .get();
      const updatedUserData: any = updatedUserSnap.data();
      const userAddress = updatedUserData.address;
      const coinsVal = 100; // value in USD to be sent
      const blockchainRes2 = await coinBalance.getTokenListByType(
        "CRYPTO",
        apiKey
      );
      const registeredCryptoTokens: string[] = blockchainRes2.output ?? [];
      const rateOfChange: any = await getRateOfChangeAsMap(); // get rate of tokens
      registeredCryptoTokens.forEach((token) => {
        const rate = rateOfChange[token] ?? 1;
        const amount = coinsVal / rate;
        coinBalance
          .mint("transfer", "", userAddress, amount, token, apiKey)
          .then((blockchainRes3) => {
            console.log(blockchainRes3);
            if (!blockchainRes3.success) {
              console.log(
                `user ${uid} dindt get ${token}, ${blockchainRes3.message}`
              );
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
        console.log("failed to send email validation");
      }

      res.send({ success: true, uid: uid, lastUpdate: lastUpdate });
    } else {
      console.log("Warning in controllers/user.ts -> signUp():", blockchainRes);
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/user.ts -> signUp(): ", err);
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
  awards: any[];
  creds: number;
  badges: any[];
  numFollowers: number;
  numFollowings: number;
  followers: any[];
  followings: any[];
  bio: string;
  level: number;
  twitter: string;
  facebook: string;
  instagram: string;
  notifications: any[];
  anon: boolean;
  anonAvatar: string;
  hasPhoto: boolean;
}

const getBasicInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    let basicInfo: BasicInfo = {
      name: "",
      trustScore: 0.5,
      endorsementScore: 0.5,
      numFollowers: 0,
      followers: [],
      awards: [],
      creds: 0,
      badges: [],
      numFollowings: 0,
      followings: [],
      bio: "",
      level: 1,
      twitter: "",
      instagram: "",
      facebook: "",
      notifications: [],
      anon: false,
      anonAvatar: "ToyFaces_Colored_BG_111.jpg",
      hasPhoto: false,
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
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
      basicInfo.name =
        userData.firstName + (userData.lastName ? " " + userData.lastName : "");
      basicInfo.trustScore = userData.trustScore;
      basicInfo.endorsementScore = userData.endorsementScore;
      basicInfo.creds = userData.creds || 0;
      basicInfo.awards = userData.awards || [];
      basicInfo.badges = userData.badges || [];
      basicInfo.numFollowers = userData.numFollowers || 0;
      basicInfo.numFollowings = userData.numFollowings || 0;
      basicInfo.followers = userData.followers || [];
      basicInfo.followings = userData.followings || [];
      basicInfo.bio = userData.bio || "";
      basicInfo.level = userData.level || 1;
      basicInfo.twitter = userData.twitter || "";
      basicInfo.instagram = userData.instagram || "";
      basicInfo.facebook = userData.facebook || "";
      basicInfo.notifications = userData.notifications || [];
      // basicInfo.notifications = basicInfo.notifications.concat(allWallPost);
      basicInfo.notifications.sort((a, b) =>
        b.date > a.date ? 1 : a.date > b.date ? -1 : 0
      );
      basicInfo.anon = userData.anon || false;
      basicInfo.anonAvatar =
        userData.anonAvatar || "ToyFaces_Colored_BG_111.jpg";
      basicInfo.hasPhoto = userData.hasPhoto || false;

      res.send({ success: true, data: basicInfo });
    } else res.send({ success: false });
  } catch (err) {
    console.log("Error in controllers/profile -> getBasicInfo()", err);
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
      userData.notifications.sort((a, b) =>
        b.date > a.date ? 1 : a.date > b.date ? -1 : 0
      );
      res.send({ success: true, data: userData });
    } else {
      res.send({ success: false, error: 'User not found' });
    }
  } catch (err) {
    console.log("Error in controllers/profile -> getBasicInfo()", err);
    res.send({ success: false, error: err });
  }
};

const getAllInfoProfile = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    if (userData !== undefined) {

      let badges = await getBadgesFunction(userId);
      let myPods = await getMyPodsFunction(userId);
      let podsFollowed = await getPodsFollowedFunction(userId);
      let podsInvestments = await getPodsInvestmentsFunction(userId);
      let followPodsInfo = await getFollowPodsInfoFunction(userId);

      res.send({ success: true, data: {
          badges: badges,
          myPods: myPods,
          podsFollowed: podsFollowed,
          podsInvestments: podsInvestments,
          followPodsInfo: followPodsInfo
        }
      });
    } else  {
      res.send({ success: false, error: 'User not found' });
    }
  } catch (err) {
    console.log("Error in controllers/profile -> getBasicInfo()", err);
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
    console.log("Error in controllers/profile -> getFollowPodsInfo()", err);
    res.send({ success: false, error: err });
  }
};

const getFollowPodsInfoFunction = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const actions = [];
      let action: Action = {
        name: "",
        profilePhoto: "",
        description: "",
        date: Date.now(),
      };
      const userSnap = await db.collection(collections.user).doc(userId).get();
      const userData = userSnap.data();
      if (userData !== undefined) {
        const followingFTPods = userData.followingFTPods;
        const followingNFTPods = userData.followingNFTPods;
        for (let i = 0; i < followingFTPods.length; i++) {
          const podSnap = await db
            .collection(collections.podsFT)
            .doc(followingFTPods[i])
            .get();
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
}

const getFollowingUserInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);
    const actions = [];
    let action: Action = {
      name: "",
      profilePhoto: "",
      description: "",
      date: Date.now(),
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    if (userData !== undefined) {
      const followings = userData.followings;
      for (let i = 0; i < followings.length; i++) {
        const followUserSnap = await db
          .collection(collections.user)
          .doc(followings[i])
          .get();
        const followUserData = followUserSnap.data();
        // create action and fill actions (to be specified)
      }
      res.send({ success: true, data: actions });
    } else {
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/profile -> getFollowingUserInfo()", err);
    res.send({ success: false });
  }
};

const getOwnInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);
    const actions = [];
    let action: Action = {
      name: "",
      profilePhoto: "",
      description: "",
      date: Date.now(),
    };
    const userSnap = await db.collection(collections.user).doc(userId).get();
    const userData = userSnap.data();
    // create action and fill actions (to be specified)
    res.send({ success: true, data: actions });
  } catch (err) {
    console.log("Error in controllers/profile -> getOwnInfo()", err);
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
      userData.notifications.sort((a, b) =>
        b.date > a.date ? 1 : a.date > b.date ? -1 : 0
      );

      res.send({ success: true, data: userData.notifications });
    } else {
      res.send({ success: true, data: [] });
    }
  } catch (err) {
    console.log("Error in controllers/profile -> getNotifications()", err);
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
        sockets[req.body.priviUser.id].emit("new wall post", data);
      }
    } else {
      console.log("parameters required");
      res.send({ success: false, message: "parameters required" });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> postToWall()", err);
    res.send({ success: false });
  }
};

const changePostPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const wallPostRef = db
        .collection(collections.wallPost)
        .doc(req.file.originalname);
      const wallPostGet = await wallPostRef.get();
      const wallPost: any = wallPostGet.data();
      if (wallPost.HasPhoto) {
        await wallPostRef.update({
          HasPhoto: true,
        });
      }
      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/userController -> changePostPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> changePostPhoto()",
      err
    );
    res.send({ success: false });
  }
};

const likePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const wallPostRef = db
      .collection(collections.wallPost)
      .doc(body.wallPostId);
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
    console.log("Error in controllers/userController -> likePost()", err);
    res.send({ success: false });
  }
};

const dislikePost = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const wallPostRef = db
      .collection(collections.wallPost)
      .doc(body.wallPostId);
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
    console.log("Error in controllers/userController -> dislikePost()", err);
    res.send({ success: false });
  }
};

const getPostPhotoById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let postId = req.params.postId;
    console.log(postId);
    if (postId) {
      const directoryPath = path.join("uploads", "wallPost");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "wallPost", postId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/userController -> getPostPhotoById()",
        "There's no post id..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> getPostPhotoById()",
      err
    );
    res.send({ success: false });
  }
};

// CONNECTIONS FUNCTIONS

const getFollowers = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    const userRef = await db.collection(collections.user).doc(userId).get();
    const user: any = userRef.data();

    if (user && user.followers) {
      if (user.followers.length === 0) {
        res.send({
          success: true,
          data: {
            followers: 0
          },
        });
      } else {
        let followers: any[] = [];
        user.followers.forEach(async (follower, id) => {
          if(follower.accepted) {
            const followerInfo = await db.collection(collections.user)
              .doc(follower.user)
              .get();
            const followerData: any = followerInfo.data();

            let isFollowing = user.followings.find(
              (following) => following.user === follower.user
            );

            let numFollowing : number = 0;
            if(isFollowing && isFollowing.accepted) {
              numFollowing = 2;
            } else if(isFollowing && !isFollowing.accepted) {
              numFollowing = 1;
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
      console.log("Error in controllers/profile -> getFollowers()", 'Error getting followers');
      res.send({ success: false, error: 'Error getting followers' });
    }
  } catch (err) {
    console.log("Error in controllers/profile -> getFollowers()", err);
    res.send({ success: false, error: err });
  }
};

const getFollowing = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
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
          const followingInfo = await db
            .collection(collections.user)
            .doc(following.user)
            .get();
          const followingData: any = followingInfo.data();

          let numFollowing : number = 0;
          if(following && following.accepted) {
            numFollowing = 2;
          } else if(following && !following.accepted) {
            numFollowing = 1;
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
    console.log("Error in controllers/profile -> getFollowing()", err);
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

    let alreadyFollower = userToFollowData.followers.find(
      (item) => item === body.user.id
    );
    if (!alreadyFollower) {
      userToFollowData.followers.push({
        user: body.user.id,
        accepted: false,
      });
    }

    await userToFollowRef.update({
      followers: userToFollowData.followers,
    });

    let alreadyFollowing = user.followings.find((item) => item.user === body.user.id);
    if (!alreadyFollowing) {
      user.followings.push({
        user: body.userToFollow.id,
        accepted: false
      });
    }

    await userRef.update({
      followings: user.followings
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
                otherItemId: ''
            }
        });
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

    const userRef = db.collection(collections.user)
      .doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToAcceptRef = db.collection(collections.user)
      .doc(userToAcceptFollow.id);
    const userToAcceptGet = await userToAcceptRef.get();
    const userToAcceptData: any = userToAcceptGet.data();

    let alreadyFollowerIndex = user.followers.findIndex((item) => item.user === userToAcceptFollow.id);
    if (alreadyFollowerIndex !== -1) {
      user.followers[alreadyFollowerIndex] = {
        user: userToAcceptFollow.id,
        accepted: true
      }
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
        accepted: true
      }
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found'});
      return;
    }

    let followingAccepted = userToAcceptData.followings.filter((item) => item.accepted === true);
    userToAcceptData.numFollowings = followingAccepted.length;

    await userRef.update({
      followers: user.followers,
      numFollowers: user.numFollowers
    });

    await userToAcceptRef.update({
      followings: userToAcceptData.followings,
      numFollowings: userToAcceptData.numFollowings
    });

    if(body.idNotification) {
      await notificationsController.removeNotification({
        userId: body.user.id,
        notificationId: body.idNotification
      })
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
        otherItemId: ''
      }
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

    const userRef = db.collection(collections.user)
      .doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToDeclineRef = db.collection(collections.user)
      .doc(userToDeclineFollow.id);
    const userToDeclineGet = await userToDeclineRef.get();
    const userToDeclineData: any = userToDeclineGet.data();

    let alreadyFollowerIndex = user.followers.findIndex((item) => item.user === userToDeclineFollow.id);
    if (alreadyFollowerIndex !== -1) {
      user.followers.splice(alreadyFollowerIndex, 1);
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found'});
      return;
    }

    let followersAccepted = user.followers.filter((item) => item.accepted === true);
    user.numFollowers = followersAccepted.length;

    let alreadyFollowingIndex = userToDeclineData.followings.findIndex((item) => item.user === body.user.id);
    if (alreadyFollowingIndex !== -1) {
      userToDeclineData.followings.splice(alreadyFollowingIndex, 1);
    } else {
      console.log('Error in controllers/userController -> acceptFollowUser()', 'Following request not found');
      res.send({ success: false, error: 'Following request not found'});
      return;
    }

    let followingAccepted = userToDeclineData.followings.filter((item) => item.accepted === true);
    userToDeclineData.numFollowings = followingAccepted.length;

    await userRef.update({
      followers: user.followers,
      numFollowers: user.numFollowers
    });

    await userToDeclineRef.update({
      followings: userToDeclineData.followings,
      numFollowings: userToDeclineData.numFollowings
    });

    if(body.idNotification) {
      await notificationsController.removeNotification({
        userId: body.user.id,
        notificationId: body.idNotification
      })
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

    const userRef = db.collection(collections.user)
      .doc(body.user.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    const userToUnFollowRef = db.collection(collections.user)
      .doc(userToUnFollow.id);
    const userToUnFollowGet = await userToUnFollowRef.get();
    const userToUnFollowData: any = userToUnFollowGet.data();

    let newFollowings = user.followings.filter(item => item.user != userToUnFollow.id);
    let newFollowingNum = user.followings.filter((item) => item.user != userToUnFollow.id && item.accepted === true);

    let newFollowers = userToUnFollowData.followers.filter((item) => item.user !== body.user.id);
    let newFollowersNum = userToUnFollowData.followers.filter((item) => item.user !== body.user.id && item.accepted === true);

    await userToUnFollowRef.update({
      followers: newFollowers,
      numFollowers: newFollowersNum.length
    });
    await userRef.update({
      followings: newFollowings,
      numFollowings: newFollowingNum.length
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

    res.send({ success: true, data: myPods});
  } catch (err) {
    console.log("Error in controllers/profile -> getMyPods()", err);
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
        myNFTPods = await getPodsArray(user.myNFTPods, collections.podsNFT);
      }

      if (user.myFTPods && user.myFTPods.length > 0) {
        myFTPods = await getPodsArray(user.myFTPods, collections.podsFT);
      }

      resolve({
        NFT: myNFTPods || [],
        FT: myFTPods || [],
      });
    } catch (e) {
      reject(e);
    }
  });
}

const getPodsInvestments = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    let pods = await getPodsInvestmentsFunction(userId);

    res.send({
      success: true,
      data: pods,
    });
  } catch (err) {
    console.log("Error in controllers/profile -> getPodsInvestments()", err);
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
        investedNFTPods = await getPodsArray(
          user.investedNFTPods,
          collections.podsNFT
        );
      }

      if (user.investedFTPods && user.investedFTPods.length > 0) {
        investedFTPods = await getPodsArray(
          user.investedFTPods,
          collections.podsFT
        );
      }
      resolve({
        NFT: investedNFTPods,
        FT: investedFTPods,
      })
    } catch(e) {
      reject(e);
    }
  });
}

const getPodsFollowed = async (req: express.Request, res: express.Response) => {
  let userId = req.params.userId;
  try {
    let pods = await getPodsFollowedFunction(userId);

    res.send({ success: true, data: pods });
  } catch (err) {
    console.log("Error in controllers/profile -> getPodsFollowed()", err);
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
        followingNFTPods = await getPodsArray(
          user.followingNFTPods,
          collections.podsNFT
        );
      }

      if (user.followingFTPods && user.followingFTPods.length > 0) {
        followingFTPods = await getPodsArray(
          user.followingFTPods,
          collections.podsFT
        );
      }
      resolve({
        NFT: followingNFTPods,
        FT: followingFTPods,
      });
    } catch (e) {
      reject(e);
    }
  });
}

const getPodsArray = (arrayPods: any[], collection: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    let podInfo: any[] = [];
    arrayPods.forEach(async (item, i) => {
      const podRef = await db.collection(collection).doc(item).get();

      podInfo.push(podRef.data());

      if (arrayPods.length === i + 1) {
        resolve(podInfo);
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
    console.log("Error in controllers/editUser -> editUser()", err);
    res.send({ success: false });
  }
};

const editUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const userRef = db.collection(collections.user).doc(body.id);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    await userRef.update({
      firstName: body.firstName,
      lastName: body.lastName,
      // dob: body.dob,
      country: body.country,
      postalCode: body.postalCode,
      location: body.location,
      address: body.address,
      bio: body.bio,
      instagram: body.instagram,
      twitter: body.twitter,
      facebook: body.facebook,
    });

    res.send({
      success: true,
      data: {
        id: body.id,
        firstName: body.firstName,
        lastName: body.lastName,
        //dob: body.dob,
        country: body.country,
        postalCode: body.postalCode,
        location: body.location,
        address: body.address,
        bio: body.bio,
        instagram: body.instagram,
        twitter: body.twitter,
        facebook: body.facebook,
      },
    });
  } catch (err) {
    console.log("Error in controllers/editUser -> editUser()", err);
    res.send({ success: false });
  }
};

const changeUserProfilePhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      const userRef = db
        .collection(collections.user)
        .doc(req.file.originalname);
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
      console.log(
        "Error in controllers/userController -> changeUserProfilePhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> changePodPhoto()", err);
    res.send({ success: false });
  }
};

const getPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;
    console.log(userId);
    if (userId) {
      const directoryPath = path.join("uploads", "users");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "users", userId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/userController -> getPhotoById()",
        "There's no id..."
      );
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> getPhotoById()", err);
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
        .where("endorsementScore", ">", filters.endorsementScore[0] / 100)
        .where("trustScore", ">", filters.trustScore[0] / 100);
      usersRef
        .where("endorsementScore", "<", filters.endorsementScore[1] / 100)
        .where("trustScore", "<", filters.trustScore[1] / 100)
        .orderBy("Followers", "desc");

      const usersGet = await usersRef.get();

      let arrayUsers: any[] = [];
      usersGet.docs.map((doc, i) => {
        let data = doc.data();
        data.id = doc.id;
        let name = "";
        if (data.lastName && data.lastName !== "") {
          name = data.firstName + " " + data.lastName;
        } else {
          name = data.firstName;
        }

        if (filters.name === "" || name.startsWith(filters.name)) {
          arrayUsers.push(data);
        }
        if (usersGet.docs.length === i + 1) {
          if (arrayUsers.length !== 0) {
            arrayUsers.forEach((item, i) => {
              if (user.followings && user.followings.length !== 0) {
                item.isFollowing =
                  user.followings.findIndex((usr) => usr === item.id) !== -1;
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
      console.log(
        "Error in controllers/userController -> getUserList()",
        "There's no filters"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> getUserList()", err);
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
    console.log("Error in controllers/userController -> getBadges()" + e)
    res.send({ success: false, error: e });
  }
};

const getBadgesFunction = (userId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = db.collection(collections.user)
        .doc(userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const retData: any[] = [];
      const blockchainRes = await coinBalance.getBalancesByType(
        user.address,
        collections.badgeToken,
        apiKey
      );
      if (blockchainRes && blockchainRes.success) {
        const badgesBalance = blockchainRes.output;
        const badgeSnap = await db.collection(collections.badges).get();
        badgeSnap.forEach((doc) => {
          let amount = 0;
          if (badgesBalance[doc.id]) amount = badgesBalance[doc.id].Amount;
          if (amount > 0) {
            retData.push({
              ...doc.data(),
              Amount: amount,
            });
          }
        });
        resolve(retData);
      } else {
        console.log("Error in controllers/userController -> getBadges()", blockchainRes.message);
        reject(blockchainRes.message);
      }
    } catch (e) {
      reject(e);
    }
  });
}

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
      console.log(
        "Error in controllers/userController -> createBadge(): success = false.",
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (e) {
    return "Error in controllers/userController -> createBadge()" + e;
  }
};

const changeBadgePhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      const badgeRef = db
        .collection(collections.badges)
        .doc(req.file.originalname);

      const badgeGet = await badgeRef.get();
      const badge: any = await badgeGet.data();

      if (badge.hasPhoto) {
        await badgeRef.update({
          hasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/userController -> changeBadgePhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> changeBadgePhoto()",
      err
    );
    res.send({ success: false });
  }
};

const getBadgePhotoById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let badgeId = req.params.badgeId;
    console.log(badgeId);
    if (badgeId) {
      const directoryPath = path.join("uploads", "badges");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "badges", badgeId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/userController -> getBadgePhotoById()",
        "There's no id..."
      );
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> getBadgePhotoById()",
      err
    );
    res.send({ success: false });
  }
};

const getIssuesAndProposals = async (
  req: express.Request,
  res: express.Response
) => {
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
        transaction.set(db.collection(collections.issues).doc("" + (id + 1)), {
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
      console.log(
        "Error in controllers/userController -> createIssue()",
        "Missing Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> createIssue()", err);
    res.send({ success: false });
  }
};

const createProposal = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    let proposalsGet = await db.collection(collections.proposals).get();
    let id = proposalsGet.size;

    if (
      body &&
      body.proposal &&
      body.userId &&
      body.item &&
      body.itemType &&
      body.itemId
    ) {
      await db.runTransaction(async (transaction) => {
        transaction.set(
          db.collection(collections.proposals).doc("" + (id + 1)),
          {
            proposal: body.proposal,
            userId: body.userId,
            date: new Date(),
            item: body.item,
            itemType: body.itemType,
            itemId: body.itemId,
            responses: [],
          }
        );
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
      console.log(
        "Error in controllers/userController -> createIssue()",
        "No Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> createIssue()", err);
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
      console.log(
        "Error in controllers/userController -> responseIssue()",
        "Missing Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> responseIssue()", err);
    res.send({ success: false });
  }
};
const responseProposal = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let body = req.body;

    if (
      body &&
      body.userId &&
      body.userName &&
      body.response &&
      body.proposalId
    ) {
      const proposalRef = db
        .collection(collections.proposals)
        .doc(body.proposalId);
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
      res.send({ success: true, data: proposal });
    } else {
      console.log(
        "Error in controllers/userController -> responseIssue()",
        "Missing Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> responseIssue()", err);
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
      console.log(
        "Error in controllers/userController -> responseIssue()",
        "No Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> responseIssue()", err);
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
      console.log(
        "Error in controllers/userController -> changeAnonMode()",
        "No Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> changeAnonMode()", err);
    res.send({ success: false });
  }
};

//CHANGE ANON AVATAR

const changeAnonAvatar = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let body = req.body;

    if (body && body.userId && body.anonAvatar) {
      const userRef = db.collection(collections.user).doc(body.userId);

      await userRef.update({
        anonAvatar: body.anonAvatar,
      });

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/userController -> changeAnonAvatar()",
        "No Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> changeAnonAvatar()",
      err
    );
    res.send({ success: false });
  }
};

const searchUsers = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.userSearch && body.userSearch !== '') {
      const userRef = db.collection(collections.user)
        .doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let users : any[] = [];

      const userQuery = await db.collection(collections.user)
        .orderBy('firstName')
        .startAt(body.userSearch)
        .endAt(body.userSearch+"\uf8ff").get();
      if (!userQuery.empty) {
        for (const doc of userQuery.docs) {
          let data = doc.data();
          if(doc.id !== body.userId) {
            let isFollowing : number = 0;
            // 0 -> Not following
            // 1 -> Requested
            // 2 -> Following
            if(user.followings && user.followings.length > 0) {
              let followingUser = user.followings.find(usr => usr.user === doc.id);
              if (followingUser && followingUser !== {}) {
                if(followingUser.accepted) {
                  isFollowing = 2;
                } else {
                  isFollowing = 1;
                }
              }
            }
            users.push({
              id: doc.id,
              firstName: data.firstName,
              isFollowing: isFollowing
            });
          }
        }
        res.status(200).send({
          success: true,
          data: users
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
}

const updateUserCred = (userId, sum) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userRef = db.collection(collections.user).doc(userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      let creds = user.creds;
      if (sum) {
        creds = creds + 1;
      } else {
        creds = creds - 1;
      }

      await userRef.update({
        creds: creds,
      });

      user.creds = creds;

      resolve(user);
    } catch (e) {
      console.log("Error sumCredUser(): " + e);
      resolve("Error sumCredUser(): " + e);
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
      console.log(
        "Error in controllers/userController -> updateTutorialsSeen()",
        "No Information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/userController -> updateTutorialsSeen()",
      err
    );
    res.send({ success: false });
  }
};

const removeNotification = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.notificationId) {
      await notificationsController.removeNotification({
        userId: body.userId,
        notificationId: body.notificationId
      });

      res.send({ success: true });
    } else {
      console.log("Error in controllers/userController -> removeNotification()", "No Information");
      res.send({ success: false, error: "No Information" });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> removeNotification()", err);
    res.send({ success: false, error: err });
  }
}

const inviteUserToPod = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    if (body && body.userId && body.podName && body.podId && body.creatorId) {

      const userRef = db.collection(collections.user)
        .doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      const userCreatorRef = db.collection(collections.user)
        .doc(body.creatorId);
      const userCreatorGet = await userCreatorRef.get();
      const userCreator: any = userCreatorGet.data();

      let podIndexFound = user.followingFTPods.findIndex(pod => pod === body.podId);
      if(podIndexFound === -1) {
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
            otherItemId: body.podId
          }
        });
        res.send({ success: true, data: 'Notification sent to ' + user.firstName });
      } else {
        res.send({ success: true, data: user.firstName + ' is already following Pod' });
      }
    } else {
      console.log("Error in controllers/userController -> inviteUserToPod()", "No Information");
      res.send({ success: false, error: "No Information" });
    }
  } catch (err) {
    console.log("Error in controllers/userController -> inviteUserToPod()", err);
    res.send({ success: false, error: err });
  }
}

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
  changeUserProfilePhoto,
  getSocialTokens,
  getBasicInfo,
  getLoginInfo,
  getPhotoById,
  getUserList,
  getBadges,
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
  getAllInfoProfile
};
