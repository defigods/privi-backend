import express, { response } from 'express';
import podFTProtocol from "../blockchain/podFTProtocol";
import podNFTProtocol from "../blockchain/podNFTProtocol";
import { updateFirebase, getRateOfChangeAsMap, createNotification, getUidNameMap, getEmailUidMap, generateUniqueId, getMarketPrice, getSellTokenAmountPod, getBuyTokenAmountPod } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const notificationsController = require('./notificationsController');

require('dotenv').config();
const apiKey = process.env.API_KEY;

/////////////////////////// COMMON //////////////////////////////

// auxiliar function used to update common fields of both NFT and FT pod (name, desc, hashtags..) 
async function updateCommonFields(body: any, podId: string, isPodFT: boolean) {
    const name = body.Name;
    const description = body.Description;
    const mainHashtag = body.MainHashtag; // recently added
    const hashtags = body.Hashtags;
    const isPrivate = body.Private;
    const hasPhoto = body.HasPhoto;
    const dicordId = body.DiscordID;  // recently added
    const endorsementScore = body.EndorsementScore;
    const trustScore = body.TrustScore;
    const admins = body.Admins;
    const requiredTokens = body.RequiredTokens; // {$Token: Amount} recently added (maybe handled by blockchain, thus don't need to add it again here)
    const advertising = body.Advertising;
    const ethereumAddr = body.EthereumContractAddress;


    let podRef = db.collection(collections.podsFT).doc(podId);
    if (!isPodFT) podRef = db.collection(collections.podsNFT).doc(podId);

    podRef.set({
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
        EthereumAddress: ethereumAddr || ''
    }, { merge: true })
}

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
            const inviterId: string = obj.inviterId;    // uid
            const isPodFT: boolean = obj.isPodFT;
            const podId: string = obj.podId;
            const invitedUser: string = obj.invitedUser;    // email
            const role: string = obj.role;

            const emailToUid = await getEmailUidMap();
            const adminSnap = await db.collection(collections.user).doc(inviterId).get();
            if (!adminSnap.exists) ok = false
            const invitedSnap = await db.collection(collections.user).doc(emailToUid[invitedUser]).get();
            if (!invitedSnap.exists) ok = false
            let podCol = collections.podsFT;
            if (!isPodFT) podCol = collections.podsNFT;
            const podSnap = await db.collection(podCol).doc(podId).get();
            // // check if inviterId is one of the admins of the pod
            // const podData = podSnap.data();
            // if (!podData || !podData.Admin || !podData.Admin.includes(inviterId)) ok = false;
            if (ok) {
                // save invitation in pod invitation colecction 
                const map = "RoleInvitation." + invitedUser;
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
                })
            }
        }
        if (ok) res.send({ success: true });
        else res.send({ success: false });
    } catch (err) {
        console.log('Error in controllers/podController -> inviteRole(): ', err);
        res.send({ success: false });
    }
}


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
        const invitationSnap = await db.collection(collections.user).doc(userId).collection(collections.podRoleInvitation).doc(invitationId).get();
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
                        const currRoleArray: string[] = podData.roles[invitationData.role];  // get current users (array) for this role
                        if (!currRoleArray.includes(userId)) currRoleArray.push(userId);    // add this new accepted user
                        const rolesMap = "roles." + invitationData.role;    // update
                        podSnap.ref.update({ rolesMap: currRoleArray });
                    }
                }
                // update user invitation (doc)  to replied
                invitationSnap.ref.update({ replied: true, accept: accept });
                // update pod invitation (doc) to replied
                db.collection(podCol).doc(podId).collection(collections.podRoleInvitation).doc(invitationId).update({ replied: true, accept: accept });
            }
        }
    } catch (err) {
        console.log('Error in controllers/podController -> inviteRole(): ', err);
        res.send({ success: false });
    }
}

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
        const userSnap = await db.collection(collections.user).doc(userId).get()
        if (userSnap.exists) {
            let url = "https://privibeta.web.app/#/FTPod/" + podId;
            if (!isPodFT) url = "https://privibeta.web.app/#/NFTPod/" + podId;
            userSnap.ref.collection(collections.podViewInvitation).add({
                inviter: inviterId,
                podId: podId,
                isPodFT: isPodFT,
                url: url,
                date: Date.now()
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
}

/**
 * Function used to change a pods photo, that is uploading the image file (name = podId) to the server's storage
 * @param req file, the file to upload to server's disk
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.changePodPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
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
                console.log(err)
                res.sendStatus(400);
            });
            raw.pipe(res);
        } else {
            console.log('Error in controllers/podController -> getPhotoId()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> changePodPhoto()', err);
        res.send({ success: false });
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
        const userSnap = await db.collection(collections.user)
            .doc(userId).get();
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        let followingPodsFieldName = "followingFTPods";
        let numFollowingPodsFieldName = "numFollowingFTPods";
        if (podType == "NFT") {
            followingPodsFieldName = "followingNFTPods";
            numFollowingPodsFieldName = "numFollowingNFTPods";
        }

        let followingPods: string[] = [];
        let numFollowingPods = 0;
        const userData = userSnap.data();

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
        const podData = podSnap.data();
        if (podData && podData.Followers) followerArray = podData.Followers;
        followerArray.push({
            date: Date.now(),
            id: userId
        })

        podSnap.ref.update({
            Followers: followerArray
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
        const userSnap = await db.collection(collections.user)
            .doc(userId).get();
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        let followingPodsFieldName = "followingFTPods";
        let numFollowingPodsFieldName = "numFollowingFTPods";
        if (podType == "NFT") {
            followingPodsFieldName = "followingNFTPods";
            numFollowingPodsFieldName = "numFollowingNFTPods";
        }

        let followingPods: string[] = [];
        let numFollowingPods = 0;
        const userData = userSnap.data();

        if (userData && userData[followingPodsFieldName]) followingPods = userData[followingPodsFieldName];
        if (userData && userData[numFollowingPodsFieldName]) numFollowingPods = userData[numFollowingPodsFieldName];
        followingPods = followingPods.filter((val, index, arr) => {
            return val !== podId;
        })
        numFollowingPods -= 1;

        const userUpdateObj = {};
        userUpdateObj[followingPodsFieldName] = followingPods;
        userUpdateObj[numFollowingPodsFieldName] = numFollowingPods;

        console.log(userUpdateObj);
        userSnap.ref.update(userUpdateObj);

        // update pod
        const podSnap = await db.collection(podRef).doc(podId).get();
        let followerArray: any[] = [];
        const podData = podSnap.data();
        if (podData && podData.Followers) followerArray = podData.Followers;
        followerArray = followerArray.filter((val, index, arr) => {
            return val.id && val.id !== userId;
        })

        podSnap.ref.update({
            Followers: followerArray
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
        const creator = body.Creator;
        const fundingToken = body.Token;
        const duration = body.Duration;
        const frequency = body.Frequency.toUpperCase();
        const principal = body.Principal;
        const interest = Number(body.Interest.toString()) / 100;
        const liquidationCCR = Number(body.P_liquidation.toString()) / 100;
        const collaterals = body.Collaterals;

        const address = "Px" + generateUniqueId();
        const amm = body.Amm.toUpperCase();;
        const spreadTarget = Number(body.TargetSpread.toString()) / 100;
        const spreadExchange = Number(body.ExchangeSpread.toString()) / 100;
        const tokenSymbol = body.TokenSymbol;
        const tokenName = body.TokenName;

        const date = body.StartDate;
        const expirationDate = body.ExpirationDate;
        const interestDue = body.InterestDue;

        const txnId = generateUniqueId();

        const rateOfChange = await getRateOfChangeAsMap();
        const blockchainRes = await podFTProtocol.initiatePOD(creator, address, amm, spreadTarget, spreadExchange, tokenSymbol, tokenName,
            fundingToken, duration, frequency, principal, interest, liquidationCCR, date, expirationDate, collaterals, rateOfChange, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            console.log(blockchainRes.output);
            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
            await updateFirebase(blockchainRes);  // update blockchain res
            await updateCommonFields(body, podId, true); // update common fields

            db.collection(collections.podsFT).doc(podId).set({ InterstDue: interestDue }, { merge: true });

            //     createNotification(creator, "FT Pod - Pod Created",
            //         ` `,
            //         notificationTypes.podCreation
            //     );

            //     // Create Pod Rate Doc
            //     const newPodRate = 0.01;
            //     db.collection(collections.rates).doc(podId).set({ type: "FTPod", rate: newPodRate });
            //     db.collection(collections.rates).doc(podId).collection(collections.rateHistory).add({
            //         rateUSD: newPodRate,
            //         timestamp: Date.now()
            //     });
            createNotification(creator, "FT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            const userSnap = await db.collection(collections.user).doc(creator).get();
            const userData: any = userSnap.data();
            await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 9,
                    itemId: podId,
                    follower: '',
                    pod: podId,
                    comment: '',
                    token: fundingToken,
                    amount: '',
                    onlyInformation: false,
                }
            });
            userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 39,
                        itemId: creator,
                        follower: creator,
                        pod: podId,
                        comment: '',
                        token: '',
                        amount: '',
                        onlyInformation: false,
                    }
                });
            });
            // Create Pod Rate Doc
            const newPodRate = 0.01;
            db.collection(collections.rates).doc(podId).set({ type: collections.ft, rate: newPodRate });
            db.collection(collections.rates).doc(podId).collection(collections.rateHistory).add({
                rateUSD: newPodRate,
                timestamp: Date.now()
            });

            // Add Pod Id into user myFTPods array
            const userRef = db.collection(collections.user)
                .doc(creator);
            const userGet = await userRef.get();
            const user: any = userGet.data();

            let myFTPods: any[] = user.myNFTPods || [];
            myFTPods.push(podId)

            await userRef.update({
                myFTPods: myFTPods
            });


            res.send({ success: true, data: podId });
        }
        else {
            console.log('Error in controllers/podController -> initiatePOD(): success = false.', blockchainRes.message);
            res.send({ success: false, error: blockchainRes.message });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> initiateFTPOD(): ', err);
        res.send({ success: false });
    }
};

exports.deleteFTPOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const podId = body.podId;
        const blockchainRes = await podFTProtocol.deletePod(publicId, podId);

        const podSnap = await db.collection(collections.PodsFT).doc(podId).get();
        const podData: any = podSnap.data();
        const userSnap = await db.collection(collections.user).doc(podData.Creator).get();
        const userData: any = userSnap.data();

        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(publicId, "FT Pod - Pod Deleted",
                ` `,
                notificationTypes.podDeletion
            );
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 10,
                    typeItemId: 'user',
                    itemId: podData.Creator,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });

            podData.Followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.id,
                    notification: {
                        type: 39,
                        typeItemId: 'user',
                        itemId: podData.Creator,
                        follower: podData.Creator,
                        pod: podData.Name,
                        comment: '',
                        token: '',
                        amount: '',
                        onlyInformation: false,
                    }
                });
            });
            userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 39,
                        typeItemId: 'user',
                        itemId: podData.Creator,
                        follower: podData.Creator,
                        pod: podData.Name,
                        comment: '',
                        token: '',
                        amount: '',
                        onlyInformation: false,
                    }
                });
            });
            res.send({ success: true });
        }
        else {
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
        const investorId = body.investorId;
        const podId = body.podId;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();
        const blockchainRes = await podFTProtocol.investPOD(investorId, podId, amount, date, txnId, apiKey);
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
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == podId || obj.To == podId) {
                    podSnap.ref.collection(collections.podTransactions).add(obj)
                }
            }
            // add to PriceOf the day 
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: fundingTokenPerPodToken,
                date: Date.now()
            })
            // add new investor entry
            let newInvestors = {};
            if (data.Investors) newInvestors = data.Investors;

            if (newInvestors[investorId]) newInvestors[investorId] += amount;
            else newInvestors[investorId] = amount;
            podSnap.ref.update({ Investors: newInvestors });

            createNotification(investorId, "FT Pod - Pod Invested",
                ` `,
                notificationTypes.podInvestment
            );
            const podData: any = podSnap.data();
            const investorSnap = await db.collection(collections.user).doc(investorId).get();
            const investorData: any = investorSnap.data();
            await notificationsController.addNotification({
                userId: investorId,
                notification: {
                    type: 11,
                    typeItemId: 'user',
                    itemId: podId,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 12,
                    typeItemId: 'user',
                    itemId: investorId,
                    follower: investorData.name,
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                }
            });
            if (podData.Followers) {
                podData.Followers.forEach(async (item, i) => {
                    await notificationsController.addNotification({
                        userId: item.id,
                        notification: {
                            type: 42,
                            typeItemId: 'user',
                            itemId: investorId,
                            follower: investorData.name,
                            pod: podData.Name,
                            comment: '',
                            token: '',
                            amount: amount,
                            onlyInformation: false,
                        }
                    });
                });
            }
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> investPOD(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> investPOD(): ', err);
        res.send({ success: false });
    }
};

exports.sellFTPOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investorId = body.investorId;
        const podId = body.podId;
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();
        const blockchainRes = await podFTProtocol.sellPOD(investorId, podId, amount, date, txnId, apiKey);
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
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == podId || obj.To == podId) podSnap.ref.collection(collections.podTransactions).add(obj)
            }
            // add to PriceOf the day
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: fundingTokenPerPodToken,
                date: Date.now()
            })
            // delete investor entry
            let newInvestors = {};
            if (data.Investors) newInvestors = data.Investors;

            if (newInvestors[investorId]) {
                newInvestors[investorId] -= amount;
                if (newInvestors[investorId] <= 0) delete newInvestors[investorId];
            }
            podSnap.ref.update({ Investors: newInvestors });

            createNotification(investorId, "FT Pod - Pod Token Sold",
                ` `,
                notificationTypes.podInvestment
            );
            res.send({ success: true });
        }
        else {
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
            createNotification(investorId, "FT Pod - Pod Swapped",
                ` `,
                notificationTypes.podSwapGive
            );
            const podSnap = await db.collection(collections.PodsFT).doc(podId).get();
            const podData: any = podSnap.data();
            const investorSnap = await db.collection(collections.user).doc(investorId).get();
            const investorData: any = investorSnap.data();
            await notificationsController.addNotification({
                userId: investorId,
                notification: {
                    type: 14,
                    typeItemId: 'user',
                    itemId: podId,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: 0,
                    amount: amount,
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 13,
                    typeItemId: 'user',
                    itemId: investorId,
                    follower: investorData.name,
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                }
            });
            if (podData.Investors && podData.size !== 0) {
                let investorsId: any[] = [...podData.Investors.keys()];
                investorsId.forEach(async (item, i) => {
                    await notificationsController.addNotification({
                        userId: item,
                        notification: {
                            type: 16,
                            typeItemId: 'user',
                            itemId: podId,
                            follower: investorData.name,
                            pod: podData.Name,
                            comment: '',
                            token: '',
                            amount: amount,
                            onlyInformation: false,
                        }
                    });
                })
            }
            investorData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 15,
                        typeItemId: 'user',
                        itemId: podId,
                        follower: investorData.name,
                        pod: podData.Name,
                        comment: '',
                        token: '',
                        amount: amount,
                        onlyInformation: false,
                    }
                });
            });

            res.send({ success: true });
        }
        else {
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
        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allFTPods: any[] = await getFTPods();

        let myFTPods: any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        res.send({ success: true, data: myFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getMyPods()', err);
        res.send({ success: false });
    }
};

const getAllInfoMyPods = exports.getAllInfoMyPods = (allItemArray, myArray): Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {
        let array: any[] = [];
        if (myArray && myArray.length > 0) {
            myArray.forEach((item, i) => {
                let foundItem = allItemArray.find(allItem => allItem.id === item);
                if (foundItem)
                    array.push(foundItem);

                if (myArray.length === i + 1) {
                    resolve(array);
                }
            });
        } else {
            resolve([]);
        }
    });
};

exports.getTrendingPodsFT = async (req: express.Request, res: express.Response) => {
    try {
        let allFTPods: any[] = await getFTPods();

        let trendingFTPods: any[] = await countLastWeekPods(allFTPods);

        res.send({ success: true, data: trendingFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getTrendingPods()', err);
        res.send({ success: false });
    }
};

// filtering the top 10 pods with most followers
const countLastWeekPods = (allPodsArray): Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {

        let lastWeek = new Date();
        let pastDate = lastWeek.getDate() - 7;
        lastWeek.setDate(pastDate);

        if (allPodsArray && allPodsArray.length > 0) {
            allPodsArray.forEach((item, i) => {
                if (item.Followers && item.Followers.length > 0) {
                    let lastWeekFollowers = item.Followers.filter(follower => follower.date._seconds > lastWeek.getTime() / 1000);
                    item.lastWeekFollowers = lastWeekFollowers.length;
                } else {
                    item.lastWeekFollowers = 0;
                }
                if (allPodsArray.length === i + 1) {
                    let sortedArray = allPodsArray.sort((a, b) => (a.lastWeekFollowers > b.lastWeekFollowers) ? 1 : ((b.lastWeekFollowers > a.lastWeekFollowers) ? -1 : 0));
                    let trendingArray = sortedArray.slice(0, 10);
                    resolve(trendingArray);
                }
            })
        } else {
            resolve([]);
        }
    })
};


exports.getOtherPodsFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allFTPods: any[] = await getFTPods();

        let myFTPods: any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        let otherFTPods: any[] = await removeSomePodsFromArray(allFTPods, myFTPods);

        res.send({ success: true, data: otherFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};

exports.getAllFTPodsInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();


        let allFTPods = await getFTPods();

        let trendingFTPods = await countLastWeekPods(allFTPods);

        let myFTPods = await getAllInfoMyPods(allFTPods, user.myFTPods);

        let otherFTPods = await removeSomePodsFromArray(allFTPods, myFTPods);

        res.send({
            success: true, data: {
                myFTPods: myFTPods ?? [],
                otherFTPods: otherFTPods ?? [],
                trendingFTPods: trendingFTPods ?? []
            }
        });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};


const removeSomePodsFromArray = (fullArray, arrayToRemove): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {

        if (arrayToRemove && arrayToRemove.length !== 0) {
            arrayToRemove.forEach((item, i) => {
                let index = fullArray.findIndex(itemFullArray => itemFullArray.id === item.id)

                if (index && index === -1) {
                    fullArray = fullArray.slice(index, 1);
                }

                if (arrayToRemove.length === i + 1) {
                    resolve(fullArray)
                }
            });
        } else {
            resolve(fullArray)
        }
    });
};

const getFTPods = exports.getFTPods = (): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        const podsFT = await db.collection(collections.podsFT).get();

        let array: any[] = [];
        podsFT.docs.map((doc, i) => {
            array.push(doc.data());
            if (podsFT.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
}


exports.getFTPod = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        console.log(podId);
        if (podId) {
            const podRef = db.collection(collections.podsFT)
                .doc(podId);
            const podGet = await podRef.get();
            const pod: any = podGet.data();

            // also send back pod rate and PC rate
            const val = 0.01; // val by default
            pod.rates = {};
            pod.rates[pod.FundingToken] = val;
            pod.rates[podId] = val;
            const rateSnap = await db.collection(collections.rates).get();
            rateSnap.forEach((doc) => {
                if (doc.id == pod.FundingToken || doc.id == podId) { // only need these two
                    const rate = doc.data().rate;
                    pod.rates[doc.id] = rate;
                }
            });

            res.send({ success: true, data: pod })
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
        if (podId) {
            const uidNameMap = await getUidNameMap();
            const podTxnSnapshot = await db.collection(collections.podsFT).doc(podId).collection(collections.podTransactions).get();
            podTxnSnapshot.forEach((doc) => {
                const data = doc.data();
                const txn = data;
                let from = data.from;
                let to = data.to;
                // find name of "from" and "to"
                if (uidNameMap[from]) from = uidNameMap[from];
                if (uidNameMap[to]) to = uidNameMap[to];
                txn.from = from;
                txn.to = to;
                txns.push(txn);
            });
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

// get price history and today prices, merged and sorted (by ascending date)
exports.getFTPodPriceHistory = async (req: express.Request, res: express.Response) => {
    try {
        // comparator function used to sort by ascending date
        const comparator = (a, b) => {
            if (a.date > b.date) return 1;
            if (b.date > a.date) return -1;
            return 0;
        }
        let podId = req.params.podId;
        const data: any[] = [];
        if (podId) {
            const priceHistorySnap = await db.collection(collections.podsFT).doc(podId).collection(collections.priceHistory).get();
            priceHistorySnap.forEach((doc) => {
                data.push(doc.data());
            });
            const todayPriceSnap = await db.collection(collections.podsFT).doc(podId).collection(collections.priceOfTheDay).get();
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
        }
        let podId = req.params.podId;
        const data: any[] = [];
        if (podId) {
            const priceHistorySnap = await db.collection(collections.podsFT).doc(podId).collection(collections.supplyHistory).get();
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
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allNFTPods: any[] = await getNFTPods();

        let trendingNFTPods: any[] = await countLastWeekPods(allNFTPods);

        let myNFTPods: any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        let otherNFTPods: any[] = await removeSomePodsFromArray(allNFTPods, myNFTPods);

        res.send({
            success: true, data: {
                myNFTPods: myNFTPods ?? [],
                otherNFTPods: otherNFTPods ?? [],
                trendingNFTPods: trendingNFTPods ?? []
            }
        });

    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};

exports.getMyPodsNFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allNFTPods: any[] = await getNFTPods();

        let myNFTPods: any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        res.send({ success: true, data: myNFTPods });
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

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allNFTPods: any[] = await getNFTPods();

        let myNFTPods: any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        let otherNFTPods: any[] = await removeSomePodsFromArray(allNFTPods, myNFTPods);

        res.send({ success: true, data: otherNFTPods });
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
        let allNFTPods: any[] = await getNFTPods();
        let trendingNFTPods: any[] = await countLastWeekPods(allNFTPods);
        res.send({ success: true, data: trendingNFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getTrendingPods()', err);
        res.send({ success: false });
    }
};

// function to get all NFT Pods
const getNFTPods = exports.getNFTPods = (): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        const podsNFT = await db.collection(collections.podsNFT).get();

        let array: any[] = [];
        podsNFT.docs.map((doc, i) => {
            array.push(doc.data());
            if (podsNFT.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
}


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
            res.send({
                success: true, data: {
                    pod: podSnap.data(),
                    sellingOffers: sellingOffers,
                    buyingOffers: buyingOffers
                }
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
        const royalty = body.Royalty ?? 0;
        const startDate = body.StartDate;
        const expirationDate = body.ExpirationDate;

        const isDigital: boolean = body.IsDigital;
        const name = body.Name;

        const podAddress = generateUniqueId();
        const claimingAddress = generateUniqueId();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.initiatePodNFT(creator, podAddress, claimingAddress, tokenSymbol, tokenName, supply, royalty, startDate, expirationDate, tid, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);   // update blockchain res

            updateCommonFields(body, podAddress, false); // update common fields
            const podDocRef = db.collection(collections.podsNFT).doc(podAddress);

            // Update fields that only NFT Pods have
            podDocRef.set({ IsDigital: isDigital }, { merge: true });

            // TODO: set correct notification type
            createNotification(creator, "NFT Pod - Pod Created",
                ` `,
                notificationTypes.nftPodCreation
            );

            const userSnap = await db.collection(collections.user).doc(creator).get();
            const userData: any = userSnap.data();
            await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 9,
                    typeItemId: 'user',
                    itemId: podAddress,
                    follower: '',
                    pod: name,
                    comment: '',
                    token: tokenSymbol,
                    amount: '',
                    onlyInformation: false,
                }
            });
            userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 39,
                        typeItemId: 'user',
                        itemId: creator,
                        follower: creator,
                        pod: name,
                        comment: '',
                        token: '',
                        amount: '',
                        onlyInformation: false,
                    }
                });
            });
            res.send({ data: podAddress, success: true });
        }
        else {
            console.log('Error in controllers/podController -> initiateNFTPod(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> initiateNFTPod(): ', err);
        res.send({ success: false });
    }
}


/**
 * Blockchain-Backend function, a user request a buy offer specifying the conditions
 * if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, amount, price}. trader: buyer
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.newBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const buyerAddress = body.buyerAddress;
        const podAddress = body.podAddress;
        const amount = body.amount;
        const price = body.price;
        const token = body.token;

        const orderId = generateUniqueId();
        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.newBuyOrder(orderId, amount, price, token, podAddress, buyerAddress, date, tid, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(buyerAddress, "NFT Pod - Pod Buy Offer Crated",
                ` `,
                notificationTypes.nftPodBuyOffer
            );
            console.log(blockchainRes.output)
            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
            const podData: any = podSnap.data();
            await notificationsController.addNotification({
                userId: buyerAddress,
                notification: {
                    type: 17,
                    typeItemId: 'user',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 18,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> newBuyOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> newBuyOrder(): ', err);
        res.send({ success: false });
    }
}

/**
 * Blockchain-Backend function, a user who must hold some pod token, post a selling offer specifying the conditions (price, amount)
 * if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, amount, price}. trader: buyer
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.newSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const sellerAddress = body.sellerAddress;
        const podAddress = body.podAddress;
        const amount = body.amount;
        const price = body.price;
        const token = body.token;

        const orderId = generateUniqueId();
        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.newSellOrder(orderId, amount, price, token, podAddress, sellerAddress, date, tid, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(sellerAddress, "NFT Pod - Pod Sell Offer Crated",
                ` `,
                notificationTypes.nftPodSellOffer
            );
            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
            const podData: any = podSnap.data();
            await notificationsController.addNotification({
                userId: sellerAddress,
                notification: {
                    type: 19,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 20,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> newSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> newSellOrder(): ', err);
        res.send({ success: false });
    }
}

/**
 * Blockchain-Backend function, the buy offer creator deletes the offer, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}.
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.deleteBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const requesterAddress = body.requesterAddress;
        const podAddress = body.podAddress;
        const orderId = body.orderId;

        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.deleteBuyOrder(orderId, requesterAddress, podAddress, date, tid, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(requesterAddress, "NFT Pod - Pod Buy Offer Deleted",
                ` `,
                notificationTypes.nftPodBuyOfferDelete
            );
            // manually delete order
            db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId).delete();

            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
            const podData: any = podSnap.data();
            await notificationsController.addNotification({
                userId: requesterAddress,
                notification: {
                    type: 21,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
                notification: {
                    type: 22,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> deleteBuyOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteBuyOrder(): ', err);
        res.send({ success: false });
    }
}

/**
 * Blockchain-Backend function used to buy an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}.
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.deleteSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const requesterAddress = body.requesterAddress;
        const podAddress = body.podAddress;
        const orderId = body.orderId;

        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.deleteSellOrder(orderId, requesterAddress, podAddress, date, tid, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(requesterAddress, "NFT Pod - Pod Sell Offer Deleted",
                ` `,
                notificationTypes.nftPodSellOfferDelete
            );
            // manually delete order
            db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId).delete();

            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();
            const podData: any = podSnap.data();
            await notificationsController.addNotification({
                userId: requesterAddress,
                notification: {
                    type: 23,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: podData.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            await notificationsController.addNotification({
                userId: podData.Creator,
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
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
        res.send({ success: false });
    }
}

/**
 * Blockchain-Backend function used to sell an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}. trader: the user that sells the pod token
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.sellPodTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const buyerAddress = body.buyerAddress;
        const sellerAddress = body.sellerAddress;
        const amount = body.amount;
        const podAddress = body.podAddress;
        const orderId = body.orderId;

        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.sellPodTokens(podAddress, buyerAddress, orderId, amount, sellerAddress, tid, date, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();

            let price = 0;
            const data: any = podSnap.data();
            const orderSnap = await db.collection(collections.podsNFT).doc(podAddress).collection(collections.buyingOffers).doc(orderId).get();
            if (orderSnap.exists) {
                const data: any = orderSnap.data();
                price = data.Price;
            }
            // add txn to pod
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == podAddress || obj.To == podAddress) {
                    podSnap.ref.collection(collections.podTransactions).add(obj)
                }
            }
            // add to PriceOf the day 
            if (price) {
                podSnap.ref.collection(collections.priceOfTheDay).add({
                    price: price,
                    date: Date.now()
                })
            }

            createNotification(sellerAddress, "NFT Pod - Pod Token Sold",
                ` `,
                notificationTypes.nftPodSelling
            );
            await notificationsController.addNotification({
                userId: sellerAddress,
                notification: {
                    type: 25,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: data.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
        res.send({ success: false });
    }
}

/**
 * Blockchain-Backend function used to buy an offer of a NFT pod, and if the operation is performed (success = true) then update firebase accordingly
 * @param req {podId, trader, orderId, amount}. trader: the user that buys the pod token
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.buyPodTokens = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const buyerAddress = body.buyerAddress;
        const sellerAddress = body.sellerAddress;
        const amount = body.amount;
        const podAddress = body.podAddress;
        const orderId = body.orderId;
        console.log(body);
        const date = Date.now();
        const tid = generateUniqueId();
        const blockchainRes = await podNFTProtocol.buyPodTokens(podAddress, sellerAddress, orderId, amount, buyerAddress, tid, date, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            const podSnap = await db.collection(collections.podsNFT).doc(podAddress).get();

            let price = 0;
            const data: any = podSnap.data();
            const orderSnap = await db.collection(collections.podsNFT).doc(podAddress).collection(collections.sellingOffers).doc(orderId).get();
            if (orderSnap.exists) {
                const data: any = orderSnap.data();
                price = data.Price;
            }
            // add txn to pod
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == podAddress || obj.To == podAddress) {
                    podSnap.ref.collection(collections.podTransactions).add(obj)
                }
            }
            // add to PriceOf the day 
            if (price) {
                podSnap.ref.collection(collections.priceOfTheDay).add({
                    price: price,
                    date: Date.now()
                })
            }

            // TODO: set correct notification type
            createNotification(buyerAddress, "NFT Pod - Pod Token Bought",
                ` `,
                notificationTypes.nftPodBuying
            );
            await notificationsController.addNotification({
                userId: buyerAddress,
                notification: {
                    type: 26,
                    typeItemId: 'NFTPod',
                    itemId: podAddress,
                    follower: '',
                    pod: data.Name,
                    comment: '',
                    token: '',
                    amount: '',
                    onlyInformation: false,
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> buyPodTokens(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> buyPodTokens(): ', err);
        res.send({ success: false });
    }
}

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
            const podTxnSnapshot = await db.collection(collections.podsNFT).doc(podId).collection(collections.podTransactions).get();
            podTxnSnapshot.forEach((doc) => {
                txns.push(doc.data());
            });
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
        }

        let podId = req.params.podId;
        if (podId) {
            // price history
            const priceHistory: any[] = [];
            const priceHistorySnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceHistory).get();
            priceHistorySnap.forEach((doc) => {
                priceHistory.push(doc.data());
            });
            const todayPriceSnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceOfTheDay).get();
            todayPriceSnap.forEach((doc) => {
                priceHistory.push(doc.data());
            });
            priceHistory.sort(comparator);
            // supply history
            const supplyHistory: any[] = [];
            const supplyHistorySnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.supplyHistory).get();
            supplyHistorySnap.forEach((doc) => {
                supplyHistory.push(doc.data());
            });
            supplyHistory.sort(comparator);

            res.send({
                success: true, data: {
                    priceHistory: priceHistory,
                    supplyHistory: supplyHistory
                }
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
        console.log("********* Pod managePriceHistory() cron job started *********");
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
                    date: date
                });
                // add to supply history
                pod.ref.collection(collections.supplyHistory).add({
                    supply: supplyReleased,
                    date: date
                });
            }
            // reset (empty) PriceOfTheDay
            const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get();
            priceOfTheDaySnap.forEach((doc) => doc.ref.delete());
        })
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
                const priceHistorySnap = await pod.ref.collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
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
                    date: date
                }
                );
            }
            // reset (empty) PriceOfTheDay
            const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get()
            priceOfTheDaySnap.forEach((doc) => doc.ref.delete());

            // --- add to supply history ---
            const podData = pod.data();
            const supply = podData.Supply ?? 0;
            pod.ref.collection(collections.supplyHistory).add({
                supply: supply,
                date: date
            });
        });
        console.log("--------- Pod managePriceHistory() finished ---------");
    } catch (err) {
        console.log('Error in controllers/podController -> managePriceHistory()', err);
    }
});
