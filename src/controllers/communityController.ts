import express, { response } from 'express';
import {
  generateUniqueId,
  getAddresUidMap,
  updateFirebase,
  filterTrending,
  follow,
  unfollow,
  getRateOfChangeAsMap,
  getBuyTokenAmount,
  getSellTokenAmount,
  getUidAddressMap,
} from '../functions/functions';
import badge from '../blockchain/badge';
import community from '../blockchain/community';
import coinBalance from '../blockchain/coinBalance';
import notificationTypes from '../constants/notificationType';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import fields from '../firebase/fields';
import cron from 'node-cron';
import { clearLine } from 'readline';
import path from 'path';
import fs from 'fs';
import { sendNewCommunityUsersEmail } from '../email_templates/emailTemplates';
import { ChainId, Token, WETH, Fetcher, Route } from '@uniswap/sdk';
import { user } from 'firebase-functions/lib/providers/auth';

const chatController = require('./chatController');
const notificationsController = require('./notificationsController');
const communityWallController = require('./communityWallController');
const tasks = require('./tasksController');

require('dotenv').config();
// const apiKey = process.env.API_KEY;
const apiKey = 'PRIVI';

///////////////////////////// POST ///////////////////////////////
module.exports.transfer = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const userId = body.userId;
    const from = body.From;
    const to = body.To; // could be email or uid
    const amount = body.Amount;
    const token = body.Token;
    const type = body.Type;
    const hash = body.Hash;
    const signature = body.Signature;
    // check that fromUid is same as user in jwt
    if (!req.body.priviUser.id || req.body.priviUser.id != userId) {
      console.log('error: jwt user is not the same as fromUid ban?');
      res.send({
        success: false,
        message: 'jwt user is not the same as fromUid',
      });
      return;
    }
    const blockchainRes = await coinBalance.transfer(from, to, amount, token, type, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      const output = blockchainRes.output;
      const transcations = output.Transactions;
      let tid: string = '';
      let txnArray: any = undefined;
      for ([tid, txnArray] of Object.entries(transcations)) {
        db.collection(collections.community)
          .doc(to)
          .collection(collections.communityTransactions)
          .doc(tid)
          .set({ Transactions: txnArray });
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> transfer(), blockchain returned false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> transfer()', err);
    res.send({ success: false });
  }
};

exports.setComunityBirdgeRegistered = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const comunityAddress = body.address;
    db.collection(collections.community).doc(comunityAddress).update({ registeredOnBridge: true });
    res.send({ success: true });
  } catch (e) {
    console.log('Error in controllers/setComunityBirdgeRegistered -> setComunityBirdgeRegistered(): ', e);
    res.send({ success: false });
  }
};

exports.createCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const creator = body.Creator;

    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await community.createCommunity(creator, hash, signature, apiKey);
    console.log(JSON.stringify(blockchainRes, null, 4))
    if (blockchainRes && blockchainRes.success) {
      await updateFirebase(blockchainRes);
      const updateCommunities = blockchainRes.output.UpdateCommunities;
      const [communityAddress, communityObj]: [any, any] = Object.entries(updateCommunities)[0];
      // add other common infos
      const name = body.Name;
      const description = body.Description;
      const mainHashtag = body.MainHashtag;
      const hashtags = body.Hashtags;
      const privacy = body.Privacy;
      const hasPhoto = body.HasPhoto;
      const twitterId = body.TwitterId;
      const openAdvertising = body.OpenAdvertising;
      const EthereumContractAddress = body.EthereumContractAddress;
      const EthChainId = body.EthChainId;
      const TokenDecimals = body.TokenDecimals;
      const registeredOnBridge = false;
      const registeredOnSwapManager = false;

      const paymentsAllowed = body.PaymentsAllowed;

      const collateralQuantity = Number(body.CollateralQuantity);
      const collateralOption = body.CollateralOption;
      const collateralToken = body.CollateralToken;

      const ruleBased = body.RuleBased !== undefined ? body.RuleBased : true;

      const requiredTokens = body.RequiredTokens;

      const minUserLevel = body.MinimumUserLevel == 'Not required' ? 0 : body.MinimumUserLevel;
      const minEndorsementScore =
        body.MinimumEndorsementScore == 'Not required' ? 0 : body.MinimumEndorsementScore / 100;
      const minTrustScore = body.MinimumTrustScore == 'Not required' ? 0 : body.MinimumTrustScore / 100;

      const levels = body.Levels; // list of {name, description}

      const blogsEnabled = body.BlogsEnabled;
      const blogs = body.Blogs;
      const memberDirectoriesEnabled = body.MemberDirectoriesEnabled;
      const memberDirectories = body.MemberDirectories;
      const projectsEnabled = body.ProjectsEnabled;
      const projects = body.Projects;
      const appsEnabled = body.AppsEnabled;
      const apps = body.Apps;

      const admins = body.Admins;
      // const emailUidMap = await getEmailUidMap();
      const userRolesObj: any[] = body.UserRoles ?? {};
      const userRolesArray = Object.values(userRolesObj);
      // userRolesArray.forEach((elem) => {
      //     const uid = emailUidMap[elem.email];
      //     if (uid) userRolesObj[uid] = elem;
      // });

      const invitedUsers = body.InvitationUsers; // list of string (email), TODO: send some kind of notification to these users

      const userRef = db.collection(collections.user).doc(creator);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if (admins && admins.length > 0) {
        for (const [index, admin] of admins.entries()) {
          const user = await db.collection(collections.user).where('email', '==', admin.name).get();
          if (user.empty) {
            admins[index].userId = null;
          } else {
            for (const doc of user.docs) {
              admins[index].userId = doc.id;
            }
          }
        }
      }
      const userRolkeys = Object.keys(userRolesObj);
      for (const [index, userRole] of userRolkeys.entries()) {
        const user = await db.collection(collections.user).where('email', '==', userRole).get();
        if (user.empty) {
          userRolesArray[index].userId = null;
        } else {
          for (const doc of user.docs) {
            userRolesArray[index].userId = doc.id;
          }
        }
      }

      const discordChatCreation: any = await chatController.createDiscordChat(creator, user.firstName);
      /*await chatController.createDiscordRoom(discordChatCreation.id, 'Discussions', creator, user.firstName, 'general', false, []);
      await chatController.createDiscordRoom(discordChatCreation.id, 'Information', creator, user.firstName, 'announcements', false, []);*/

      const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, user.firstName);
      await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Discussions', creator, user.firstName, 'general', false, []);
      await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Information', creator, user.firstName, 'announcements', false, []);

      db.collection(collections.community)
        .doc(communityAddress)
        .update({
          HasPhoto: hasPhoto || false,
          Name: name || '',
          Description: description || '',
          MainHashtag: mainHashtag || '',
          Hashtags: hashtags || [],
          Privacy: privacy,
          OpenAdvertising: openAdvertising || false,
          PaymentsAllowed: paymentsAllowed || false,
          DiscordId: discordChatCreation.id || '',
          JarrId: discordChatJarrCreation.id || '',
          TwitterId: twitterId || '',
          Date: new Date().getTime(),

          EthereumContractAddress: EthereumContractAddress || '',
          EthChainId: EthChainId || '',
          TokenDecimals: TokenDecimals || 18,
          registeredOnBridge: registeredOnBridge,
          registeredOnSwapManager: registeredOnSwapManager,

          CollateralQuantity: collateralQuantity || 0,
          CollateralOption: collateralOption || '',
          CollateralToken: collateralToken || '',

          RuleBased: ruleBased,

          RequiredTokens: requiredTokens || {},

          MinimumUserLevel: minUserLevel || 0,
          MinimumEndorsementScore: minEndorsementScore || 0,
          MinimumTrustScore: minTrustScore || 0,

          Levels: levels,

          BlogsEnabled: blogsEnabled,
          Blogs: blogs,
          MemberDirectoriesEnabled: memberDirectoriesEnabled,
          MemberDirectories: memberDirectories,
          ProjectsEnabled: projectsEnabled,
          Projects: projects,
          AppsEnabled: appsEnabled,
          Apps: apps,

          UserRoles: userRolesObj || {},
          Admins: admins || [],
          InvitationUsers: invitedUsers || [],
          Posts: [],
          Votings: [],

          MembersReached: false,
        });

      // send invitation email to admins, roles and users here
      let usersData = {
        admins: admins,
        roles: userRolesArray,
        users: invitedUsers,
      };

      let communityData = {
        communityName: name,
        communityAddress: communityAddress,
      };

      if ((admins && admins.length > 0) ||
        (userRolesArray && userRolesArray.length > 0) ||
        (invitedUsers && invitedUsers.length > 0)) {
        let invitationEmails = await sendNewCommunityUsersEmail(usersData, communityData);
        if (!invitationEmails) {
          console.log('failed to send invitation e-mails.');
        }
      }
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          if (admin.userId) {
            await notificationsController.addNotification({
              userId: userGet.id,
              notification: {
                type: 86,
                typeItemId: 'user',
                itemId: creator,
                follower: user.firstName,
                pod: name, // community name
                comment: 'Admin',
                token: '',
                amount: 0,
                onlyInformation: false,
                otherItemId: communityAddress,
              },
            });
          } else {
            let id = generateUniqueId();

            await db.runTransaction(async (transaction) => {
              transaction.set(db.collection(collections.pendingNotifications).doc(id), {
                email: admin.name,
                notification: {
                  type: 86,
                  typeItemId: 'user',
                  itemId: creator,
                  follower: user.firstName,
                  pod: name, // community name
                  comment: 'Admin',
                  token: '',
                  amount: 0,
                  onlyInformation: false,
                  otherItemId: communityAddress,
                },
              });
            });
          }
        }
      }

      if (userRolesArray && userRolesArray.length > 0) {
        for (const userRole of userRolesArray) {
          if (userRole.userId) {
            await notificationsController.addNotification({
              userId: userGet.id,
              notification: {
                type: 86,
                typeItemId: 'user',
                itemId: creator,
                follower: user.firstName,
                pod: name, // community name
                comment: userRole.role,
                token: '',
                amount: 0,
                onlyInformation: false,
                otherItemId: communityAddress,
              },
            });
          } else {
            let id = generateUniqueId();
            await db.runTransaction(async (transaction) => {
              transaction.set(db.collection(collections.pendingNotifications).doc(id), {
                email: userRole.name,
                notification: {
                  type: 86,
                  typeItemId: 'user',
                  itemId: creator,
                  follower: user.firstName,
                  pod: name, // community name
                  comment: userRole.role,
                  token: '',
                  amount: 0,
                  onlyInformation: false,
                  otherItemId: communityAddress,
                },
              });
            });
          }
        }
      }

      res.send({
        success: true,
        data: {
          communityAddress: communityAddress,
        },
      });
    } else {
      console.log(
        'Error in controllers/communityController -> createCommunity(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> createCommunity(): ', err);
    res.send({ success: false });
  }
};

async function getPriceFromUniswap(communityTokenAddress, fundingTokenPrice) {
  try {
    const communityToken = await Fetcher.fetchTokenData(ChainId.MAINNET, communityTokenAddress);
    const fundingToken = await Fetcher.fetchTokenData(ChainId.MAINNET, fundingTokenPrice);
    const pairData = await Fetcher.fetchPairData(fundingToken, communityToken);
    const route = new Route([pairData], communityToken);
    let targetPrice = route.midPrice.toSignificant(6);
    return { targetPrice: targetPrice };
  } catch (e) {
    console.log('ERROR CALLING getPriceFromUniswap: ', e);
    return e;
  }
}

exports.createCommunityToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const data: any = {
      Creator: body.Creator,
      CommunityAddress: body.CommunityAddress,
      FromAddress: body.FromAddress,
      FundingTokenAddress: body.FundingTokenAddress,
      CommunityTokenAddress: body.CommunityTokenAddress,
      FundingToken: body.FundingToken,
      TokenType: body.TokenType ?? 'ETHEREUM',
      TokenSymbol: body.TokenSymbol,
      TokenName: body.TokenName,
      AMM: body.AMM,
      LockUpDate: body.LockUpDate,
      InitialSupply: parseFloat(body.InitialSupply),
      TargetPrice: body.TargetPrice,
      TargetSupply: body.TargetSupply,
      Frequency: body.Frequency,
      SpreadDividend: body.SpreadDividend,

      EthereumContractAddress: body.EthereumContractAddress,
      TokenDecimals: parseInt(body.TokenDecimals),
      EthChainId: body.EthChainId,

      Hash: body.Hash,
      Signature: body.Signature,
      Caller: apiKey,
    };
    // if (
    //   body.TokenType &&
    //   body.TokenType == "Ethereum" &&
    //   body.FundingTokenAddress &&
    //   body.CommunityTokenAddress
    // ) {
    //   let resp = await getPriceFromUniswap(
    //     body.communityTokenAddress,
    //     body.FundingTokenAddress
    //   );
    //   if (resp.targetPrice) {
    //     data.TargetPrice = resp.targetPrice;
    //   } else {
    //     console.log(
    //       "Error in controllers/communityController -> createCommunityToken(): ",
    //       resp
    //     );
    //     res.send({ success: false });
    //   }
    // }
    if (body.VestingTaxation && body.VestingTaxation === true) {
      data.VestingTime = body.VestingPeriod;
      data.ImmediateAllocationPct = body.ImmediateAllocation;
      data.VestedAllocationPct = body.VestedAllocation;
    }
    const blockchainRes = await community.createCommunityToken(data);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // update comunity data
      if (data.TokenType && data.TokenType === 'ETHEREUM') {
        db.collection(collections.community)
          .doc(data.CommunityAddress)
          .update({ EthereumContractAddress: data.EthereumContractAddress, EthChainId: data.EthChainId });
      }
      // add txn to community
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.community)
          .doc(body.CommunityAddress)
          .collection(collections.communityTransactions)
          .doc(tid)
          .set({ Transactions: txnArray }); // add all because some of them dont have From or To (tokens are burned)
      }

      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> createCommunityToken(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> createCommunityToken(): ', e);
    res.send({ success: false });
  }
};


exports.setVestingConditions = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.CommunityAddress
    const vestingTime = body.VestingTime;
    const immediateAllocationPct = body.ImmediateAllocationPct;
    const vestedAllocationPct = body.VestedAllocationPct;
    const hash = body.Hash;
    const signature = body.Signature;
    const blockchainRes = await community.setVestingConditions(communityAddress, vestingTime, immediateAllocationPct, vestedAllocationPct, hash, signature, apiKey);
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // add txn to community
      const output = blockchainRes.output;
      const transactions = output.Transactions ?? {};
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.community)
          .doc(body.CommunityAddress)
          .collection(collections.communityTransactions)
          .doc(tid)
          .set({ Transactions: txnArray }); // add all because some of them dont have From or To (tokens are burned)
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> setVestingConditions(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> setVestingConditions(): ', e);
    res.send({ success: false });
  }
};

exports.sellCommunityToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const investor = body.Investor;
    const communityAddress = body.CommunityAddress;
    const tokenType = body.TokenType;
    const amount = body.Amount;
    const hash = body.Hash;
    const signature = body.Signature;
    let price;
    if (tokenType && tokenType == 'Ethereum') {
      const commSnap = await db.collection(collections.community).doc(communityAddress).get();
      const data: any = commSnap.data();

      let resp = await getPriceFromUniswap(data.CommunityTokenAddress, data.FundingTokenAddress);
      if (resp.targetPrice) {
        price = resp.targetPrice;
      } else {
        console.log('Error in controllers/communityController -> createCommunityToken(): ', resp);
        res.send({ success: false });
      }
    }
    const blockchainRes = await community.sellCommunityToken(
      investor,
      communityAddress,
      amount,
      price,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);

      // add txn to community
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let tid = '';
      let txnArray: any = null;
      for ([tid, txnArray] of Object.entries(transactions)) {
        db.collection(collections.community)
          .doc(communityAddress)
          .collection(collections.communityTransactions)
          .doc(tid)
          .set({ Transactions: txnArray }); // add all because some of them dont have From or To (tokens are burned)
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> sellCommunityToken(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> sellCommunityToken(): ', err);
    res.send({ success: false });
  }
};

exports.buyCommunityToken = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const investor = body.Investor;
    const communityAddress = body.CommunityAddress;
    const amount = body.Amount;
    const tokenType = body.TokenType;

    let price;
    if (tokenType && tokenType == 'Ethereum') {
      const commSnap = await db.collection(collections.community).doc(communityAddress).get();
      const data: any = commSnap.data();

      let resp = await getPriceFromUniswap(data.CommunityTokenAddress, data.FundingTokenAddress);
      if (resp.targetPrice) {
        price = resp.targetPrice;
      } else {
        console.log('Error in controllers/communityController -> createCommunityToken(): ', resp);
        res.send({ success: false });
      }
    }
    const hash = body.Hash;
    const signature = body.Signature;
    const externalPrice = 0;

    const blockchainRes = await community.buyCommunityToken(
      investor,
      communityAddress,
      amount,
      externalPrice,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      // add txn to community
      const commSnap = await db.collection(collections.community).doc(communityAddress).get();
      const data: any = commSnap.data();
      const ammAddr = data.AMMAddress;
      const output = blockchainRes.output;
      const transactions = output.Transactions;
      let key = '';
      let obj: any = null;
      for ([key, obj] of Object.entries(transactions)) {
        if (obj.From == ammAddr || obj.To == ammAddr) {
          commSnap.ref.collection(collections.communityTransactions).add(obj);
        }
      }
      let userTokens = await coinBalance.getTokensOfAddress(body.Investor);
      if (userTokens && userTokens.success) {
        const output = userTokens.output;
        if (userTokens['COMMUNITY'].length >= 3) {
          const userRef = db.collection(collections.user).doc(investor.Investor);
          const userGet = await userRef.get();
          const user: any = userGet.data();
          if (!user.Own3CommunityTokens) {
            let task = await tasks.updateTask(body.Investor, 'Own 3 Community Tokens with test tokens ');
            await userRef.update({ Own3CommunityTokens: true });
            res.send({ success: true, task: task });
          }
        }
      }
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> buyCommunityToken(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> buyCommunityToken(): ', err);
    res.send({ success: false });
  }
};

exports.stakeCommunityFunds = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const lpAddress = body.LPAddress;
    const communityAddress = body.CommunityAddress;
    const amount = body.Amount;
    const stakingToken = body.StakingToken;
    const hash = body.Hash;
    const signature = body.Signature;

    const blockchainRes = await community.stakeCommunityFunds(
      lpAddress,
      communityAddress,
      amount,
      stakingToken,
      hash,
      signature,
      apiKey
    );
    if (blockchainRes && blockchainRes.success) {
      updateFirebase(blockchainRes);
      res.send({ success: true });
    } else {
      console.log(
        'Error in controllers/communityController -> stakeCommunityFunds(): success = false',
        blockchainRes.message
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> stakeCommunityFunds(): ', err);
    res.send({ success: false });
  }
};

exports.follow = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const userAddress = body.userAddress;
    if (await follow(userAddress, communityAddress, collections.community, 'FollowingCommunities'))
      res.send({ success: true });
    else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/communityController -> follow(): ', err);
    res.send({ success: false });
  }
};

exports.unfollow = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const userAddress = body.userAddress;
    if (await unfollow(userAddress, communityAddress, collections.community, 'FollowingCommunities'))
      res.send({ success: true });
    else res.send({ success: false });
  } catch (err) {
    console.log('Error in controllers/communityController -> unfollow(): ', err);
    res.send({ success: false });
  }
};

exports.join = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const userAddress = body.userAddress;
    // update user
    const userSnap = await db.collection(collections.user).doc(userAddress).get();
    const userData: any = userSnap.data();

    let joinedCommuntities = userData[fields.joinedCommunities] ?? [];
    let jcLength = joinedCommuntities.length;
    joinedCommuntities.push(communityAddress);
    const userUpdateObj = {};
    userUpdateObj[fields.joinedCommunities] = joinedCommuntities;
    userSnap.ref.update(userUpdateObj);

    // update prod
    const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
    const commData: any = communitySnap.data();
    const joinedUsers = commData[fields.joinedUsers] ?? [];
    joinedUsers.push({
      date: Date.now(),
      id: userAddress,
    });
    const commUpdateObj = {};
    commUpdateObj[fields.joinedUsers] = joinedUsers;
    communitySnap.ref.update(commUpdateObj);

    //update discord chat
    const discordRoomSnap = await db
      .collection(collections.discordChat)
      .doc(commData.DiscordId)
      .collection(collections.discordRoom)
      .get();
    if (!discordRoomSnap.empty) {
      for (const doc of discordRoomSnap.docs) {
        let data = doc.data();
        if (!data.private) {
          chatController.addUserToRoom(commData.DiscordId, doc.id, userSnap.id);
        }
      }
    }
    if (joinedUsers.length >= 15 && !commData.MembersReached) {
      await communitySnap.ref.update({
        MembersReached: true,
      });
      let task = await tasks.updateTask(commData.Creator, 'Own a community with 15 or more members');
      res.send({ success: true, task: task });
    }

    if (jcLength == 2) {
      let task = await tasks.updateTask(userAddress, 'Join 3 Communities');
      res.send({ success: true, task: task });
    }

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/communityController -> join(): ', err);
    res.send({ success: false });
  }
};

exports.leave = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const userAddress = body.userAddress;
    // update user
    const userSnap = await db.collection(collections.user).doc(userAddress).get();
    const userData: any = userSnap.data();

    let joinedCommuntities = userData[fields.joinedCommunities] ?? [];
    joinedCommuntities = joinedCommuntities.filter((val, index, arr) => {
      return val !== communityAddress;
    });
    const userUpdateObj = {};
    userUpdateObj[fields.joinedCommunities] = joinedCommuntities;
    userSnap.ref.update(userUpdateObj);

    // update prod
    const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
    const commData: any = communitySnap.data();
    let joinedUsers = commData[fields.joinedUsers] ?? [];
    joinedUsers = joinedUsers.filter((val, index, arr) => {
      return val.id && val.id !== userAddress;
    });
    const commUpdateObj = {};
    commUpdateObj[fields.joinedUsers] = joinedUsers;
    communitySnap.ref.update(commUpdateObj);

    //update discord chat
    const discordRoomSnap = await db
      .collection(collections.discordChat)
      .doc(commData.DiscordId)
      .collection(collections.discordRoom)
      .get();
    if (!discordRoomSnap.empty) {
      for (const doc of discordRoomSnap.docs) {
        let data = doc.data();
        if (!data.private) {
          chatController.removeUserToRoom(commData.DiscordId, doc.id, userSnap.id);
        }
      }
    }

    res.send({ success: true });
  } catch (err) {
    console.log('Error in controllers/communityController -> leave(): ', err);
    res.send({ success: false });
  }
};

// get funding tokens for API (Buy)
exports.getBuyTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const amount = body.amount;
    const commSnap = await db.collection(collections.community).doc(communityAddress).get();
    const data: any = commSnap.data();
    const fundingTokens = getBuyTokenAmount(
      data.AMM,
      data.SupplyReleased,
      data.InitialSupply,
      amount,
      data.TargetPrice,
      data.TargetSupply
    );
    res.send({ success: true, data: fundingTokens });
  } catch (err) {
    console.log('Error in controllers/communityController -> getCommunityTokenAmount(): ', err);
    res.send({ success: false });
  }
};

// get investing tokens for API (Selll)
exports.getSellTokenAmount = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    const communityAddress = body.communityAddress;
    const amount = body.amount;
    const commSnap = await db.collection(collections.community).doc(communityAddress).get();
    const data: any = commSnap.data();
    const communityTokens = getSellTokenAmount(
      data.AMM,
      data.SupplyReleased,
      data.InitialSupply,
      amount,
      data.SpreadDividend,
      data.TargetPrice,
      data.TargetSupply
    );
    res.send({ success: true, data: communityTokens });
  } catch (err) {
    console.log('Error in controllers/communityController -> getFundingTokenAmount(): ', err);
    res.send({ success: false });
  }
};

exports.changeCommunityPhoto = async (req: express.Request, res: express.Response) => {
  try {
    if (req.file) {
      const communityRef = db.collection(collections.community).doc(req.file.originalname);

      const communityGet = await communityRef.get();
      const community: any = await communityGet.data();

      if (community.HasPhoto !== undefined) {
        await communityRef.update({
          HasPhoto: true,
        });
      }

      res.send({ success: true });
    } else {
      console.log('Error in controllers/communityController -> changeCommunityPhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> changeCommunityPhoto()', err);
    res.send({ success: false });
  }
};

/////////////////////////// GETS /////////////////////////////

// get community transactions
exports.getCommunityTransactions = async (req: express.Request, res: express.Response) => {
  try {
    const params = req.query;
    const communityAddress: any = params.communityAddress;
    const retData: any = [];
    const transactionsSnap = await db
      .collection(collections.community)
      .doc(communityAddress)
      .collection(collections.communityTransactions)
      .get();
    transactionsSnap.forEach((doc) => {
      const txns = doc.data().Transactions ?? [];
      txns.forEach((txn) => {
        if (txn.Type == 'transfer') {
          if (txn.From == communityAddress || txn.To == communityAddress) {
            retData.push({
              ...txn,
              EventType: txn.From == communityAddress ? 'Send' : 'Receive',
            });
          }
        }
      });
    });
    console.log(retData);
    res.send({ success: true, data: retData });
  } catch (e) {
    res.send({ success: false });
    return 'Error in controllers/communitiesControllers -> getUserPaymentData()' + e;
  }
};

// get community token balance needed for Treasury tab
exports.getUserPaymentData = async (req: express.Request, res: express.Response) => {
  try {
    const params = req.query;
    const communityAddress: any = params.communityAddress;
    const userId: any = params.userId;
    const userAddress: any = params.userAddress;
    const communityToken: any = params.communityToken;

    const addressUidMap = await getAddresUidMap();
    const blockchainRes = await coinBalance.balanceOf(userAddress, communityToken);
    const output = blockchainRes.output;
    const balance = output ? output.Amount ?? 0 : 0;
    let paymentsReceived = 0;
    let paymentsMade = 0;
    const paymentHistory: any[] = [];
    const transactionsSnap = await db
      .collection(collections.community)
      .doc(communityAddress)
      .collection(collections.communityTransactions)
      .get();
    transactionsSnap.forEach((doc) => {
      const txns = doc.data().Transactions ?? [];
      txns.forEach((txn) => {
        if (txn.Type == 'transfer') {
          if (txn.From == userAddress) paymentsMade++;
          else if (txn.To == userAddress) paymentsReceived++;
          paymentHistory.push({
            Quantity: txn.Amount,
            Token: txn.Token,
            Sender: addressUidMap[txn.From] ?? txn.From,
            Receiver: addressUidMap[txn.To] ?? txn.To,
          });
        }
      });
    });
    const retData = {
      UserCommunityBalanceData: {
        Balance: balance,
        PaymentsReceived: paymentsReceived,
        PaymentsMade: paymentsMade,
      },
      PaymentHistory: paymentHistory,
    };
    res.send({ success: true, data: retData });
  } catch (e) {
    return 'Error in controllers/communitiesControllers -> getUserPaymentData()' + e;
    res.send({ success: false });
  }
};

//get community photo
exports.getCommunityPhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let communityId = req.params.communityId;
    console.log(communityId);
    if (communityId) {
      const directoryPath = path.join('uploads', 'community');
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
      let raw = fs.createReadStream(path.join('uploads', 'community', communityId + '.png'));
      raw.on('error', function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log('Error in controllers/communityController -> getCommunityPhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> getCommunityPhotoById()', err);
    res.send({ success: false });
  }
};

// get members data needed for Member tab
exports.getMembersData = async (req: express.Request, res: express.Response) => {
  try {
    let retData: any[] = [];
    let pendingData: any[] = [];
    const communityAddress: any = req.query.communityAddress;
    const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
    const communityData = communitySnap.data();

    if (communityData) {
      let communityToken : any;
      let getTokenRes : any;
      let totalSupply : any;

      let communityHasToken : boolean = false;
      if(communityData.TokenName !== '' && communityData.TokenSymbol !== '') {
        communityHasToken = true
      }

      if(communityHasToken) {
        communityToken = communityData.TokenSymbol;
        getTokenRes = await coinBalance.getToken(communityToken, apiKey);

        if (getTokenRes && getTokenRes.success) {
          totalSupply = getTokenRes.output.Supply;

        } else {
          console.log('Error in controllers/communitiesControllers -> getMembersData()', 'Error getting Token info');
          res.send({ success: false, error: 'Error getting Token info' });
        }
      }

      // create retData array from userDataMap extracting the necessary info
      const userSnap = await db.collection(collections.user).doc(communityData.Creator).get();
      const userData: any = userSnap.data();

      if (userSnap.exists) {
        let proportion: number = 0;
        if(communityHasToken) {
          const address = userData.address;
          if (address) {
            let balance = await coinBalance.balanceOf(address, communityToken);

            if (balance && balance.output && balance.output.Amount) {
              const amount = balance.output.Amount;
              proportion = amount / totalSupply ?? 0;
            }
          }
        }

        retData.push({
          id: communityData.Creator,
          AnonAvatar: userData.anonAvatar,
          Anon: userData.anon,
          UserId: communityData.Creator,
          Name: userData.firstName,
          SupplyProportion: proportion,
          Role: ['Creator'],
          Level: userData.level ?? 1, // TODO: get correct level from somewhere
          Activity: '', // TODO: get correct activity from somewhere
          NumFollowers: userData.followers ? userData.followers.length : 0,
        });
      }

      const admins = [...communityData.Admins || []];

      for (let admin of admins) {
        const userSnap = await db.collection(collections.user).doc(admin.userId).get();
        const userData: any = userSnap.data();

        if (userSnap.exists && admin && admin.userId) {
          let proportion: number = 0;
          if(communityHasToken) {
            const address = userData.address;
            if (address) {
              let balance = await coinBalance.balanceOf(address, communityToken);

              if (balance && balance.output && balance.output.Amount) {
                const amount = balance.output.Amount;
                proportion = amount / totalSupply ?? 0;
              }
            }
          }

          if (admin && admin.status && admin.status === 'Accepted') {
            retData = await addMemberInArray(retData, admin.userId, userData, proportion, 'Admin');
          } else if (admin && admin.status && admin.status === 'Pending') {
            pendingData = await addMemberInArray(pendingData, admin.userId, userData, proportion, 'Admin');
          }
        }
      }

      const userRoles = communityData.UserRoles;

      Object.keys(userRoles).map((key) => {
        let idUserRole = '';
        if (userRoles[key]) {
          idUserRole = userRoles[key].userId;
          let roleUserRole = userRoles[key].roles;

          Object.keys(roleUserRole).map(async (key) => {
            let role = roleUserRole[key];

            const userSnap = await db.collection(collections.user).doc(idUserRole).get();
            const userData: any = userSnap.data();

            let proportion: number = 0;
            if(communityHasToken) {
              let balance = await coinBalance.balanceOf(userData.address, communityToken);

              if (balance && balance.output && balance.output.Amount) {
                const amount = balance.output.Amount;
                proportion = amount / totalSupply ?? 0;
              }
            }

            if (role && role === 'Accepted') {
              retData = await addMemberInArray(retData, idUserRole, userData, proportion, key);
            } else if (role && role === 'Pending') {
              pendingData = await addMemberInArray(pendingData, idUserRole, userData, proportion, key);
            }
          });
        }
      });

      const membersArray = [...communityData.Members || []];

      for (let member of membersArray) {
        const userSnap = await db.collection(collections.user).doc(member.id).get();
        const userData: any = userSnap.data();

        if (userSnap.exists && member && member.id) {
          let proportion: number = 0;
          if(communityHasToken) {
            const address = userData.address;
            if (address) {
              let balance = await coinBalance.balanceOf(address, communityToken);

              if (balance && balance.output && balance.output.Amount) {
                const amount = balance.output.Amount;
                proportion = amount / totalSupply ?? 0;
              }
            }
          }

          retData = await addMemberInArray(retData, member.id, userData, proportion, 'Member');

        }
      }

      res.send({
        success: true,
        data:  {
          members: retData,
          pendingMembers: pendingData,
          communityHasToken: communityHasToken
        }
      });

    } else {
      console.log('Error in controllers/communitiesControllers -> getMembersData()', 'No community found');
      res.send({ success: false, error: 'No community found' });
    }
  } catch (e) {
    console.log('Error in controllers/communitiesControllers -> getMembersData()' + e);
    res.send({ success: false, error: e });
  }
};

const addMemberInArray = async (array, userId, userData, proportion, role) : Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      let alreadyFoundIndex = array.findIndex((user) => user.UserId === userId);

      if (alreadyFoundIndex !== -1) {
        if (array[alreadyFoundIndex].Role) {
          array[alreadyFoundIndex].Role.push('Member');
        }
      } else {
        array.push({
          id: userId,
          AnonAvatar: userData.anonAvatar,
          Anon: userData.anon,
          UserId: userId,
          Name: userData.firstName,
          SupplyProportion: proportion,
          Role: [role],
          Level: userData.level ?? 1, // TODO: get correct level from somewhere
          Activity: '', // TODO: get correct activity from somewhere
          NumFollowers: userData.followers ? userData.followers.length : 0,
        });
      }
      resolve(array);
    } catch (e) {
      reject(e);
    }
  });
}


// get some extra data needed for FE, they are not stored at firebase
const getExtraData = async (data, rateOfChange) => {
  // const price = getMarketPrice(data.AMM, data.SupplyReleased, data.InitialSupply, data.TargetPrice, data.TargetSupply);
  let price = 0;
  let priceInPrivi = 0;
  const blockchainRes = await community.getCommunityTokenPrice(data.CommunityAddress, apiKey);
  if (blockchainRes && blockchainRes.success) {
    price = blockchainRes.output;
    priceInPrivi =
      rateOfChange[data.FundingToken] && rateOfChange.PRIVI
        ? price * (rateOfChange[data.FundingToken] / rateOfChange.PRIVI)
        : 0;
  }
  const mcap = data.SupplyReleased ? data.SupplyReleased * priceInPrivi : 0;
  return {
    Price: price,
    MCAP: mcap,
  };
};

// get all communities, highlighting the trending ones
exports.getCommunities = async (req: express.Request, res: express.Response) => {
  try {
    const lastCommunity: number = +req.params.pagination;
    const allCommunities: any[] = [];

    let communitiesSnap: any;
    if (lastCommunity) {
      const lastId: any = req.params.lastId;
      const communityRef = db.collection(collections.community).doc(lastId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      communitiesSnap = await db
        .collection(collections.community)
        .orderBy('Date')
        .startAfter(community.Date)
        .limit(6)
        .get();
    } else {
      communitiesSnap = await db.collection(collections.community).orderBy('Date').limit(6).get();
    }
    const rateOfChange = await getRateOfChangeAsMap();
    const docs = communitiesSnap.docs;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const data: any = doc.data();
      const id: any = doc.id;
      const extraData = await getExtraData(data, rateOfChange);

      let arrayMembersId : any[] = await getArrayIdCommunityMembers(data);

      allCommunities.push({
        ...data,
        ...extraData,
        id: id,
        arrayMembersId: arrayMembersId
      });
    }
    res.send({
      success: true,
      data: {
        all: allCommunities,
      },
    });
  } catch (e) {
    return 'Error in controllers/communitiesControllers -> getAllCommunities()' + e;
  }
};

// get a single community data
exports.getCommunity = async (req: express.Request, res: express.Response) => {
  try {
    const communityAddress = req.params.communityAddress;
    const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
    const rateOfChange = await getRateOfChangeAsMap();
    const data : any = communitySnap.data();
    const id : any = communitySnap.id;
    const extraData = await getExtraData(data, rateOfChange);

    const ads: any[] = [];
    if (data.GeneralAd && data.GeneralAd !== '') {
      const adRef = db.collection(collections.ad).doc(data.GeneralAd);
      const adGet = await adRef.get();
      const ad: any = adGet.data();
      ads.push({ GeneralAd: ad });
    }

    let arrayMembersId : any[] = await getArrayIdCommunityMembers(data);

    if (data.UserRoles) {
      let userRolesKeys = Object.keys(data.UserRoles);
      for (const userRoleEmail of userRolesKeys) {
        if(data.UserRoles[userRoleEmail] && data.UserRoles[userRoleEmail].userId) {
          const userSnap = await db.collection(collections.user).doc(data.UserRoles[userRoleEmail].userId).get();
          const userData: any = userSnap.data();
          data.UserRoles[userRoleEmail].name = userData.firstName;
        }
      }
    }

    data.PostsArray = [];
    if (data.Posts && data.Posts.length > 0) {
      for (const post of data.Posts) {
        const communityWallPostSnap = await db.collection(collections.communityWallPost).doc(post).get();
        const communityWallPostData: any = communityWallPostSnap.data();
        communityWallPostData.id = communityWallPostSnap.id;
        data.PostsArray.push(communityWallPostData);
      }
    }

    data.VotingsArray = [];
    if (data.Votings && data.Votings.length > 0) {
      for (const voting of data.Votings) {
        const votingSnap = await db.collection(collections.voting).doc(voting).get();
        const votingData: any = votingSnap.data();
        if (votingSnap.exists) {
          votingData.id = votingSnap.id;

          const userRef = db.collection(collections.user).doc(votingData.CreatorId);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          votingData.CreatorName = user.firstName;

          data.VotingsArray.push(votingData);
        }
      }
    }

    data.TreasuryVotingsArray = [];
    if (data.TreasuryVoting && data.TreasuryVoting.length > 0) {
      for (const voting of data.TreasuryVoting) {
        const votingSnap = await db.collection(collections.voting).doc(voting).get();
        const votingData: any = votingSnap.data();
        if (votingSnap.exists) {
          votingData.id = votingSnap.id;

          const userRef = db.collection(collections.user).doc(votingData.CreatorId);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          votingData.CreatorName = user.firstName;

          data.TreasuryVotingsArray.push(votingData);
        }
      }
    }

    data.TreasuryHistory = [];
    const addressUidMap = await getAddresUidMap();
    const communityTransactions = await communitySnap.ref.collection(collections.communityTransactions).get();
    communityTransactions.forEach((doc) => {
      const txns = doc.data().Transactions ?? [];
      txns.forEach((txn) => {
        if (txn.Type && txn.Type == 'transfer') {
          data.TreasuryHistory.push({
            Action: txn.From == communityAddress ? 'receive' : 'send',
            UserId: txn.From == communityAddress ? addressUidMap[txn.To] : addressUidMap[txn.From],
            Token: txn.Token,
            Quantity: txn.Amount,
            Date: txn.Date,
          });
        }
      });
    });

    res.send({
      success: true,
      data: {
        ...data,
        ...extraData,
        id: id,
        ads: ads,
        membersIdArray: arrayMembersId
      },
    });
  } catch (e) {
    console.log('Error in controllers/communitiesControllers -> getCommunity()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/communitiesControllers -> getCommunity()' + e,
    });
  }
};

// get a single community counters
exports.getCommunityCounters = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let commentsCounter = 0;
    let commentsMonthCounter = 0;
    let conversationsMonthCounter = 0;
    const discordId = body.discordId;
    const communityId = body.communityId;
    const monthPrior = new Date(new Date().setDate(new Date().getDate() - 30));

    // Blog posts
    const blogPosts = await db.collection(collections.blogPost).where('communityId', '==', communityId).get();
    if (!blogPosts.empty) {
      for (const doc of blogPosts.docs) {
        let post = { ...doc.data() };
        commentsCounter++;

        if (new Date(post.createdAt) > monthPrior) {
          commentsMonthCounter++;
          conversationsMonthCounter++;

          if (post.responses && post.responses.length > 0) {
            commentsMonthCounter = commentsMonthCounter + post.responses.length;
            commentsCounter = commentsCounter + post.responses.length;
          }
        } else {
          if (post.responses && post.responses.length > 0) {
            commentsCounter = commentsCounter + post.responses.length;
          }
        }
      }
    }

    // Wall Posts
    const communityWallPostQuery = await db
      .collection(collections.communityWallPost)
      .where('communityId', '==', communityId)
      .get();
    if (!communityWallPostQuery.empty) {
      for (const doc of communityWallPostQuery.docs) {
        let post = { ...doc.data() };
        commentsCounter++;

        if (new Date(post.createdAt) > monthPrior) {
          commentsMonthCounter++;
          conversationsMonthCounter++;

          if (post.responses && post.responses.length > 0) {
            commentsMonthCounter = commentsMonthCounter + post.responses.length;
            commentsCounter = commentsCounter + post.responses.length;
          }
        } else {
          if (post.responses && post.responses.length > 0) {
            commentsCounter = commentsCounter + post.responses.length;
          }
        }
      }
    }

    // Discord chats
    const discordChatRef = db.collection(collections.discordChat).doc(discordId);
    const discordRoomGet = await discordChatRef.collection(collections.discordRoom).get();
    let counter = 0;
    discordRoomGet.forEach(async (doc) => {
      counter++;
      let discordRoom = { ...doc.data() };

      if (new Date(discordRoom.created) > monthPrior) {
        conversationsMonthCounter++;
      }

      if (discordRoom.messages && discordRoom.messages.length > 0) {
        for (let i = 0; i < discordRoom.messages.length; i++) {
          const messageGet = await db.collection(collections.discordMessage).doc(discordRoom.messages[i]).get();

          // console.log("messageGet: " + JSON.stringify(messageGet))
          const message = { ...messageGet.data() };
          commentsCounter++;

          if (new Date(message.created) > monthPrior) {
            commentsMonthCounter++;
          }
        }
      }
    });

    res.send({
      success: true,
      data: {
        commentsCounter: commentsCounter,
        commentsMonthCounter: commentsMonthCounter,
        conversationsMonthCounter: conversationsMonthCounter,
      },
    });
  } catch (e) {
    console.log('Error in controllers/communitiesControllers -> getCommunityCounters()' + e);
    res.send({
      success: false,
      error: 'Error in controllers/communitiesControllers -> getCommunityCounters()' + e,
    });
  }
};

// get all badges
exports.getBadges = async (req: express.Request, res: express.Response) => {
  try {
    let creator = req.params.communityAddress;
    const allBadges: any[] = [];
    const badgesSnap = await db.collection(collections.badges).where('creator', '==', creator).get();

    badgesSnap.forEach((doc) => {
      const data: any = doc.data();
      data.id = doc.id;
      allBadges.push({ ...data });
    });

    res.send({
      success: true,
      data: {
        all: allBadges,
      },
    });
  } catch (e) {
    return 'Error in controllers/communityController -> getBadges()' + e;
  }
};

exports.changeBadgePhoto = async (req: express.Request, res: express.Response) => {
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
      console.log('Error in controllers/communityController -> changeBadgePhoto()', "There's no file...");
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> changeBadgePhoto()', err);
    res.send({ success: false });
  }
};

exports.getBadgePhotoById = async (req: express.Request, res: express.Response) => {
  try {
    let badgeId = req.params.badgeId;
    console.log(badgeId);
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
          console.log(file);
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
      console.log('Error in controllers/communityController -> getBadgePhotoById()', "There's no id...");
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log('Error in controllers/communityController -> getBadgePhotoById()', err);
    res.send({ success: false });
  }
};

exports.getTrendingCommunities = async (req: express.Request, res: express.Response) => {
  try {
    const trendingCommunities: any[] = [];
    const communitiesSnap = await db.collection(collections.trendingCommunity).limit(5).get();
    const rateOfChange = await getRateOfChangeAsMap();
    const docs = communitiesSnap.docs;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const data: any = doc.data();
      const id: any = doc.id;
      const extraData = await getExtraData(data, rateOfChange);
      let arrayMembersId : any[] = await getArrayIdCommunityMembers(data);

      trendingCommunities.push({
        ...data,
        ...extraData,
        id: id,
        arrayMembersId: arrayMembersId
      });
    }
    res.send({ success: true, data: { trending: trendingCommunities } });
  } catch (e) {
    console.log('Error in controllers/communityController -> getTrendingCommunities()', e);
    res.send({ success: false, message: e });
  }
};

exports.setTrendingCommunities = cron.schedule('0 0 * * *', async () => {
  try {
    const allCommunities: any[] = [];
    const communitiesSnap = await db.collection(collections.community).get();
    const rateOfChange = await getRateOfChangeAsMap();
    const docs = communitiesSnap.docs;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const data: any = doc.data();
      const id: any = doc.id;
      const extraData = await getExtraData(data, rateOfChange);
      allCommunities.push({ ...data, ...extraData, id: id });
    }
    const trendingCommunities = filterTrending(allCommunities);
    let batch = db.batch();

    await db
      .collection(collections.trendingCommunity)
      .listDocuments()
      .then((val) => {
        val.map((val) => {
          batch.delete(val);
        });
      });
    await trendingCommunities.forEach((doc) => {
      let docRef = db.collection(collections.trendingCommunity).doc(); //automatically generate unique id
      batch.set(docRef, doc);
    });
    await batch.commit();
  } catch (err) {
    console.log('Error in controllers/communityController -> setTrendingCommunities()', err);
  }
});

exports.roleInvitation = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let checkIsCreator = await communityWallController.checkIfUserIsCreator(body.userId, body.communityId);
    let checkIsAdmin = await communityWallController.checkUserRole(body.userId, user.email, body.communityId, true, false, []);

    if (body.userId && body.communityId && body.role && body.creator && (checkIsCreator || checkIsAdmin)) {
      const communityRef = db.collection(collections.community).doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      const creatorUserRef = db.collection(collections.user).doc(body.creator);
      const creatorUserGet = await creatorUserRef.get();
      const creator: any = creatorUserGet.data();

      if (body.role === 'Admin') {
        let admins : any[] = [...community.Admins];

        let adminFoundIndex = admins.findIndex(admin => admin.userId === body.userId);
        if(adminFoundIndex === -1) {
          const userRef = db.collection(collections.user).doc(body.userId);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          admins.push({
            name: user.email,
            userId: body.userId,
            status: 'Pending',
          });
          await communityRef.update({
            Admins: admins,
          });
        } else {
          console.log('Error in controllers/communityController -> roleInvitation()', "User is already an Admin or invitation has been sent before");
          res.send({ success: false, error: "User is already an Admin or invitation has been sent before" });
          return;
        }
      } else if (body.role === 'Moderator' || body.role === 'Treasurer') {
        let userRoles : any = community.UserRoles;

        const userRef = db.collection(collections.user).doc(body.userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        if (userRoles && userRoles[user.email] && userRoles[user.email].roles) {
          if(!userRoles[user.email].roles[body.role] || userRoles[user.email].roles[body.role] !== 'Accepted') {
            userRoles[user.email].roles[body.role] = 'Pending';
          } else {
            console.log('Error in controllers/communityController -> roleInvitation()', `User is already a ${body.role}`);
            res.send({ success: false, error: `User is already a ${body.role}` });
            return;
          }
        } else {
          userRoles[user.email] = {
            roles: {},
            userId: body.userId,
          };
          userRoles[user.email].roles[body.role] = 'Pending';
        }
        await communityRef.update({
          UserRoles: userRoles,
        });
      } else if (body.role === 'Member') {
        let members: any[] = [...community.Members];

        let memberFoundIndex = members.findIndex(member => member.id === body.userId);
        if(memberFoundIndex === -1) {
          const userRef = db.collection(collections.user).doc(body.userId);
          const userGet = await userRef.get();
          const user: any = userGet.data();

          members.push({
            id: body.userId,
            date: Date.now(),
          });
          await communityRef.update({
            Members: members,
          });
        } else {
          console.log('Error in controllers/communityController -> roleInvitation()', "User is already a Member or invitation has been sent before");
          res.send({ success: false, error: "User is already a Member or invitation has been sent before" });
          return;
        }
      } else {
        console.log('Error in controllers/communityController -> removeRoleUser()', "Role doesn't exists");
        res.send({ success: false, error: "Role doesn't exists" });
        return;
      }
      await notificationsController.addNotification({
        userId: body.userId,
        notification: {
          type: 86,
          typeItemId: 'user',
          itemId: body.creator,
          follower: creator.firstName,
          pod: community.Name, // community name
          comment: body.role,
          token: '',
          amount: 0,
          onlyInformation: false,
          otherItemId: body.communityId,
        },
      });

      res.send({ success: true, message: 'Invitation sent' });
    } else {
      console.log('Error in controllers/communityController -> roleInvitation()', 'Info missing');
      res.send({ success: false, error: 'Info missing' });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> roleInvitation()', e);
    res.send({ success: false, error: e });
  }
};

exports.removeRoleUser = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;

    const userRef = db.collection(collections.user).doc(body.userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let checkIsCreator = await communityWallController.checkIfUserIsCreator(body.userId, body.communityId);
    let checkIsAdmin = await communityWallController.checkUserRole(body.userId, user.email, body.communityId, true, false, []);

    if (body.userId && body.communityId && body.role && body.creator && (checkIsCreator || checkIsAdmin)) {
      const communityRef = db.collection(collections.community).doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      if (body.role === 'Admin') {
        let admins: any[] = [...community.Admins];

        let adminFoundIndex = admins.findIndex((admin) => admin.userId === body.userId);

        if (adminFoundIndex !== -1) {
          admins.splice(adminFoundIndex, 1);
          await communityRef.update({
            Admins: admins,
          });
        } else {
          console.log('Error in controllers/communityController -> removeRoleUser()', 'Admin not found');
          res.send({ success: false, error: 'Admin not found' });
          return;
        }
      } else if (body.role === 'Moderator' || body.role === 'Treasurer') {
        let userRoles: any = community.UserRoles;

        const userRef = db.collection(collections.user).doc(body.userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        if (userRoles[user.email] && userRoles[user.email].roles && userRoles[user.email].roles[body.role]) {

          delete userRoles[user.email].roles[body.role];

          await communityRef.update({
            UserRoles: userRoles,
          });
        } else {
          console.log('Error in controllers/communityController -> removeRoleUser()', 'User not found');
          res.send({ success: false, error: 'User not found' });
          return;
        }
      } else if (body.role === 'Member') {
        let members: any[] = [...community.Members];

        let memberFoundIndex = members.findIndex((member) => member.id === body.userId);

        if (memberFoundIndex !== -1) {
          members.splice(memberFoundIndex, 1);
          await communityRef.update({
            Members: members,
          });
        } else {
          console.log('Error in controllers/communityController -> removeRoleUser()', 'Member not found');
          res.send({ success: false, error: 'Member not found' });
          return;
        }
      }

      const discordRoomSnap = await db.collection(collections.discordChat).doc(community.JarrId)
        .collection(collections.discordRoom).get();
      for (const doc of discordRoomSnap.docs) {
        let data = doc.data();
        if (!data.private) {
          chatController.removeUserToRoom(community.DiscordId, doc.id, body.userId);
        }
      }

      res.send({ success: true, error: 'Role User removed' });
    } else {
      console.log('Error in controllers/communityController -> removeRoleUser()', "Info missing or you don't have rights");
      res.send({ success: false, error: "Info missing or you don't have rights" });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> removeRoleUser()', e);
    res.send({ success: false, error: e });
  }
};

exports.acceptRoleInvitation = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    if (body.userId && body.communityId && body.role) {
      const communityRef = db.collection(collections.community).doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if (communityGet.exists && community) {
        if (body.role === 'Admin') {
          if (community.Admins && community.Admins.length > 0) {
            let adminIndex = community.Admins.findIndex((admin) => admin.userId === body.userId);

            if (adminIndex !== -1) {
              let copyAdmins = [...community.Admins];
              copyAdmins[adminIndex].status = 'Accepted';

              await communityRef.update({
                Admins: copyAdmins,
              });
            } else {
              console.log('Error in controllers/communityController -> acceptRoleInvitation()', 'You are not invited');
              res.send({ success: false, message: 'You are not invited' });
              return;
            }
          }
        } else if (body.role === 'Member') {
          if (community.Members) {
            let memberIndex = community.Members.findIndex((member) => member.id === body.userId);

            if (memberIndex === -1) {
              let copyMembers = [...community.Members];
              copyMembers.push({
                date: Date.now(),
                id: body.userId,
              });

              await communityRef.update({
                Members: copyMembers,
              });
            }
          }
        } else if (body.role === 'Moderator' || body.role === 'Treasurer') {
          if (community.UserRoles && community.UserRoles[user.email]) {
            community.UserRoles[user.email].roles[body.role] = 'Accepted';

            await communityRef.update({
              UserRoles: community.UserRoles,
            });
          } else {
            console.log('Error in controllers/communityController -> acceptRoleInvitation()', 'You are not invited');
            res.send({ success: false, message: 'You are not invited' });
            return;
          }
        } else {
          console.log('Error in controllers/communityController -> acceptRoleInvitation()', "Role doesn't exists");
          res.send({ success: false, message: "Role doesn't exists" });
          return;
        }

        const discordRoomSnap = await db.collection(collections.discordChat).doc(community.JarrId)
          .collection(collections.discordRoom).get();
        for (const doc of discordRoomSnap.docs) {
          let data = doc.data();
          if (!data.private) {
            chatController.addUserToRoom(community.JarrId, doc.id, body.userId, body.role);
          }
        }

        await notificationsController.addNotification({
          userId: body.userId,
          notification: {
            type: 89,
            typeItemId: 'user',
            itemId: body.userId,
            follower: user.firstName,
            pod: community.Name, // community name
            comment: body.role,
            token: '',
            amount: 0,
            onlyInformation: false,
            otherItemId: body.communityId,
          },
        });

        await notificationsController.addNotification({
          userId: community.Creator,
          notification: {
            type: 87,
            typeItemId: 'user',
            itemId: body.userId,
            follower: user.firstName,
            pod: community.Name, // community name
            comment: body.role,
            token: '',
            amount: 0,
            onlyInformation: false,
            otherItemId: body.communityId,
          },
        });

        let notifications = [...user.notifications];
        let foundIndex = notifications.findIndex(
          (noti) =>
            noti.comment === body.role &&
            noti.itemId === body.userId &&
            noti.otherItemId === body.communityId &&
            noti.type === 86
        );
        notifications.splice(foundIndex, 1);

        await userRef.update({
          notifications: notifications,
        });

        res.send({ success: true, data: 'Invitation accepted' });
      } else {
        console.log('Error in controllers/communityController -> acceptRoleInvitation()', 'Community not found');
        res.send({ success: false, message: 'Community not found' });
      }
    } else {
      console.log('Error in controllers/communityController -> acceptRoleInvitation()', 'Info missing');
      res.send({ success: false, message: 'Info missing' });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> acceptRoleInvitation()', e);
    res.send({ success: false, message: e });
  }
};

exports.declineRoleInvitation = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    if (body.userId && body.communityId && body.role) {
      const communityRef = db.collection(collections.community).doc(body.communityId);
      const communityGet = await communityRef.get();
      const community: any = communityGet.data();

      const userRef = db.collection(collections.user).doc(body.userId);
      const userGet = await userRef.get();
      const user: any = userGet.data();

      if (communityGet.exists && community) {
        if (body.role === 'Admin') {
          if (community.Admins && community.Admins.length > 0) {
            let adminIndex = community.Admins.findIndex((admin) => admin.userId === body.userId);

            if (adminIndex !== -1) {
              let copyAdmins = [...community.Admins];
              copyAdmins.splice(adminIndex, 1);

              await communityRef.update({
                Admins: copyAdmins,
              });
            } else {
              console.log('Error in controllers/communityController -> declineRoleInvitation()', 'You are not invited');
              res.send({ success: false, message: 'You are not invited' });
              return;
            }
          }
        } else if (body.role === 'Moderator' || body.role === 'Treasurer') {
          if (
            community.UserRoles &&
            community.UserRoles[user.email] &&
            community.UserRoles[user.email].roles[body.role]
          ) {
            delete community.UserRoles[user.email].roles[body.role];

            let keysRoles = Object.keys(community.UserRoles[user.email].roles);
            console.log(keysRoles, keysRoles.length);
            if (keysRoles.length === 0) {
              delete community.UserRoles[user.email];
            }

            await communityRef.update({
              UserRoles: community.UserRoles,
            });
          }
        } else {
          console.log('Error in controllers/communityController -> declineRoleInvitation()', "Role doesn't exists");
          res.send({ success: false, message: "Role doesn't exists" });
          return;
        }

        await notificationsController.addNotification({
          userId: body.userId,
          notification: {
            type: 90,
            typeItemId: 'user',
            itemId: body.userId,
            follower: user.firstName,
            pod: community.Name, // community name
            comment: body.role,
            token: '',
            amount: 0,
            onlyInformation: false,
            otherItemId: body.communityId,
          },
        });

        await notificationsController.addNotification({
          userId: community.Creator,
          notification: {
            type: 88,
            typeItemId: 'user',
            itemId: body.userId,
            follower: user.firstName,
            pod: community.Name, // community name
            comment: body.role,
            token: '',
            amount: 0,
            onlyInformation: false,
            otherItemId: body.communityId,
          },
        });

        let notifications = [...user.notifications];
        let foundIndex = notifications.findIndex(
          (noti) =>
            noti.comment === body.role &&
            noti.itemId === body.userId &&
            noti.otherItemId === body.communityId &&
            noti.type === 86
        );
        notifications.splice(foundIndex, 1);

        await userRef.update({
          notifications: notifications,
        });

        res.send({ success: true, data: 'Invitation declined' });
      } else {
        console.log('Error in controllers/communityController -> declineRoleInvitation()', 'Community not found');
        res.send({ success: false, message: 'Community not found' });
      }
    } else {
      console.log('Error in controllers/communityController -> declineRoleInvitation()', 'Info missing');
      res.send({ success: false, message: 'Info missing' });
    }
  } catch (e) {
    console.log('Error in controllers/communityController -> declineRoleInvitation()', e);
    res.send({ success: false, message: e });
  }
};

/**
 * Function to check pods data before creation.
 * @param req {podName}. podName: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: transaction array
 */
exports.checkCommunityInfo = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    const communitySnap = await db.collection(collections.community).where('Name', '==', body.communityName).get();
    const communityCheckSize: number = communitySnap.size;
    let communityExists: boolean = communityCheckSize === 1 ? true : false;

    res.send({
      success: true,
      data: { communityExists: communityExists },
    });
  } catch (e) {
    return 'Error in controllers/communityController -> checkCommunityInfo(): ' + e;
  }
};

/*
exports.createVotation = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creatorAddress = body.creatorAddress;
        const name = body.name;
        const description = body.description;
        const discordId = body.discordId;
        const twitterId = body.twitterId;
        const votationId = body.votationId;
        const votationAddress = body.votationAddress;
        const votingToken = body.votingToken;
        const quorumRequired = body.quorumRequired;
        const startDate = body.StartDate;
        const endingDate = body.EndingDate;
        const blockchainRes = await community.createVotation(creatorAddress, votationId, votationAddress, votingToken, parseFloat(quorumRequired), startDate, endingDate, apiKey);

        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            res.send({
                success: true, data: {
                    creatorAddress: creatorAddress,
                    votationId: votationId,
                    votationAddress: votationAddress,
                    votingToken: votingToken,
                    quorumRequired: quorumRequired,
                    startDate: startDate,
                    endingDate: endingDate,
                    name: name,
                    description: description,
                    discordId: discordId,
                    twitterId: twitterId,
                    users: [],
                    hasPhoto: false
                }
            });
        }
        else {
            console.log('Error in controllers/communitiesControllers -> createVotation(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (e) {
        return ('Error in controllers/communitiesControllers -> createVotation()' + e)
    }
}


exports.changeVotationPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const votationRef = db.collection(collections.votation)
                .doc(req.file.originalname);
            const votationGet = await votationRef.get();
            const votation: any = votationGet.data();
            if (votation.hasPhoto) {
                await votationRef.update({
                    hasPhoto: true
                });
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/communitiesController -> changeVotationPhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communitiesController -> changeVotationPhoto()', err);
        res.send({ success: false });
    }
};

exports.endVotations = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Community endVotation() cron job started *********");
        const votationSnap = await db.collection(collections.votation).get();
        votationSnap.forEach(async (votation) => {
            let votationData = votation.data();
            let endingDate = votationData.EndingDate;
            if (endingDate > Date.now()) {
                const txnId = generateUniqueId();
                const blockchainRes = await community.endVotation(votationData.VotationId, votationData.VotationAddress, Date.now(), txnId, apiKey);

                if (blockchainRes && blockchainRes.success) {
                    updateFirebase(blockchainRes);
                }

            }
        });
    } catch (err) {
        console.log('Error in controllers/communityController -> endVotation()', err);
    }
});
*/

const getArrayIdCommunityMembers = async (data : any) => {
  return new Promise<any[]>((resolve, reject) => {
    try {
      let arrayMembersId : any[] = [];

      if(data.Creator) {
        arrayMembersId.push(data.Creator);
      }
      if(data.Admins && data.Admins.length > 0) {
        for(let admin of data.Admins) {
          if(admin.status === 'Accepted') {
            let foundMemberIndex = arrayMembersId.findIndex((member) => member === admin.userId);
            if(foundMemberIndex === -1) {
              arrayMembersId.push(admin.userId);
            }
          }
        }
      }
      if(data.Members && data.Members.length > 0) {
        for(let member of data.Members) {
          let foundMemberIndex = arrayMembersId.findIndex((memb) => memb === member.id);
          if(foundMemberIndex === -1) {
            arrayMembersId.push(member.id);
          }
        }
      }

      let userRolesKeys = Object.keys(data.UserRoles);
      for(let userRole of userRolesKeys) {
        if(data.UserRoles[userRole].userId) {
          let foundMemberIndex = arrayMembersId.findIndex((memb) => memb === data.UserRoles[userRole].userId);
          if(foundMemberIndex === -1) {
            let rolesKeys = Object.keys(data.UserRoles[userRole].roles);
            let hasRoleAccepted : boolean = false;
            for(let role of rolesKeys) {
              if(data.UserRoles[userRole].roles[role] && data.UserRoles[userRole].roles[role] === 'Accepted') {
                hasRoleAccepted = true;
              }
            }
            if(hasRoleAccepted) {
              arrayMembersId.push(data.UserRoles[userRole].userId);
            }
          }
        }
      }

      resolve(arrayMembersId);
    } catch (e) {
      console.log('');
      reject(e)
    }
  });
}