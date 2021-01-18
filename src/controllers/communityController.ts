import express from "express";
import { createNotification, generateUniqueId, updateFirebase, filterTrending, getMarketPrice, follow, unfollow, getRateOfChangeAsMap, getBuyTokenAmount, getSellTokenAmount } from "../functions/functions";
import badge from "../blockchain/badge";
import community from "../blockchain/community";
import notificationTypes from "../constants/notificationType";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';
import fields from '../firebase/fields';
import cron from 'node-cron';
import { clearLine } from "readline";
import path from "path";
import fs from "fs";

const chatController = require('./chatController');

require('dotenv').config();
// const apiKey = process.env.API_KEY;
const apiKey = "PRIVI";

///////////////////////////// POST ///////////////////////////////

exports.createCommunity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.Creator;
        const amm = body.AMM;
        const initialSupply = body.InitialSupply;
        const targetSupply = body.TargetSupply;
        const targetPrice = body.TargetPrice;
        const spreadDividend = body.SpreadDividend;
        const fundingToken = body.FundingToken;
        const tokenSymbol = body.TokenSymbol;
        const tokenName = body.TokenName;
        const frequency = body.Frequency;
        const lockupDate = body.LockUpDate;   // just for now

        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await community.createCommunity(creator, amm, targetSupply, targetPrice, spreadDividend, fundingToken, tokenSymbol, tokenName, frequency, initialSupply,
            lockupDate, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);
            const updateCommunities = blockchainRes.output.UpdateCommunities;
            const [communityAddress, communityObj]: [any, any] = Object.entries(updateCommunities)[0];
            const ammAddress = communityObj.AMMAddress;

            // add other common infos
            const name = body.Name;
            const description = body.Description;
            const mainHashtag = body.MainHashtag;
            const hashtags = body.Hashtags;
            const privacy = body.Privacy;
            const hasPhoto = body.HasPhoto;
            const dicordId = body.DiscordId;
            const twitterId = body.TwitterId;
            const openAdvertising = body.OpenAdvertising;
            const ethereumAddr = body.EthereumContractAddress;
            const paymentsAllowed = body.PaymentsAllowed;

            const collateralQuantity = Number(body.CollateralQuantity);
            const collateralOption = body.CollateralOption;
            const collateralToken = body.CollateralToken;

            const ruleBased = body.RuleBased;

            const requiredTokens = body.RequiredTokens;

            const minUserLevel = body.MinimumUserLevel == 'Not required' ? 0 : body.MinimumUserLevel;
            const minEndorsementScore = body.MinimumEndorsementScore == 'Not required' ? 0 : body.MinimumEndorsementScore / 100;
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
            const userRoles = body.UserRoles;
            const invitedUsers = body.InvitationUsers; // list of string (email), TODO: send some kind of notification to these users

            const userRef = db.collection(collections.user)
                .doc(creator);
            const userGet = await userRef.get();
            const user: any = userGet.data();

            const discordChatCreation: any = await chatController.createDiscordChat(creator, user.firstName);
            await chatController.createDiscordRoom(discordChatCreation.id, 'Discussions', creator, user.firstName, 'general', false, []);
            await chatController.createDiscordRoom(discordChatCreation.id, 'Information', creator, user.firstName, 'announcements', false, []);

            const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, user.firstName);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Discussions', creator, user.firstName, 'general', false, []);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Information', creator, user.firstName, 'announcements', false, []);

            db.collection(collections.community).doc(communityAddress).set({
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
                EthereumAddress: ethereumAddr || '',

                CollateralQuantity: collateralQuantity || 0,
                CollateralOption: collateralOption || '',
                CollateralToken: collateralToken || '',

                RuleBased: ruleBased || true,

                RequiredTokens: requiredTokens || {},

                MinimumUserLevel: minUserLevel,
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

                UserRoles: userRoles,
                Admins: admins || [],
                InvitationUsers: invitedUsers,

            }, { merge: true });

            // add txn to community
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.community).doc(communityAddress).collection(collections.communityTransactions).doc(tid).set({ Transactions: txnArray });
            }

            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> createCommunity(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> createCommunity(): ', err);
        res.send({ success: false });
    }
};


exports.sellCommunityToken = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investor = body.Investor;
        const communityAddress = body.CommunityAddress;
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await community.sellCommunityToken(investor, communityAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // add txn to community
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.community).doc(communityAddress).collection(collections.communityTransactions).doc(tid).set({ Transactions: txnArray }); // add all because some of them dont have From or To (tokens are burned)
            }
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> sellCommunityToken(): success = false', blockchainRes.message);
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
        const hash = body.Hash;
        const signature = body.Signature;

        const blockchainRes = await community.buyCommunityToken(investor, communityAddress, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add txn to community
            const commSnap = await db.collection(collections.community).doc(communityAddress).get();
            const data: any = commSnap.data();
            const ammAddr = data.AMMAddress;
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == ammAddr || obj.To == ammAddr) {
                    commSnap.ref.collection(collections.communityTransactions).add(obj)
                }
            }
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> buyCommunityToken(): success = false', blockchainRes.message);
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

        const blockchainRes = await community.stakeCommunityFunds(lpAddress, communityAddress, amount, stakingToken, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/communityController -> stakeCommunityFunds(): success = false', blockchainRes.message);
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
        if (await follow(userAddress, communityAddress, collections.community, 'FollowingCommunities')) res.send({ success: true });
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
        if (await unfollow(userAddress, communityAddress, collections.community, 'FollowingCommunities')) res.send({ success: true });
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
            id: userAddress
        });
        const commUpdateObj = {};
        commUpdateObj[fields.joinedUsers] = joinedUsers;
        communitySnap.ref.update(commUpdateObj);

        //update discord chat
        const discordRoomSnap = await db.collection(collections.discordChat).doc(commData.DiscordId)
            .collection(collections.discordRoom).get();
        if (!discordRoomSnap.empty) {
            for (const doc of discordRoomSnap.docs) {
                let data = doc.data()
                if (!data.private) {
                    chatController.addUserToRoom(commData.DiscordId, doc.id, userSnap.id);
                }
            }
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
        const discordRoomSnap = await db.collection(collections.discordChat).doc(commData.DiscordId)
            .collection(collections.discordRoom).get();
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
        const fundingTokens = getBuyTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.TargetPrice, data.TargetSupply);
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
        const communityTokens = getSellTokenAmount(data.AMM, data.SupplyReleased, data.InitialSupply, amount, data.SpreadDividend, data.TargetPrice, data.TargetSupply);
        res.send({ success: true, data: communityTokens });
    } catch (err) {
        console.log('Error in controllers/communityController -> getFundingTokenAmount(): ', err);
        res.send({ success: false });
    }
};


/////////////////////////// GETS /////////////////////////////
// get some extra data needed for FE, they are not stored at firebase
const getExtraData = async (data, rateOfChange) => {
    //const price = getMarketPrice(data.AMM, data.SupplyReleased, data.InitialSupply, data.TargetPrice, data.TargetSupply);
    let price = 0;
    let priceInPrivi = 0;
    const blockchainRes = await community.getBalancesOfAddress(data.CommunityAddress, apiKey);
    if (blockchainRes && blockchainRes.success) {
        price = blockchainRes.output;
        priceInPrivi = rateOfChange[data.FundingToken] && rateOfChange.PC ? price * (rateOfChange[data.FundingToken] / rateOfChange.PC) : 0;
    }
    const mcap = data.SupplyReleased ? data.SupplyReleased * priceInPrivi : 0;
    return {
        Price: price,
        MCAP: mcap
    };
}

// get all communities, highlighting the trending ones
exports.getCommunities = async (req: express.Request, res: express.Response) => {
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
        res.send({
            success: true, data: {
                all: allCommunities,
                trending: trendingCommunities
            }
        });
    } catch (e) {
        return ('Error in controllers/communitiesControllers -> getAllCommunities()' + e)
    }
}

// get a single community data
exports.getCommunity = async (req: express.Request, res: express.Response) => {
    try {
        const communityAddress = req.params.communityAddress;
        const communitySnap = await db.collection(collections.community).doc(communityAddress).get();
        const rateOfChange = await getRateOfChangeAsMap();
        const data: any = communitySnap.data();
        const id: any = communitySnap.id;
        const extraData = getExtraData(data, rateOfChange);

        const ads: any[] = [];
        if (data.GeneralAd && data.GeneralAd !== '') {
            const adRef = db.collection(collections.ad).doc(data.GeneralAd);
            const adGet = await adRef.get();
            const ad: any = adGet.data();
            ads.push({ GeneralAd: ad });
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

        res.send({ success: true, data: { ...data, ...extraData, id: id, ads: ads } });
    } catch (e) {
        return ('Error in controllers/communitiesControllers -> getCommunity()' + e)
    }
}

// get all badges
exports.getBadges = async (req: express.Request, res: express.Response) => {
    try {
        let creator = req.params.communityAddress;
        const allBadges: any[] = [];
        const badgesSnap = await db.collection(collections.badges)
            .where("creator", "==", creator).get();

        badgesSnap.forEach((doc) => {
            const data: any = doc.data();
            data.id = doc.id;
            allBadges.push({ ...data });
        });

        res.send({
            success: true,
            data: {
                all: allBadges
            }
        });
    } catch (e) {
        return ('Error in controllers/communityController -> getBadges()' + e)
    }
}

exports.createBadge = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const name = body.name;
        const description = body.description;
        const totalSupply = body.totalSupply;
        const royalty = body.royalty;
        const classification = body.class;
        const txid = generateUniqueId();

        const blockchainRes = await badge.createBadge(creator, name, name, parseInt(totalSupply), parseFloat(royalty), classification, Date.now(), 0, txid, apiKey);
        if (blockchainRes && blockchainRes.success) {

            await db.runTransaction(async (transaction) => {
                transaction.set(db.collection(collections.badges).doc('' + txid), {
                    creator: creator,
                    name: name,
                    description: description,
                    classification: classification,
                    symbol: name,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                });
            });

            res.send({
                success: true, data: {
                    creator: creator,
                    name: name,
                    symbol: name,
                    classification: classification,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                }
            });
        }
        else {
            console.log('Error in controllers/communityController -> createBadge(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (e) {
        return ('Error in controllers/communityController -> createBadge()' + e)
    }
}

exports.changeBadgePhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const badgeRef = db.collection(collections.badges)
                .doc(req.file.originalname);

            const badgeGet = await badgeRef.get();
            const badge: any = await badgeGet.data();

            if (badge.hasPhoto) {
                await badgeRef.update({
                    hasPhoto: true
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
                console.log(err)
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
}

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
