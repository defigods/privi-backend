import express from "express";
import { createNotification, generateUniqueId, updateFirebase } from "../functions/functions";
import badge from "../blockchain/badge";
import community from "../blockchain/community";
import notificationTypes from "../constants/notificationType";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = process.env.API_KEY;

exports.createCommunity = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        // for blockchain call
        const communityToken = body.CommunityToken; // determines if the above parameters are given or not

        const creator = body.Creator;

        const amm = body.PriceDirection.toUpperCase();
        const targetSupply = Number(body.TargetSupply);
        const targetPrice = Number(body.TargetPrice);
        const tradingSpread = Number(body.TradingSpread) / 100;
        const fundingToken = body.FundingToken;
        const tokenSymbol = body.TokenId;
        const tokenName = body.TokenName;
        const frequency = body.Frequency.toUpperCase();
        const initialSupply = Number(body.InitialSupply);
        const dateLockUpDate = 0;   // just for now

        const ammAddress = generateUniqueId();
        const communityAddress = generateUniqueId();
        const votationAddress = generateUniqueId();
        const stakingAddress = generateUniqueId();
        const date = Date.now();
        const txnId = generateUniqueId();

        console.log(body);

        if (!communityToken) {  // not implemented this case yet
            console.log('Not Community Token case not implemented yet');
            res.send({ success: false });
            return;
        }

        const blockchainRes = await community.createCommunity(creator, communityAddress, ammAddress, votationAddress, stakingAddress, amm, targetSupply, targetPrice, tradingSpread, fundingToken, tokenSymbol, tokenName, frequency, initialSupply, date,
            dateLockUpDate, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);

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

            db.collection(collections.community).doc(communityAddress).set({
                HasPhoto: hasPhoto || false,
                Name: name || '',
                Description: description || '',
                MainHashtag: mainHashtag || '',
                Hashtags: hashtags || [],
                Privacy: privacy,
                OpenAdvertising: openAdvertising || false,
                PaymentsAllowed: paymentsAllowed || false,
                DiscordId: dicordId || '',
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

            }, { merge: true })

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
        const investor = body.investor;
        const communityAddress = body.communityAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.sellCommunityToken(investor, communityAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
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
        const investor = body.investor;
        const communityAddress = body.communityAddress;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.buyCommunityToken(investor, communityAddress, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
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
        const lpAddress = body.lpAddress;
        const communityAddress = body.communityAddress;
        const stakingToken = body.stakingToken;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await community.stakeCommunityFunds(lpAddress, communityAddress, stakingToken, date, txnId, apiKey);
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

exports.createBadge = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const name = body.name;
        const description = body.description;
        const totalSupply = body.totalSupply;
        const royalty = body.royalty;
        const txid = generateUniqueId();
        const blockchainRes = await badge.createBadge(creator, name, name, parseInt(totalSupply), parseFloat(royalty), Date.now(), 0, txid, 'PRIVI');

        if (blockchainRes && blockchainRes.success) {
            console.log('llega', creator);
            // updateFirebase(blockchainRes);
            /*await notificationsController.addNotification({
                userId: creatorId,
                notification: {
                    type: 45,
                    typeItemId: '',
                    itemId: '', //Liquidity pool id
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: 0,
                    onlyInformation: false,
                }
            });*/
            await db.runTransaction(async (transaction) => {

                // userData - no check if firestore insert works? TODO
                transaction.set(db.collection(collections.badges).doc(creator), {
                    creator: creator,
                    name: name,
                    description: description,
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
            console.log('Error in controllers/communitiesControllers -> createBadge(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (e) {
        return ('Error in controllers/communitiesControllers -> createBadge()' + e)
    }
}


exports.changeBadgePhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const badgeRef = db.collection(collections.badges)
                .doc(req.file.originalname);
            const badgeGet = await badgeRef.get();
            const badge: any = badgeGet.data();
            if (badge.hasPhoto) {
                await badgeRef.update({
                    hasPhoto: true
                });
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/communitiesController -> changeBadgePhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communitiesController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};

exports.getCommunities = async (req: express.Request, res: express.Response) => {
    try {
        const communities = await getCommunitiesArray();
        res.send({ success: true, data: communities });
    } catch (err) {
        console.log('Error in controllers/podController -> getMyPods()', err);
        res.send({ success: false });
    }
}

// function to get all NFT Pods
const getCommunitiesArray = exports.getNFTPods = (): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        const communities = await db.collection(collections.community).get();

        let array: any[] = [];
        communities.docs.map((doc, i) => {
            array.push(doc.data());
            if (communities.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
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
        const blockchainRes = await community.createVotation(creatorAddress, votationId, votationAddress, votingToken, parseFloat(quorumRequired), startDate, endingDate, 'PRIVI');

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
            const badgeRef = db.collection(collections.badges)
                .doc(req.file.originalname);
            const badgeGet = await badgeRef.get();
            const badge: any = badgeGet.data();
            if (badge.hasPhoto) {
                await badgeRef.update({
                    hasPhoto: true
                });
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/communitiesController -> changeBadgePhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communitiesController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};


