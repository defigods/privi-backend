import express from 'express';
import priviCredit from '../blockchain/priviCredit';
//import { uploadToFirestoreBucket } from '../functions/firestore'
import {
  updateFirebase,
  createNotification,
  generateUniqueId,
  getRateOfChangeAsMap,
  filterTrending,
  isPaymentDay,
  follow,
  unfollow,
  addZerosToHistory,
} from '../functions/functions';
import notificationTypes from '../constants/notificationType';
import cron from 'node-cron';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import fields from '../firebase/fields';
import path from 'path';
import fs from 'fs';

const tasks = require('./tasksController');
const notificationsController = require('./notificationsController');
const chatController = require('./chatController');

require('dotenv').config();
// const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI';

///////////////////////////// POSTS //////////////////////////////

exports.initiatePriviCredit = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;

    const creator = body.Parameters.Creator;
    const creditName = body.Parameters.CreditName;
    const lendingToken = body.Parameters.LendingToken;
    const maxFunds = body.Parameters.MaxFunds;
    const interest = body.Parameters.Interest;
    const frequency = body.Parameters.Frequency;
    const p_incentive = body.Parameters.P_incentive;
    const p_premium = body.Parameters.P_premium;
    const dateExpiration = body.Parameters.DateExpiration;

    const trustScore = body.Requirements.TrustScore;
    const endorsementScore = body.Requirements.EndorsementScore;
    const collateralsAccepted = body.Requirements.CollateralsAccepted;
    const ccr = body.Requirements.CCR;

    const initialDeposit = body.Initialisation.InitialDeposit;
    const hash = body.Initialisation.Hash;
    const signature = body.Initialisation.Signature;

    if (!body.priviUser || !body.priviUser.id || body.priviUser.id != creator) {
      console.log('creator not matching jwt user');
      res.send({ success: false, message: 'creator not matching jwt user' });
      return;
    }

    const blockchainRes = await priviCredit.initiatePRIVIcredit(
      creator,
      creditName,
      lendingToken,
      maxFunds,
      interest,
      frequency,
      p_incentive,
      p_premium,
      dateExpiration,
      trustScore,
      endorsementScore,
      collateralsAccepted,
      ccr,
      initialDeposit,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updatedCreditInfo = output.UpdatedCreditInfo;
      const creditAddress = Object.keys(updatedCreditInfo)[0];

      // add some more data to firebase
      const description = body.Description;
      const admins = body.Admins; // string[]
      const insurers = body.Insurers; // string[]
      const userRoles = body.UserRoles; // {name, role, status}[]
      const hasPhoto = body.HasPhoto || false;

      const userSnap = await db.collection(collections.user).doc(creator).get();
      const userData: any = userSnap.data();

      const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, userData.firstName);
      await chatController.createDiscordRoom(
        discordChatJarrCreation.id,
        'Discussions',
        creator,
        userData.firstName,
        'general',
        false,
        []
      );
      await chatController.createDiscordRoom(
        discordChatJarrCreation.id,
        'Information',
        creator,
        userData.firstName,
        'announcements',
        false,
        []
      );

      db.collection(collections.priviCredits)
        .doc(creditAddress)
        .set(
          {
            Description: description,
            Admins: admins,
            Insurers: insurers,
            UserRoles: userRoles,
            Posts: [],
            JarrId: discordChatJarrCreation.id,
            HasPhoto: hasPhoto || false,
          },
          { merge: true }
        );

      // add transaction to credit doc
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.priviCredits)
          .doc(creditAddress)
          .collection(collections.priviCreditsTransactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }

      // update user levels
      let numCreatedPriviCredits = 0;
      const userLevelSnap = await db.collection(collections.levels).doc(creator).get();
      const data: any = userLevelSnap.data();
      if (data && data.NumCreatedPriviCredits) numCreatedPriviCredits = data.NumCreatedPriviCredits;
      numCreatedPriviCredits += 1;
      userLevelSnap.ref.set({ NumCreatedPriviCredits: numCreatedPriviCredits });

      // add zeros to graph
      const creditRef = db.collection(collections.priviCredits).doc(creditAddress);
      addZerosToHistory(creditRef.collection(collections.priviCreditAvailableHistory), 'available');
      addZerosToHistory(creditRef.collection(collections.priviCreditBorrowedHistory), 'borrowed');
      addZerosToHistory(creditRef.collection(collections.priviCreditDepositedHistory), 'deposited');
      addZerosToHistory(creditRef.collection(collections.priviCreditInterestHistory), 'interest');

      await notificationsController.addNotification({
        userId: creator,
        notification: {
          type: 33,
          typeItemId: 'token',
          itemId: creditAddress,
          follower: '',
          pod: '',
          comment: '',
          token: creditName,
          amount: '',
          onlyInformation: false,
          otherItemId: '',
        },
      });
      userData.followers.forEach(async (item, i) => {
        await notificationsController.addNotification({
          userId: item.user,
          notification: {
            type: 59,
            typeItemId: 'user',
            itemId: creator,
            follower: userData.firstName,
            pod: '',
            comment: '',
            token: creditName,
            amount: '',
            onlyInformation: false,
            otherItemId: creditAddress,
          },
        });
      });

      res.send({ success: true, data: { id: creditAddress } });
    } else {
      console.log('Error in controllers/priviCredit -> initiateCredit(): success = false', blockchainRes.message);
      res.send({ success: false, error: blockchainRes.message });
      return;
    }
  } catch (err) {
    console.log('Error in controllers/priviCredit -> initiateCredit(): ', err);
    res.send({ success: false, error: err });
    return;
  }
};

// adds +1 to views counter
exports.sumTotalViews = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let totalViews = body.TotalViews ? body.TotalViews : 0;

    const creditRef = db.collection(collections.priviCredits).doc(body.CreditAddress);

    await creditRef.update({
      TotalViews: totalViews + 1,
    });

    res.send({
      success: true,
      data: {
        TotalViews: totalViews + 1,
      },
    });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> sumTotalViews()', err);
    res.send({ success: false });
  }
};

exports.like = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creditAddress = body.CreditAddress;
    const userAddress = body.userAddress;
    const userSnap = await db.collection(collections.user).doc(userAddress).get();
    const creditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
    const creditData: any = creditSnap.data();
    const userData: any = userSnap.data();

    let userLikes = userData.Likes ?? [];
    let creditLikes = creditData.Likes ?? [];

    if (body.liked) {
      userLikes.push({
        date: Date.now(),
        type: 'credit',
        id: creditAddress,
      });
      creditLikes.push({
        date: Date.now(),
        userId: userAddress,
      });
    } else {
      userLikes = userLikes.filter((item) => item.id !== creditAddress);
      creditLikes = creditLikes.filter((item) => item.userId !== userAddress);
    }

    userSnap.ref.update({
      Likes: userLikes,
    });

    creditSnap.ref.update({
      Likes: creditLikes,
    });

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> like(): ', err);
    res.send({ success: false });
  }
};

// edit community
exports.editPriviCredit = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const creditRef = db.collection(collections.priviCredits).doc(body.CreditAddress);

    await creditRef.update({
      CreditName: body.CreditName,
      Description: body.Description,
      urlSlug: body.urlSlug,
    });

    res.send({
      success: true,
      data: {
        CreditName: body.CreditName,
        Description: body.Description,
        urlSlug: body.urlSlug,
      },
    });
  } catch (err) {
    console.log('Error in controllers/priviCreditController -> editCredit()', err);
    res.send({ success: false });
  }
};

exports.changeCreditPoolPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const creditPoolRef = db.collection(collections.priviCredits).doc(req.file.originalname);

      const creditPoolGet = await creditPoolRef.get();
      const creditPool: any = await creditPoolGet.data();

      await creditPoolRef.update({
        HasPhoto: true,
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/priviCreditController -> changePoolPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditController -> changePoolPhoto()', err);
    res.send({ success: false });
  }
};

exports.getCreditPoolPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let creditPoolId = req.params.creditId;
    console.log(creditPoolId);
    if (creditPoolId) {
      const directoryPath = path.join('uploads', 'creditPools');
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
      let raw = fs.createReadStream(path.join('uploads', 'creditPools', creditPoolId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/priviCreditController -> getCreditPoolPhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/priviCreditController -> getCreditPoolPhotoById()', err);
    res.send({ success: false });
  }
};

exports.depositFunds = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creditAddress = body.CreditAddress;
    const address = body.Address; // userId
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    if (address != body.priviUser.id) {
      console.log('UserId doesnt match with jwt');
      res.send({ sucess: false, message: 'UserId doesnt match with jwt' });
      return;
    }

    const blockchainRes = await priviCredit.depositFunds(creditAddress, address, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      // add transaction to credit doc
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.priviCredits)
          .doc(creditAddress)
          .collection(collections.priviCreditsTransactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }

      const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
      const priviCreditData: any = priviCreditSnap.data();
      const userSnap = await db.collection(collections.user).doc(address).get();
      const userData: any = userSnap.data();
      const userCreatorSnap = await db.collection(collections.user).doc(priviCreditData.Creator).get();
      const userCreatorData: any = userCreatorSnap.data();
      /*userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 0,
                        typeItemId: 'user',
                        itemId: address,
                        follower: '',
                        pod: '',
                        comment: '',
                        token: '',
                        amount: 0,
                        onlyInformation: false,
                        otherItemId: ''
                    }
                });
            });*/

      await notificationsController.addNotification({
        userId: address,
        notification: {
          type: 39,
          typeItemId: 'token',
          itemId: '',
          follower: '',
          pod: priviCreditData.CreditName,
          comment: '',
          token: '',
          amount: amount,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });
      await notificationsController.addNotification({
        userId: priviCreditData.Creator,
        notification: {
          type: 35,
          typeItemId: 'user',
          itemId: address,
          follower: userData.firstName,
          pod: priviCreditData.CreditName,
          comment: '',
          token: '',
          amount: amount,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });

      let investors: any[] = [];
      const creditPoolBorrowersSnap = await db
        .collection(collections.priviCredits)
        .doc(creditAddress)
        .collection(collections.priviCreditsBorrowing)
        .get();
      const creditPoolLendersSnap = await db
        .collection(collections.priviCredits)
        .doc(creditAddress)
        .collection(collections.priviCreditsLending)
        .get();
      if (!creditPoolBorrowersSnap.empty) {
        for (const doc of creditPoolBorrowersSnap.docs) {
          let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
          if (foundIndexInvestor === -1) {
            investors.push(doc.id);
          }
        }
      }

      if (!creditPoolLendersSnap.empty) {
        for (const doc of creditPoolLendersSnap.docs) {
          let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
          if (foundIndexInvestor === -1) {
            investors.push(doc.id);
          }
        }
      }

      console.log(investors);
      for (const investor of investors) {
        if (investor !== address) {
          await notificationsController.addNotification({
            userId: investor,
            notification: {
              type: 64,
              typeItemId: 'user',
              itemId: address,
              follower: userData.firstName,
              pod: priviCreditData.CreditName,
              comment: '',
              token: '',
              amount: amount,
              onlyInformation: false,
              otherItemId: creditAddress,
            },
          });
        }
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/priviCredit -> depositFunds(): success = false');
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/priviCredit -> depositFunds(): ', err);
    res.send({ success: false });
  }
};

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creditAddress = body.CreditAddress;
    const address = body.Address; // userId
    const amount = body.Amount;
    const collaterals = body.Collaterals;

    const hash = body.Hash;
    const signature = body.Signature;
    const rateOfChange = await getRateOfChangeAsMap();

    if (address != body.priviUser.id) {
      console.log('UserId doesnt match with jwt');
      res.send({ sucess: false, message: 'UserId doesnt match with jwt' });
      return;
    }
    const blockchainRes = await priviCredit.borrowFunds(
      creditAddress,
      address,
      amount,
      collaterals,
      rateOfChange,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // add transaction to credit doc
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.priviCredits)
          .doc(creditAddress)
          .collection(collections.priviCreditsTransactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }

      const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
      const priviCreditData: any = priviCreditSnap.data();
      const userSnap = await db.collection(collections.user).doc(address).get();
      const userData: any = userSnap.data();
      const userCreatorSnap = await db.collection(collections.user).doc(priviCreditData.Creator).get();
      const userCreatorData: any = userCreatorSnap.data();

      await notificationsController.addNotification({
        userId: address,
        notification: {
          type: 37,
          typeItemId: 'token',
          itemId: '',
          follower: '',
          pod: priviCreditData.CreditName,
          comment: '',
          token: '',
          amount: amount,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });
      await notificationsController.addNotification({
        userId: priviCreditData.Creator,
        notification: {
          type: 36,
          typeItemId: 'user',
          itemId: address,
          follower: userData.firstName,
          pod: priviCreditData.CreditName,
          comment: '',
          token: '',
          amount: amount,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });

      let investors: any[] = [];
      const creditPoolBorrowersSnap = await db
        .collection(collections.priviCredits)
        .doc(creditAddress)
        .collection(collections.priviCreditsBorrowing)
        .get();
      const creditPoolLendersSnap = await db
        .collection(collections.priviCredits)
        .doc(creditAddress)
        .collection(collections.priviCreditsLending)
        .get();
      if (!creditPoolBorrowersSnap.empty) {
        for (const doc of creditPoolBorrowersSnap.docs) {
          let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
          if (foundIndexInvestor === -1) {
            investors.push(doc.id);
          }
        }
      }

      if (!creditPoolLendersSnap.empty) {
        for (const doc of creditPoolLendersSnap.docs) {
          let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
          if (foundIndexInvestor === -1) {
            investors.push(doc.id);
          }
        }
      }

      console.log(investors);
      for (const investor of investors) {
        if (investor !== address) {
          await notificationsController.addNotification({
            userId: investor,
            notification: {
              type: 63,
              typeItemId: 'user',
              itemId: address,
              follower: userData.firstName,
              pod: priviCreditData.CreditName,
              comment: '',
              token: '',
              amount: amount,
              onlyInformation: false,
              otherItemId: creditAddress,
            },
          });
        }
      }
      const userBorrows = await priviCredit.getUserBorrowings(address, apiKey);
      if (userBorrows && userBorrows.success && userBorrows.output.length >= 3 && !userData.borrowedFromThree) {
        let task = await tasks.updateTask(address, 'Borrow from 3 Credit Pools ');
        await userSnap.ref.update({
          borrowedFromThree: true,
        });
        res.send({ success: true, task: task });
      }
      res.send({ success: true });
    } else {
      console.log('Error in controllers/priviCredit -> borrowFunds(): success = false', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/priviCredit -> borrowFunds(): ', err);
    res.send({ success: false });
  }
};

/**
 * Function called when a user request to follow a pod (FT/NFT), updating both user and firebase docs
 * @param req {userId, creditId}
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.followCredit = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.userId;
    const creditAddress = body.creditId;
    if (await follow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) {
      const userSnap = await db.collection(collections.user).doc(userAddress).get();
      const userData: any = userSnap.data();

      const priviCreditsRef = db.collection(collections.priviCredits).doc(creditAddress);
      const priviCreditsGet = await priviCreditsRef.get();
      const priviCredits: any = priviCreditsGet.data();

      const userCreatorSnap = await db.collection(collections.user).doc(priviCredits.Creator).get();
      const userCreatorData: any = userCreatorSnap.data();

      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 83,
          typeItemId: 'user',
          itemId: userAddress,
          follower: userData.firstName,
          pod: priviCredits.CreditName,
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });
      await notificationsController.addNotification({
        userId: priviCredits.Creator,
        notification: {
          type: 43,
          typeItemId: 'user',
          itemId: userAddress,
          follower: userData.firstName,
          pod: priviCredits.CreditName,
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });

      res.send({ success: true });
    } else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/priviCreditController -> followCredit(): ', err);
    res.send({ success: false, error: err });
  }
};

/**
 * Function called when a user request to unfollow a Privi Credit, updating both user and firebase docs
 * @param req {userId, podId, podType} podType in [FT, NFT]
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.unfollowCredit = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.userId;
    const creditAddress = body.creditId;
    if (await unfollow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) {
      const userSnap = await db.collection(collections.user).doc(userAddress).get();
      const userData: any = userSnap.data();

      const priviCreditsRef = db.collection(collections.priviCredits).doc(creditAddress);
      const priviCreditsGet = await priviCreditsRef.get();
      const priviCredits: any = priviCreditsGet.data();

      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 84,
          typeItemId: 'user',
          itemId: userAddress,
          follower: userData.firstName,
          pod: priviCredits.CreditName,
          comment: '',
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: creditAddress,
        },
      });

      res.send({ success: true });
    } else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/priviCreditController -> unFollowCredit(): ', err);
    res.send({ success: false });
  }
};

/**
 * Function to check pods data before creation.
 * @param req {podName}. podName: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: transaction array
 */
exports.checkCreditInfo = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    const creditSnap = await db.collection(collections.priviCredits).where('CreditName', '==', body.creditName).get();
    const creditCheckSize: number = creditSnap.size;
    let creditExists: boolean = creditCheckSize === 1 ? true : false;

    res.send({
      success: true,
      data: { creditExists: creditExists },
    });
  } catch (e) {
    return 'Error in controllers/creditController -> checkcreditInfo(): ' + e;
  }
};

///////////////////////////// GETS //////////////////////////////

// getter for the whole collection, Optimization TODO: only return the necessary data to FE in order to reduce transmission load
exports.getPriviCredits = async (req: express.Request, res: express.Response) => {
  try {
    const t1 = Date.now();
    const lastCredit: number = +req.params.pagination;
    const allCredits: any[] = [];

    let creditsSnap: any;
    if (lastCredit !== 0) {
      const lastId: any = req.params.lastId;
      const priviCreditRef = db.collection(collections.priviCredits).doc(lastId);
      const priviCreditGet = await priviCreditRef.get();
      const priviCredit: any = priviCreditGet.data();

      creditsSnap = await db
        .collection(collections.priviCredits)
        .orderBy('Date')
        .startAfter(priviCredit.Date)
        .limit(6)
        .get();
    } else {
      creditsSnap = await db.collection(collections.priviCredits).orderBy('Date').limit(6).get();
    }
    if (!creditsSnap.empty) {
      for (const doc of creditsSnap.docs) {
        const data = doc.data();
        data.id = doc.id;
        const popularity = 0.5;
        const lenders: any[] = [];
        const borrowers: any[] = [];
        const lendersSnap = await doc.ref.collection(collections.priviCreditsLending).get();
        const borrowersSnap = await doc.ref.collection(collections.priviCreditsBorrowing).get();
        lendersSnap.forEach((doc) => {
          lenders.push(doc.data());
        });
        borrowersSnap.forEach((doc) => {
          borrowers.push(doc.data());
        });
        allCredits.push({
          ...data,
          popularity: popularity,
          Lenders: lenders,
          Borrowers: borrowers,
        });
      }
    }
    // get the trending ones
    console.log(Date.now() - t1, 'ms');
    res.send({
      success: true,
      data: {
        allCredits: allCredits,
      },
    });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> getPriviCredits(): ', err);
    res.send({ success: false });
  }
};

exports.getTrendingPriviCredits = async (req: express.Request, res: express.Response) => {
  try {
    const trendingCredits: any[] = [];
    const creditsSnap = await db.collection(collections.trendingPriviCredit).get();
    for (let creditDoc of creditsSnap.docs) {
      let trending = creditDoc.data();

      const creditSnap = await db.collection(collections.priviCredits).doc(trending.id).get();
      const creditData: any = creditSnap.data();
      trendingCredits.push(creditData);
      console.log(trending.id, creditData);
    }
    res.send({ success: true, data: { trending: trendingCredits } });
  } catch (e) {
    console.log('Error in controllers/priviCredit -> getTrendingPriviCredits(): ', e);
    res.send({ success: false, message: e });
  }
};

exports.setTrendingPriviCredits = cron.schedule('0 0 * * *', async () => {
  try {
    const allCredits: any[] = [];
    const creditsSnap = await db.collection(collections.priviCredits).get();
    const popularity = 0.5;
    for (let credit of creditsSnap.docs) {
      const data = credit.data();
      const lenders: any[] = [];
      const borrowers: any[] = [];
      const lendersSnap = await credit.ref.collection(collections.priviCreditsLending).get();
      const borrowersSnap = await credit.ref.collection(collections.priviCreditsBorrowing).get();
      lendersSnap.forEach((doc) => {
        lenders.push(doc.data());
      });
      borrowersSnap.forEach((doc) => {
        borrowers.push(doc.data());
      });

      allCredits.push({
        ...data,
        id: credit.id,
        popularity: popularity,
        Lenders: lenders,
        Borrowers: borrowers,
      });
    }

    const trendingCredits = filterTrending(allCredits);
    let batch = db.batch();

    await db
      .collection(collections.trendingPriviCredit)
      .listDocuments()
      .then((val) => {
        val.map((val) => {
          batch.delete(val);
        });
      });
    await trendingCredits.forEach((doc: any) => {
      let docRef = db.collection(collections.trendingPriviCredit).doc();
      batch.set(docRef, { id: doc.id });
    });
    await batch.commit();
  } catch (err) {
    console.log('Error in controllers/priviCredit -> setTrendingPriviCredits(): ', err);
  }
});

// given an id, return the complete data of a certain privi credit
exports.getPriviCredit = async (req: express.Request, res: express.Response) => {
  try {
    let creditId = req.params.creditId;
    console.log('asdas', creditId);
    const creditSnap = await db.collection(collections.priviCredits).doc(creditId).get();
    if (creditSnap.exists) {
      // lenders and borrowers
      const lenders: any[] = [];
      const borrowers: any[] = [];
      const lendersSnap = await creditSnap.ref.collection(collections.priviCreditsLending).get();
      const borrowersSnap = await creditSnap.ref.collection(collections.priviCreditsBorrowing).get();
      lendersSnap.forEach((doc) => {
        lenders.push(doc.data());
      });
      borrowersSnap.forEach((doc) => {
        borrowers.push(doc.data());
      });
      // borrowers ponderated mean scores (trust, endorsement)
      let totalBorrowed = 0;
      let trustMean = 0;
      let endorsementMean = 0;
      const borrowerScores: any[] = [];
      for (var i = 0; i < borrowers.length; i++) {
        const borrower = borrowers[i];
        const id = borrower.BorrowerAddress;
        const userSnap = await db.collection(collections.user).doc(id).get();
        if (userSnap.exists) {
          const data: any = userSnap.data();
          borrowerScores.push({
            borrowed: borrower.Amount,
            endorsementScore: data.endorsementScore,
            trustScore: data.trustScore,
          });
          totalBorrowed += borrower.Amount;
        }
      }
      borrowerScores.forEach((borrower) => {
        trustMean += borrower.trustScore * (borrower.borrowed / totalBorrowed);
        endorsementMean += borrower.endorsementScore * (borrower.borrowed / totalBorrowed);
      });

      let creditData: any = creditSnap.data();

      creditData.PostsArray = [];
      if (creditData.Posts && creditData.Posts.length > 0) {
        for (const post of creditData.Posts) {
          const creditWallPostSnap = await db.collection(collections.creditWallPost).doc(post).get();
          const creditWallPostData: any = creditWallPostSnap.data();
          creditWallPostData.id = creditWallPostSnap.id;
          creditData.PostsArray.push(creditWallPostData);
        }
      }

      creditData.VotingsArray = [];
      if (creditData.Votings && creditData.Votings.length > 0) {
        for (const voting of creditData.Votings) {
          const votingSnap = await db.collection(collections.voting).doc(voting).get();
          const votingData: any = votingSnap.data();
          votingData.id = votingSnap.id;
          creditData.VotingsArray.push(votingData);
        }
      }

      // add url is not there //
      if (!creditData.hasOwnProperty('urlSlug') || creditData.urlSlug == '') {
        await db
          .collection(collections.priviCredits)
          .doc(creditId)
          .update({
            urlSlug: creditData.CreditName.split(' ').join(''),
          });
      }

      const data = {
        ...creditData,
        id: creditSnap.id,
        Lenders: lenders,
        Borrowers: borrowers,
        BorrowerTrustScore: trustMean,
        BorrowerEndorsementScore: endorsementMean,
      };
      res.send({ success: true, data: data });
    } else {
      console.log(
        'Error in controllers/priviCredit -> getPriviCredit(): cant find credit with the given id ',
        creditId
      );
      res.send({
        success: false,
        error: 'Error in controllers/priviCredit -> getPriviCredit(): cant find credit with the given id ',
      });
    }
  } catch (err) {
    console.log('Error in controllers/priviCredit -> getPriviCredit(): ', err);
    res.send({
      success: false,
      error: err,
    });
  }
};

// given the credit id, return the complete data of a certain privi credit
exports.getPriviTransactions = async (req: express.Request, res: express.Response) => {
  try {
    let creditId = req.params.creditId;
    const data: any[] = [];
    const creditTxnSnap = await db
      .collection(collections.priviCredits)
      .doc(creditId)
      .collection(collections.priviCreditsTransactions)
      .get();
    creditTxnSnap.forEach((doc) => {
      data.push(doc.data());
    });
    res.send({ success: true, data: data });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> getPriviTransactions(): ', err);
    res.send({ success: false });
  }
};

// given the credit id, return all the data necessary for the graph, that is the history of interest, deposited, borrowed and available.
exports.getHistories = async (req: express.Request, res: express.Response) => {
  try {
    let creditId = req.params.creditId;
    const interestHistory: any[] = [];
    const depositedHistory: any[] = [];
    const borrowedHistory: any[] = [];
    const availableHistory: any[] = [];

    const creditRef = db.collection(collections.priviCredits).doc(creditId);
    const interestSnap = await creditRef.collection(collections.priviCreditInterestHistory).get();
    const depositedSnap = await creditRef.collection(collections.priviCreditDepositedHistory).get();
    const borrowedSnap = await creditRef.collection(collections.priviCreditBorrowedHistory).get();
    const availableSnap = await creditRef.collection(collections.priviCreditAvailableHistory).get();
    interestSnap.forEach((doc) => {
      interestHistory.push(doc.data());
    });
    depositedSnap.forEach((doc) => {
      depositedHistory.push(doc.data());
    });
    borrowedSnap.forEach((doc) => {
      borrowedHistory.push(doc.data());
    });
    availableSnap.forEach((doc) => {
      availableHistory.push(doc.data());
    });
    res.send({
      success: true,
      data: {
        interestHistory: interestHistory,
        depositedHistory: depositedHistory,
        borrowedHistory: borrowedHistory,
        availableHistory: availableHistory,
      },
    });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> getHistories(): ', err);
    res.send({ success: false });
  }
};

/////////////////////////// CRON JOBS //////////////////////////////

// interest manager scheduled every day at 00:00
exports.payInterest = cron.schedule('* * * * *', async () => {
  try {
    //console.log('******** Privi Credit payInterest ********');
    const creditsSnap = await db.collection(collections.priviCredits).get();
    const credits = creditsSnap.docs;
    for (let i = 0; i < credits.length; i++) {
      const creditAddress = credits[i].id;
      const data = credits[i].data();
      if (data) {
        const frequency = data.Frequency;
        const paymentDay = 1; // fixed for now, TODO: allow user to select
        if (isPaymentDay(frequency, paymentDay)) {
          const date = Date.now();
          const txnId = generateUniqueId();
          const blockchainRes = await priviCredit.payInterest(creditAddress, date, txnId, apiKey);
          if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // notify user with the paid interest amount
            const transactions = blockchainRes.output.Transactions;
            let tid: string = '';
            let txnObj: any = null;
            let totalInterest = data.TotalInterest ?? 0;
            for ([tid, txnObj] of Object.entries(transactions)) {
              const from = txnObj.From;
              const to = txnObj.To;
              if (txnObj.Type && txnObj.Type == notificationTypes.priviCreditInterest && from && to == creditAddress) {
                totalInterest += txnObj.Amount;
                const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
                const priviCreditData: any = priviCreditSnap.data();
                await notificationsController.addNotification({
                  userId: from,
                  notification: {
                    type: 44,
                    typeItemId: 'user',
                    itemId: from,
                    follower: '',
                    pod: priviCreditData.CreditName,
                    comment: '',
                    token: '',
                    amount: totalInterest,
                    onlyInformation: false,
                    otherItemId: creditAddress,
                  },
                });
              }
            }
            // update total interest
            db.collection(collections.priviCredits).doc(creditAddress).update({ TotalInterest: totalInterest });
          } else {
            console.log(
              'Error in controllers/priviCredit -> payInterest(): success = false for credit ',
              creditAddress,
              blockchainRes.message
            );
          }
        }
      }
    }
  } catch (err) {
    console.log('Error in controllers/priviCredit -> payInterest()', err);
  }
});

// cron scheduled every day at 00:00, generates a doc for Deposited, Borrowed and Available history collections
exports.manageHistory = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('******** Privi Credit manageHistory ********');
    const creditsSnap = await db.collection(collections.priviCredits).get();
    creditsSnap.forEach((doc) => {
      const data: any = doc.data();
      const totalInterest = data.TotalInterest ?? 0;
      const totalDeposited = data.TotalDeposited ?? 0;
      const totalBorrowed = data.TotalBorrowed ?? 0;
      // add to interest history colection
      doc.ref.collection(collections.priviCreditInterestHistory).add({
        interest: totalInterest,
        date: Date.now(),
      });
      // add to deposited history colection
      doc.ref.collection(collections.priviCreditDepositedHistory).add({
        deposited: totalDeposited,
        date: Date.now(),
      });
      // add to borrowed history colection
      doc.ref.collection(collections.priviCreditBorrowedHistory).add({
        borrowed: totalBorrowed,
        date: Date.now(),
      });
      // add to available history colection
      doc.ref.collection(collections.priviCreditAvailableHistory).add({
        available: totalDeposited - totalBorrowed,
        date: Date.now(),
      });
    });
  } catch (err) {
    console.log('Error in controllers/priviCredit -> payInterest()', err);
  }
});
