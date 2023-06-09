import express from 'express';
import priviGovernance from '../blockchain/priviGovernance';
import { updateFirebase, addZerosToHistory } from '../functions/functions';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import cron from 'node-cron';
//import { uploadToFirestoreBucket } from '../functions/firestore'
const notificationsController = require('./notificationsController');

const apiKey = 'PRIVI'; //process.env.API_KEY;

// ----------------------------------- POST -------------------------------------------

// BUG? there are repeated doc of return history and staking amount history in firebase
exports.deleteDuplicatedPoints = async (req: express.Request, res: express.Response) => {
  try {
    const tokens = ["PRIVI", "pDATA", "pINS"]
    tokens.forEach(async (token) => {
      const returnHistorySnap = await db
        .collection(collections.stakingToken)
        .doc(token)
        .collection(collections.stakedHistory)
        .get();
      returnHistorySnap.forEach((doc) => {
        const data: any = doc.data();
        if (!data || data.amount == 0) doc.ref.delete();
      });
    });

    tokens.forEach(async (token) => {
      const returnHistorySnap = await db
        .collection(collections.stakingToken)
        .doc(token)
        .collection(collections.retunHistory)
        .get();
      returnHistorySnap.forEach((doc) => {
        const data: any = doc.data();
        if (!data || data.amount == 0) doc.ref.delete();
      });
    });
    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/stakingController -> deleteDuplicatedPoints(): ', err);
    res.send({ success: false });
  }
};

// user stakes in a token
exports.stakeToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.UserAddress;
    const token = body.Token;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await priviGovernance.stakeToken(userAddress, token, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      // updateFirebase(blockchainRes);

      // update stakedAmount and members of the token
      const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
      const data: any = tokenSnap.data();
      let newAmount = 0;
      let newMembers = {};
      if (data) {
        if (data.StakedAmount) newAmount = data.StakedAmount;
        if (data.Members) newMembers = data.Members;
      }
      newAmount += amount;
      if (!newMembers[userAddress]) newMembers[userAddress] = amount;
      else newMembers[userAddress] += amount;
      tokenSnap.ref.set({ StakedAmount: newAmount, Members: newMembers }, { merge: true });

      // update user first stake timestamp (if necessary)
      const userStakingSnap = await db.collection(collections.stakingDeposit).doc(token).collection(collections.userStakings).doc(userAddress).get();
      const userStakingData = userStakingSnap.data();
      let hasInitialDate = false;
      if (userStakingData) {
        if (userStakingData.InitialStakingDate) hasInitialDate = true;
      }
      if (!hasInitialDate) {
        userStakingSnap.ref.set({
          InitialStakingDate: Date.now()
        }, { merge: true });
      }


      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 49,
          typeItemId: 'user',
          itemId: userAddress,
          follower: '',
          pod: '',
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      res.send({ success: true });
    } else {
      console.log('Error in controllers/stakingController -> stakeToken(): success = false', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> stakeToken(): ', err);
    res.send({ success: false });
  }
};

// user unstakes in a token
exports.unstakeToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.UserAddress;
    const token = body.Token;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await priviGovernance.unstakeToken(
      userAddress,
      token,
      amount,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      // updateFirebase(blockchainRes);

      // update stakedAmount and members of the token
      const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
      const data: any = tokenSnap.data();
      let newAmount = 0;
      let newMembers = {};
      if (data) {
        if (data.StakedAmount) newAmount = data.StakedAmount;
        if (data.Members) newMembers = data.Members;
      }
      newAmount -= amount;
      if (newMembers[userAddress]) {
        newMembers[userAddress] -= amount;
        if (newMembers[userAddress] <= 0) delete newMembers[userAddress];
      }
      tokenSnap.ref.update({ StakedAmount: newAmount, Members: newMembers });

      // update user first stake timestamp (if necessary)
      const userStakingSnap = await db.collection(collections.stakingDeposit).doc(token).collection(collections.userStakings).doc(userAddress).get();
      const userStakingData: any = userStakingSnap.data();
      priviGovernance.getUserStaking(userAddress, token, apiKey).then((blockchainRes2) => {
        if (blockchainRes2 && blockchainRes2.success) {
          delete userStakingData.InitialStakingDate;
          userStakingSnap.ref.set(userStakingData);
        }
      });

      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 51,
          typeItemId: 'user',
          itemId: userAddress,
          follower: '',
          pod: '',
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });
      res.send({ success: true });
    } else {
      console.log('Error in controllers/stakingController -> unstakeToken(): success = false', blockchainRes.message);
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> unstakeToken(): ', err);
    res.send({ success: false });
  }
};

exports.verifyProfileStaking = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.UserAddress;
    const token = body.Token;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await priviGovernance.stakeToken(userAddress, token, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      // update stakedAmount and members of the token
      const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
      const data: any = tokenSnap.data();
      let newAmount = 0;
      let newMembers = {};
      if (data) {
        if (data.StakedAmount) newAmount = data.StakedAmount;
        if (data.Members) newMembers = data.Members;
      }
      newAmount += amount;
      if (!newMembers[userAddress]) newMembers[userAddress] = amount;
      else newMembers[userAddress] += amount;
      tokenSnap.ref.set({ StakedAmount: newAmount, Members: newMembers }, { merge: true });

      // add zeros for graph
      addZerosToHistory(tokenSnap.ref.collection(collections.retunHistory), 'return');
      addZerosToHistory(tokenSnap.ref.collection(collections.stakedHistory), 'amount');

      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 49,
          typeItemId: 'user',
          itemId: userAddress,
          follower: '',
          pod: '',
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      if (newMembers[userAddress] >= 15) {
        const userRef = db.collection(collections.user).doc(userAddress);
        await userRef.update({
          verified: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/stakingController -> verifyProfileStaking(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/stakingController -> verifyProfileStaking(): ', e);
    res.send({ success: false });
  }
};

exports.verifyPodStaking = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userAddress = body.UserAddress;
    const token = body.Token;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;

    const podAddress = body.PodAddress;
    const podType = body.PodType;

    console.log(body);

    const blockchainRes = await priviGovernance.stakeToken(userAddress, token, amount, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      // update stakedAmount and members of the token
      const tokenSnap = await db.collection(collections.stakingToken).doc(token).get();
      const data: any = tokenSnap.data();
      let newAmount = 0;
      let newMembers = {};
      if (data) {
        if (data.StakedAmount) newAmount = data.StakedAmount;
        if (data.Members) newMembers = data.Members;
      }
      newAmount += amount;
      if (!newMembers[userAddress]) newMembers[userAddress] = amount;
      else newMembers[userAddress] += amount;
      tokenSnap.ref.set({ StakedAmount: newAmount, Members: newMembers }, { merge: true });

      // add zeros for graph
      addZerosToHistory(tokenSnap.ref.collection(collections.retunHistory), 'return');
      addZerosToHistory(tokenSnap.ref.collection(collections.stakedHistory), 'amount');

      await notificationsController.addNotification({
        userId: userAddress,
        notification: {
          type: 49,
          typeItemId: 'user',
          itemId: userAddress,
          follower: '',
          pod: '',
          comment: '',
          token: token,
          amount: amount,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      if (podAddress && podAddress.length > 0) {
        if (podType === 'FT') {
          const ftPodRef = db.collection(collections.podsFT).doc(podAddress);
          await ftPodRef.update({
            Verified: true,
          });
        } else if (podType.includes('NFT')) {
          const nftPodRef = db.collection(collections.podsNFT).doc(podAddress);
          await nftPodRef.update({
            Verified: true,
          });
        }
      }

      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/stakingController -> verifyPodStaking(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/stakingController -> verifyPodStaking(): ', e);
    res.send({ success: false });
  }
};

// ----------------------------------- GET -------------------------------------------

// get the number of people that made some staking
exports.getTotalMembers = async (req: express.Request, res: express.Response) => {
  try {
    const retData: any[] = [];
    const token = req.params.token;
    const stakedHistorySnap = await db.collection(collections.stakingToken).doc(token).get();
    const data: any = stakedHistorySnap.data();
    const members = Object.keys(data.Members ?? {}).length;
    res.send({ success: true, data: members });
  } catch (err) {
    console.log('Error in controllers/stakingController -> getTotalMembers(): ', err);
    res.send({ success: false });
  }
};

// get return history of a token
exports.getReturnHistory = async (req: express.Request, res: express.Response) => {
  try {
    const retData: any[] = [];
    const token = req.params.token;
    const returnHistorySnap = await db
      .collection(collections.stakingToken)
      .doc(token)
      .collection(collections.retunHistory).orderBy('date', 'asc')
      .get();
    returnHistorySnap.forEach((doc) => {
      const data: any = doc.data();
      retData.push(data);
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/stakingController -> getReturnHistory(): ', err);
    res.send({ success: false });
  }
};


// get staked amount history of a token
exports.getStakedHistory = async (req: express.Request, res: express.Response) => {
  try {
    const retData: any[] = [];
    const token = req.params.token;
    const stakedHistorySnap = await db
      .collection(collections.stakingToken)
      .doc(token)
      .collection(collections.stakedHistory).orderBy('date', 'asc')
      .get();
    stakedHistorySnap.forEach((doc) => {
      const data: any = doc.data();
      retData.push(data);
    });
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/stakingController -> getStakedHistory(): ', err);
    res.send({ success: false });
  }
};

// return last day, week and month staked amount and timestamp of first stake
exports.getUserStakedInfo = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const token: any = req.query.token;
    const userId: any = req.query.userId;
    console.log(token, userId)
    if (!token || !userId) {
      res.send({ success: false });
      return;
    }
    const stakingDepositSnap = await db
      .collection(collections.stakingDeposit)
      .doc(token)
      .collection(collections.userStakings)
      .doc(userId)
      .get();
    const data1: any = stakingDepositSnap.data();

    // *********** Provisional *************
    const stakingTokenSnap = await db
      .collection(collections.stakingToken)
      .doc(token)
      .get();
    let stakedAmount = 0;
    const data2: any = stakingTokenSnap.data();
    if (data2 && data2.Members && data2.Members[userId]) stakedAmount = data2.Members[userId];

    if (data1) {
      const retData = {
        ...data1,
        StakedAmount: stakedAmount
      }
      res.send({ success: true, data: retData });
    } else {
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> getStakedAmounts(): ', err);
    res.send({ success: false });
  }
};

// ----------------------------------- CRON -------------------------------------------

// ---------------------- SAVE LAST STAKED AMOUNT --------------------
const listTokens = ['PRIVI', 'pDATA', 'pINS'];
// daily save each users staking amount
exports.saveStakingAmountEndOfDay = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Staking saveStakingAmountEndOfDay() cron job started *********');
    const userSnaps = await db.collection(collections.user).get();
    for (let doc of userSnaps.docs) {
      const uid = doc.id;
      for (let token of listTokens) {
        priviGovernance
          .getUserStaking(uid, token, apiKey)
          .then((blockchainRes) => {
            if (blockchainRes && blockchainRes.success) {
              const amount = blockchainRes.output;
              if (amount > 0) {
                db.collection(collections.stakingDeposit)
                  .doc(token)
                  .collection(collections.userStakings)
                  .doc(uid)
                  .set(
                    {
                      LastDayStakedAmount: amount,
                    },
                    { merge: true }
                  );
              }
            }
          });
      }
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> saveStakingAmountEndOfDay()', err);
  }
});

// weekly save each users staking amount
exports.saveStakingAmountEndOfWeek = cron.schedule('0 0 * * 0', async () => {
  try {
    console.log('********* Staking saveStakingAmountEndOfWeek() cron job started *********');
    const userSnaps = await db.collection(collections.user).get();
    for (let doc of userSnaps.docs) {
      const uid = doc.id;
      for (let token of listTokens) {
        priviGovernance.getUserStaking(uid, token, apiKey).then((blockchainRes) => {
          if (blockchainRes && blockchainRes.success) {
            const amount = blockchainRes.output;
            db.collection(collections.stakingDeposit).doc(token).collection(collections.userStakings).doc(uid).set(
              {
                LastWeekStakedAmount: amount,
              },
              { merge: true }
            );
          }
        });
      }
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> saveStakingAmountEndOfWeek()', err);
  }
});

// monthly save each users staking amount
exports.saveStakingAmountEndOfMonth = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('********* Staking saveStakingAmountEndOfMonth() cron job started *********');
    const userSnaps = await db.collection(collections.user).get();
    for (let doc of userSnaps.docs) {
      const uid = doc.id;
      for (let token of listTokens) {
        priviGovernance.getUserStaking(uid, token, apiKey).then((blockchainRes) => {
          if (blockchainRes && blockchainRes.success) {
            const amount = blockchainRes.output;
            db.collection(collections.stakingDeposit).doc(token).collection(collections.userStakings).doc(uid).set(
              {
                LastMonthStakedAmount: amount,
              },
              { merge: true }
            );
          }
        });
      }
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> saveStakingAmountEndOfMonth()', err);
  }
});
// --------------------------------------------------------

// daily save staked amount to history collection for every staking token
exports.manageStakedAmount = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Staking manageStakedAmount() cron job started *********');
    const stakingTokensSnap = await db.collection(collections.stakingToken).get();
    stakingTokensSnap.forEach((tokenDoc) => {
      const data: any = tokenDoc.data();
      const amount = data.StakedAmount ?? 0;
      const date = Date.now();
      tokenDoc.ref.collection(collections.stakedHistory).add({
        amount: amount,
        date: date,
      });
    });
  } catch (err) {
    console.log('Error in controllers/stakingController -> manageStakedAmount()', err);
  }
});

// // manage daily returns
exports.manageReturns = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('********* Staking manageReturns() cron job started *********');
    const tokensSnap = await db.collection(collections.stakingToken).get();
    const tokenDocs = tokensSnap.docs;
    for (let i = 0; i < tokenDocs.length; i++) {
      const token = tokenDocs[i].id;
      const date = Date.now() - 4 * 90061;
      const blockchainRes = await priviGovernance.payStakingReward(token, apiKey);
      if (blockchainRes && blockchainRes.success) {
        updateFirebase(blockchainRes);
        // calculate total return amount
        let returnAmount: any = 0;
        const txns = blockchainRes.output ? blockchainRes.output.Transactions : {};
        let tid: string = '';
        let tobj: any = null;
        for ([tid, tobj] of Object.entries(txns)) {
          // for each TX
          for (let j = 0; j < tobj.length; j++) {
            if (tobj[j].Type === 'Minting_Staking') {
              // for each object inside TX
              returnAmount += tobj[j].Amount;
            }
          }
        }
        tokenDocs[i].ref.collection(collections.retunHistory).add({
          return: returnAmount,
          date: date,
        });
      } else {
        console.log('Error in controllers/stakingController -> manageReturns()', blockchainRes.message);
      }
    }
  } catch (err) {
    console.log('Error in controllers/stakingController -> manageReturns()', err);
  }
});
