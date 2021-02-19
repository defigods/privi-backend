import express from 'express';
import social from '../blockchain/social';
import coinBalance from '../blockchain/coinBalance';
import {
  updateFirebase,
  addZerosToHistory,
  getMarketPrice,
  getSellTokenAmount,
  getBuyTokenAmount,
  getSellTokenAmountPod,
} from '../functions/functions';
import notificationTypes from '../constants/notificationType';
import collections from '../firebase/collections';
import { db } from '../firebase/firebase';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { blockchainCoinBalanceAPI } from '../blockchain/blockchainApi';
const notificationsController = require('./notificationsController');

const apiKey = process.env.API_KEY;

// ----------------------------------- POST -------------------------------------------

// user stakes in a token
exports.createSocialToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;
    const amm = body.AMM;
    const spreadDividend = body.SpreadDividend;
    const fundingToken = body.FundingToken;
    const tokenSymbol = body.TokenSymbol;
    const tokenName = body.TokenName;
    const dividendFreq = body.DividendFreq;
    const initialSupply = body.InitialSupply;
    const targetSupply = body.TargetSupply;
    const targetPrice = body.TargetPrice;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await social.createSocialToken(
      creator,
      amm,
      spreadDividend,
      fundingToken,
      tokenSymbol,
      tokenName,
      dividendFreq,
      initialSupply,
      targetSupply,
      targetPrice,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const updateSocialPools = output.UpdateSocialPools;
      const socialAddress = Object.keys(updateSocialPools)[0];

      // add more fields
      const description = body.Description;
      db.collection(collections.socialPools).doc(socialAddress).set({
        Description: description,
        HasPhoto: false,
      });

      await notificationsController.addNotification({
        userId: creator,
        notification: {
          type: 47,
          typeItemId: 'user',
          itemId: body.userId,
          follower: '',
          pod: '',
          comment: '',
          token: tokenSymbol,
          amount: 0,
          onlyInformation: false,
          otherItemId: '',
        },
      });

      res.send({ success: true, data: { id: socialAddress } });
    } else {
      console.log(
        'Error in controllers/socialController -> createSocialToken(): success = false.',
        blockchainRes.message
      );
      res.send({ success: false, error: blockchainRes.message });
    }
  } catch (err) {
    console.log('Error in controllers/socialController -> createSocialToken(): ', err);
    res.send({ success: false });
  }
};

// ----------------------------------- GETS -------------------------------------------
// get social pools
exports.getSocialTokens = async (req: express.Request, res: express.Response) => {
  try {
    const { address, userId } = req.query;
    const retData: any[] = [];
    // get those social tokens which the user is the creator or has some balance
    const blockchainRes = await coinBalance.getBalancesByType(address, collections.socialToken, 'PRIVI');
    if (blockchainRes && blockchainRes.success) {
      const balances = blockchainRes.output;
      const socialSnap = await db.collection(collections.socialPools).get();
      socialSnap.forEach((doc) => {
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
          retData.push({
            ...data,
            MarketPrice: marketPrice,
            UserBalance: balance,
          });
        }
      });
      res.send({ success: true, data: retData });
    } else {
      console.log(
        'Error in controllers/socialController -> getSocialPools(): blockchain = false ',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/socialController -> getSocialPools(): ', err);
    res.send({ success: false });
  }
};

// get selling price for API
exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const poolAddress = body.poolAddress;
    const amount = body.amount;
    const socialTokenPool = await db.collection(collections.socialPools).doc(poolAddress).get();
    const data: any = socialTokenPool.data();
    const retData = getBuyTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice);
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/socialController -> getBuyTokenAmount(): ', err);
    res.send({ success: false });
  }
};

// get funding tokens for API
exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const poolAddress = body.poolAddress;
    const amount = body.amount;
    const socialTokenPool = await db.collection(collections.socialPools).doc(poolAddress).get();
    const data: any = socialTokenPool.data();
    const retData = getSellTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice);
    res.send({ success: true, data: retData });
  } catch (err) {
    console.log('Error in controllers/socialController -> getSellTokenAmount(): ', err);
    res.send({ success: false });
  }
};

exports.editSocialToken = async (req: express.Request, res: express.Response) => {
    try {
      let body = req.body;
  
      const tokenRef = db.collection(collections.socialPools).doc(body.PoolAddress);
  
      await tokenRef.update({
        IsPrivate: body.IsPrivate
      });
  
      res.send({
        success: true,
        data: {
            IsPrivate: body.IsPrivate
        },
      });
    } catch (err) {
      console.log('Error in controllers/socialController -> editSocialToken()', err);
      res.send({ success: false });
    }
  };

exports.changeSocialTokenPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const socialPoolsRef = db.collection(collections.socialPools).doc(req.file.originalname);
      const socialPoolsGet = await socialPoolsRef.get();
      const socialPool: any = socialPoolsGet.data();

      if (socialPool.HasPhoto) {
        await socialPool.update({
          HasPhoto: true,
        });
      }

      let dir = 'uploads/socialTokens/' + 'photos-' + req.file.originalname;

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/socialController -> changeSocialTokenPhoto() ', "There's no file...");
      res.send({ success: false, error: "There's no file..." });
    }
  } catch (err) {
    console.log('Error in controllers/socialController -> changeSocialTokenPhoto()', err);
    res.send({ success: false, error: err });
  }
};

exports.getPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let socialId = req.params.socialId;
    console.log(socialId);
    if (socialId) {
      const directoryPath = path.join('uploads', 'socialTokens');
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
      let raw = fs.createReadStream(path.join('uploads', 'socialTokens', socialId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/socialController -> getPhotoById()', "There's no pod id...");
      res.send({ success: false, error: "There's no pod id..." });
    }
  } catch (err) {
    console.log('Error in controllers/socialController -> getPhotoById()', err);
    res.send({ success: false, error: err });
  }
};

exports.getTokenInfo = async (req: express.Request, res: express.Response) => {
  try {
    let tokenSymbol = req.params.tokenSymbol;
    console.log(tokenSymbol);

    const token = await db.collection(collections.tokens).doc(tokenSymbol).get();
    const data: any = token.data();

    res.send({ success: true, data: data });
  } catch (err) {
    console.log('Error in controllers/socialController -> getTokenInfo(): ', err);
    res.send({ success: false });
  }
};
