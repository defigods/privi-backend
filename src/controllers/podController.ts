import express, { response } from 'express';
import podProtocol from "../blockchain/podProtocol";
import nftPodProtocol from "../blockchain/nftPodProtocol";
import { updateFirebase, getRateOfChange, createNotification, getUidNameMap, getEmailUidMap } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db, firebase } from "../firebase/firebase";
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

/////////////////////////// COMMON //////////////////////////////

// auxiliar function used to update common fields of both NFT and FT pod (name, desc, hashtags..) 
async function updateCommonFields(body: any, podId: string, isPodFT: boolean) {
    const name = body.Name;
    const description = body.Description;
    const mainHashtag = body.MainHashtag; // recently added
    const hashtags = body.Hashtags;
    const isPrivate = body.Private;
    const hasPhoto = body.HasPhoto;
    const endorsementScore = body.EndorsementScore;
    const trustScore = body.TrustScore;
    const admins = body.Admins;
    const isOpenToAdvertisement = body.IsOpenToAdvertisement; // recently added
    const dicordChannel = body.DiscordChannel;  // recently added
    const requiredTokens = body.RequiredTokens; // {$Token: Amount} recently added (maybe handled by blockchain, thus don't need to add it again here)


    let podRef = db.collection(collections.podsFT).doc(podId);
    if (!isPodFT) podRef = db.collection(collections.podsNFT).doc(podId);

    podRef.update({
        Name: name || '',
        Description: description || '',
        MainHashtag: mainHashtag || '',
        Hashtags: hashtags || [],
        Private: isPrivate || false,
        HasPhoto: hasPhoto || false,
        EndorsementScore: endorsementScore || 0.5,
        TrustScore: trustScore || 0.5,
        Admins: admins || [],
        IsOpenToAdvertisement: isOpenToAdvertisement || false,
        DiscordChannel: dicordChannel || '',
        requiredTokens: requiredTokens || {}
    })
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

        const userRef = db.collection(collections.user)
            .doc(userId);
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        const followerObj = {
            date: Date.now(),
            id: userId
        }
        // update user
        userRef.update({
            followingFTPods: firebase.firestore.FieldValue.arrayUnion(podId),
            numFollowingFTPods: firebase.firestore.FieldValue.increment(1)
        });
        // update pod
        db.collection(podRef).doc(podId).update({
            Followers: firebase.firestore.FieldValue.arrayUnion(followerObj)
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

        const userRef = db.collection(collections.user)
            .doc(userId);
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        // update user
        userRef.update({
            followingFTPods: firebase.firestore.FieldValue.arrayRemove(podId),
            numFollowingFTPods: firebase.firestore.FieldValue.increment(-1)
        });
        // update pod
        const mewFollowerField: any[] = [];
        const podsSnap = await db.collection(podRef).get();
        podsSnap.forEach((doc) => {
            const data = doc.data();
            const followers = data.Followers;
            if (followers) {
                followers.forEach((follower) => {
                    if (follower.id && follower.id != userId) mewFollowerField.push(follower);
                })
            }
        })
        db.collection(podRef).doc(podId).update({
            Followers: mewFollowerField
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
        console.log(req.body);
        const body = req.body;
        const creator = body.Creator;
        const token = body.Token;
        const duration = body.Duration;
        const payments = body.Payments;
        const principal = body.Principal;
        const interest = body.Interest;
        const p_liquidation = body.P_liquidation;
        const initialSupply = body.InitialSupply;
        const collaterals = body.Collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.initiatePOD(creator, token, duration, payments, principal, interest, p_liquidation, initialSupply, collaterals, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);  // update blockchain res

            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
            updateCommonFields(body, podId, true); // update common fields

            createNotification(creator, "FT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            // Create Pod Rate Doc
            const newPodRate = 0.01;
            db.collection(collections.rates).doc(podId).set({ type: "FTPod", rate: newPodRate });
            db.collection(collections.rates).doc(podId).collection(collections.rateHistory).add({
                rateUSD: newPodRate,
                timestamp: Date.now()
            });

            // Add Pod Id into user myFTPods array
            if (blockchainRes.output.UpdatePods[0] && blockchainRes.output.UpdatePods[0].Creator) {
                const userRef = db.collection(collections.user)
                    .doc(blockchainRes.output.UpdatePods[0].Creator);
                const userGet = await userRef.get();
                const user: any = userGet.data();

                let myFTPods: any[] = user.myNFTPods || [];
                myFTPods.push(podId)

                await userRef.update({
                    myFTPods: myFTPods
                });
            }

            res.send({ success: true, data: podId });
        }
        else {
            console.log('Error in controllers/podController -> initiatePOD(): success = false.', blockchainRes.message);
            res.send({ success: false, error: blockchainRes.message });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> initiatePOD(): ', err);
        res.send({ success: false });
    }
};

exports.deleteFTPOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const podId = body.podId;
        const blockchainRes = await podProtocol.deletePod(publicId, podId);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(publicId, "FT Pod - Pod Deleted",
                ` `,
                notificationTypes.podDeletion
            );
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
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.investPOD(investorId, podId, amount, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add pod transaction (get price from blockchainRes)
            let price = 0;
            let token = "unknown";
            const output = blockchainRes.output;
            const updateWallets = output.UpdateWallets;
            const transactions = updateWallets[investorId].Transaction;
            transactions.forEach(tx => {
                if (tx.From == investorId) {
                    price = tx.Amount;
                    token = tx.Token;
                }
            });
            db.collection(collections.podsFT).doc(podId).collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token,
                from: investorId,
                to: "Pod Pool",
                date: Date.now(),
                guarantor: "None"
            })
            // add to PriceOf the day 
            db.collection(collections.podsFT).doc(podId).collection(collections.priceOfTheDay).add({
                price: price,
                date: Date.now()
            })
            createNotification(investorId, "FT Pod - Pod Invested",
                ` `,
                notificationTypes.podInvestment
            );
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

exports.swapFTPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investorId = body.investorId;
        const liquidityPoolId = body.liquidityPoolId;
        const podId = body.podId;
        const amount = body.amount;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.swapPOD(investorId, liquidityPoolId, podId, amount, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            console.log(blockchainRes);
            createNotification(investorId, "FT Pod - Pod Swapped",
                ` `,
                notificationTypes.podSwapGive
            );
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

const getAllInfoMyPods = (allItemArray, myArray): Promise<any[]> => {
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
        let userId = req.params.userId;
        let allFTPods: any[] = await getFTPods();

        let trendingFTPods: any[] = await countLastWeekPods(allFTPods);

        res.send({ success: true, data: trendingFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getTrendingPods()', err);
        res.send({ success: false });
    }
};

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

        let allFTPods: any[] = await getFTPods();

        let trendingFTPods: any[] = await countLastWeekPods(allFTPods);

        let myFTPods: any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        let otherFTPods: any[] = await removeSomePodsFromArray(allFTPods, myFTPods);

        res.send({
            success: true, data: {
                myFTPods: myFTPods,
                otherFTPods: otherFTPods,
                trendingFTPods: trendingFTPods
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
}
    ;

const getFTPods = (): Promise<any[]> => {
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
            pod.rates.PC = val;
            pod.rates[podId] = val;
            const rateSnap = await db.collection(collections.rates).get();
            rateSnap.forEach((doc) => {
                if (doc.id == "PC" || doc.id == podId) { // only need these two
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

// get price from history and today price colections, merge, sort (by ascending date) and return this data
exports.getFTPodPriceHistory = async (req: express.Request, res: express.Response) => {
    try {
        // comparator function used to sort by ascending date
        const comparator = (a, b) => {
            if (a.date > b.date) return 1;
            if (b.date > a.date) return -1;
            return 0;
        }
        let podId = req.params.podId;
        console.log("getPriceHisotry", podId);
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
                myNFTPods: myNFTPods,
                otherNFTPods: otherNFTPods,
                trendingNFTPods: trendingNFTPods
            }
        });
        res.send({
            success: true, data: {
                myNFTPods: [],
                otherNFTPods: [],
                trendingNFTPods: []
            }
        });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
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
const getNFTPods = (): Promise<any[]> => {
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
            const podRef = db.collection(collections.podsNFT)
                .doc(podId);
            const podGet = await podRef.get();
            const pod: any = podGet.data();
            res.send({ success: true, data: pod })
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
        const token = body.Token;
        const royalty = body.Royalty;
        const offers = body.Offers;
        const isDigital: boolean = body.IsDigital; // recently added
        const royaltyFee = body.RoyaltyFee; // recently added
        const redeemable = body.Redeemable; // recently added
        const blockchainRes = await nftPodProtocol.initiatePodNFT(creator, token, royalty, offers);
        console.log(blockchainRes);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);   // update blockchain res
            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
            updateCommonFields(body, podId, false); // update common fields
            const podDocRef = db.collection(collections.podsNFT).doc(podId);
            // Royalty Fee only when its a digital NFT
            if (isDigital) podDocRef.update({ RoyaltyFee: royaltyFee });
            // Update Fields that only NFT Pods have
            podDocRef.update({ IsDigital: isDigital, Redeemable: redeemable });

            // TODO: set correct notification type
            createNotification(creator, "NFT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
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
        const trader = body.trader;
        const podId = body.podId;
        const amount = body.amount;
        const price = body.price;
        const blockchainRes = await nftPodProtocol.newBuyOrder(podId, trader, amount, price);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Buy Offer Crated",
                ` `,
                notificationTypes.podCreation
            );
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
        const trader = body.trader;
        const podId = body.podId;
        const amount = body.amount;
        const price = body.price;
        const blockchainRes = await nftPodProtocol.newSellOrder(podId, trader, amount, price);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Sell Offer Crated",
                ` `,
                notificationTypes.podCreation
            );
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
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const blockchainRes = await nftPodProtocol.deleteBuyOrder(podId, orderId, trader);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Buy Offer Deleted",
                ` `,
                notificationTypes.podCreation
            );
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
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const blockchainRes = await nftPodProtocol.deleteSellOrder(podId, orderId, trader);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Sell Offer Deleted",
                ` `,
                notificationTypes.podCreation
            );
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
exports.sellPodNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const amount = body.amount;
        const blockchainRes = await nftPodProtocol.sellPodNFT(podId, trader, orderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add pod transaction
            let buyer = "unknown";
            let price = 0;
            let token = "unknown";
            const podSnap = await db.collection(collections.podsNFT).doc(podId).get();
            const data = podSnap.data();
            if (data && data.OrderBook && data.OrderBook.Buy && data.OrderBook.Buy[orderId]) {
                buyer = data.OrderBook.Buy[orderId].Trader;
                price = data.OrderBook.Buy[orderId].Price;
                token = data.Token;
            }
            db.collection(collections.podsNFT).doc(podId).collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token,
                from: trader,
                to: buyer,
                date: Date.now(),
                guarantor: "None"
            })
            // add to PriceOf the day 
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: price,
                date: Date.now()
            })

            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Token Sold",
                ` `,
                notificationTypes.podCreation
            );
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
exports.buyPodNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const amount = body.amount;
        const blockchainRes = await nftPodProtocol.buyPodNFT(podId, trader, orderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add pod transaction
            let seller = "unknown";
            let price = 0;
            let token = "unknown";
            const podSnap = await db.collection(collections.podsNFT).doc(podId).get();
            const data = podSnap.data();
            if (data && data.OrderBook && data.OrderBook.Sell && data.OrderBook.Sell[orderId]) {
                seller = data.OrderBook.Sell[orderId].Trader;
                price = data.OrderBook.Sell[orderId].Price;
                token = data.Token;
            }
            podSnap.ref.collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token,
                from: seller,
                to: trader,
                date: Date.now(),
                guarantor: "none"
            })
            // add to PriceOf the day 
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: price,
                date: Date.now()
            })

            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Token Bought",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> buyPodNFT(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> buyPodNFT(): ', err);
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
            const uidNameMap = await getUidNameMap();
            const podTxnSnapshot = await db.collection(collections.podsNFT).doc(podId).collection(collections.podTransactions).get();
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


/**
 * Function to get price from history and today price colections, merge, sort (by ascending date) and return this data
 * @param req {podId}. podId: identifier of the pod
 * @param res {success, data}. success: boolean that indicates if the opreaction is performed. data: price history array
 */
exports.getNFTPodPriceHistory = async (req: express.Request, res: express.Response) => {
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
            const priceHistorySnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceHistory).get();
            priceHistorySnap.forEach((doc) => {
                data.push(doc.data());
            });
            const todayPriceSnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceOfTheDay).get();
            todayPriceSnap.forEach((doc) => {
                data.push(doc.data());
            });
            // sort data by ascending date
            data.sort(comparator);
            res.send({ success: true, data: data });
        } else {
            console.log('Error in controllers/podController -> getNFTPodTransactions()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getNFTPodTransactions()', err);
        res.send({ success: false });
    }
};


/////////////////////////// COMMON //////////////////////////////

/**
 * Pod creator/admin invites some user to assume some role of the pod
 * @param req {admin, podType, podId, invitedUser, role}. podType in ["NF", "NFT"], admin and invitedUser are emails
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.inviteRole = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const admin: string = body.admin;
        const podType: string = body.podType;
        const podId: string = body.podId;
        const invitedUser: string = body.invitedUser;
        const role: string = body.role;
        let ok: boolean = true;
        const emailToUid = await getEmailUidMap();
        const adminSnap = await db.collection(collections.user).doc(emailToUid[admin]).get();
        if (!adminSnap.exists) ok = false
        const invitedSnap = await db.collection(collections.user).doc(emailToUid[invitedUser]).get();
        if (!invitedSnap.exists) ok = false
        if (!["NFT, FT"].includes(podType)) ok = false
        let podSnap;
        if (podType == "FT") {
            podSnap = await db.collection(collections.podsFT).doc(podId).get();
        } else {
            podSnap = await db.collection(collections.podsNFT).doc(podId).get();
        }
        if (ok) {
            // check if adminId is one of the admins of the pod
            const podData = podSnap.data();
            if (podData)



                res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> inviteRole()');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> inviteRole(): ', err);
        res.send({ success: false });
    }
}

/////////////////////////// CRON JOBS //////////////////////////////

/** 
 * Cron to daily update the PodDay field when the pod is in 'Initiated' Status
*/
exports.updatePodDay = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Pod updatePodDay() cron job started *********");
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach(async (pod) => {
            const data = pod.data();
            // only update Initiated pods
            if (data && data.State && data.State.Status == 'INITIATED') {
                let podDay = data.State.Pod_Day;
                podDay += 1;
                pod.ref.update({ "State.POD_Day": podDay });
            }
        })
    } catch (err) {
        console.log('Error in controllers/podController -> updatePodDay()', err);
    }
});


// helper function: calculate if deposited collateral is below required ccr level
function isPodCollateralBellowLiquidation(amount: number, token: string, requiredLevel: number, collaterals: { [key: string]: number }, ratesOfChange: { [key: string]: number }) {
    if (!requiredLevel || !collaterals || !ratesOfChange) return false;
    let sum: number = 0; // collateral sum in USD
    amount = amount * ratesOfChange[token];   // amount in USD
    for (const [token, colValue] of Object.entries(collaterals)) {
        let conversionRate = ratesOfChange[token];
        if (!conversionRate) conversionRate = 1;
        sum += colValue * conversionRate;
    }
    return (sum / amount < requiredLevel);
}

// helper function: get array of object of tokens whice values are list of uids of users that have loan with ccr lower than required level
async function getPodList() {
    const res: string[] = [];
    const rateOfChange = await getRateOfChange();
    const podsSnap = await db.collection(collections.podsFT).get();
    podsSnap.forEach(async (podDoc) => {
        const data = podDoc.data();
        const podId: string = podDoc.id;
        const minLiquidation: number = data.P_liquidation;
        const amount: number = data.Principal;
        const token: string = data.Token;
        const collaterals: { [key: string]: number } = data.Pools.Collateral_Pool;
        if (isPodCollateralBellowLiquidation(amount, token, minLiquidation, collaterals, rateOfChange)) res.push(podId);
    });
    return res;
}
/**
 * cron job scheduled every 5 min, checks the liquidation of each pod (that is ccr below required level)
 */
exports.checkLiquidation = cron.schedule('*/5 * * * *', async () => {
    try {
        console.log("********* Pod checkLiquidation() cron job started *********");
        const rateOfChange = await getRateOfChange();
        const candidates = await getPodList();
        const podIdUidMap = {}; // maps podId to creatorId, used to notify creator when pod liquidated
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach((doc) => {
            podIdUidMap[doc.id] = doc.data().Creator;
        });
        candidates.forEach(async (podId) => {
            const blockchainRes = await podProtocol.checkPODLiquidation(podId, rateOfChange);
            if (blockchainRes && blockchainRes.success && blockchainRes.output.Liquidated == "YES") {
                updateFirebase(blockchainRes);
                createNotification(podIdUidMap[podId], "FT Pod - Pod Liquidated",
                    ` `,
                    notificationTypes.podLiquidationFunds
                );
            } else {
                console.log('Error in controllers/podController -> checkLiquidation().', podId, blockchainRes.message);
            }
        });
        console.log("--------- Pod checkLiquidation() finished ---------");
    } catch (err) {
        console.log('Error in controllers/podController -> checkLiquidation()', err);
    }
});


/**
 * cron job scheduled every day at 00:00, calculate if its a payment day for a pod.
 * For each candidate pod call blockchain/payInterest function
 */
exports.payInterest = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Pod payInterest() cron job started *********");
        const rateOfChange = await getRateOfChange();
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach(async (pod) => {
            const data = pod.data();
            if (data.State.Status == "INITIATED") {
                const duration: number = data.Duration;
                const payments: number = data.Payments;
                // both duration and payments exists and diferent than 0
                if (payments && duration) {
                    const step = parseInt((duration / payments).toString());  // step to int
                    const podDay = data.State.POD_Day
                    // payment day
                    if (podDay % step == 0) {
                        const blockchainRes = await podProtocol.interestPOD(pod.id, rateOfChange);
                        if (blockchainRes && blockchainRes.success) {
                            updateFirebase(blockchainRes);
                            // send notification to interest payer when payment done
                            const updateWallets = blockchainRes.output.UpdateWallets;
                            let uid: string = "";
                            let walletObj: any = null;
                            for ([uid, walletObj] of Object.entries(updateWallets)) {
                                if (walletObj["Transaction"].length > 0) {
                                    createNotification(uid, "FT Pod - Interest Payment",
                                        ` `,
                                        notificationTypes.traditionalInterest
                                    );
                                }
                            }
                            console.log("--------- Pod payInterest() finished ---------");
                        }
                        else {
                            console.log('Error in controllers/podController -> payInterest(): success = false.', blockchainRes.message);
                        }
                    }
                }
            }
        })
    } catch (err) {
        console.log('Error in controllers/podController -> payInterest()', err);
    }
});
// /**
//  * cron job scheduled every day at 00:00, calcula if its a payment day
//  * for each pod candidate to interest payment call blockchain/payInterest function
//  */
// exports.payInterest = cron.schedule('0 0 * * *', async () => {
//     try {
//         console.log("********* Pod payInterest() cron job started *********");
//         const rateOfChange = await getRateOfChange();
//         const podList: string[] = [];
//         const podsSnap = await db.collection(collections.podsFT).get();
//         podsSnap.forEach((doc) => {
//             podList.push(doc.id);
//         });
//         podsSnap.forEach(async (pod) => {
//             const blockchainRes = await podProtocol.interestPOD(pod.id, rateOfChange);
//             if (blockchainRes && blockchainRes.success) {
//                 updateFirebase(blockchainRes);
//                 const updateWallets = blockchainRes.output.UpdateWallets;
//                 let uid: string = "";
//                 let walletObj: any = null;
//                 for ([uid, walletObj] of Object.entries(updateWallets)) {
//                     if (walletObj["Transaction"].length > 0) {
//                         createNotification(uid, "FT Pod - Interest Payment",
//                             ` `,
//                             notificationTypes.traditionalInterest
//                         );
//                     }
//                 }
//                 console.log("--------- Pod payInterest() finished ---------");
//             }
//             else {
//                 console.log('Error in controllers/podController -> payInterest(): success = false.', blockchainRes.message);
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
        // FT
        let podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach(async (pod) => {
            let dayLowestPrice = Infinity;
            let date = Date.now();
            // get lowest price from PriceOfTheDay
            const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get();
            if (!priceOfTheDaySnap.empty) {
                priceOfTheDaySnap.forEach((doc) => {
                    if (doc.data() && doc.data().price < dayLowestPrice) {
                        dayLowestPrice = doc.data().price;
                    }
                });
            }
            // get price for nearest (date) price history, to use in case that have no sale offers today.
            if (dayLowestPrice == Infinity) {
                const priceHistorySnap = await pod.ref.collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
                if (priceHistorySnap.docs.length) {
                    const data = priceHistorySnap.docs[0].data();
                    dayLowestPrice = data.price;
                    date = data.date;
                }
            }
            // add this new price and date to PriceHistory colection
            if (dayLowestPrice != Infinity) {
                pod.ref.collection(collections.priceHistory).add({
                    price: dayLowestPrice,
                    date: date
                });
            }
            // reset (empty) PriceOfTheDay
            priceOfTheDaySnap.forEach((doc) => doc.ref.delete());
        })
        // NFT
        podsSnap = await db.collection(collections.podsNFT).get();
        podsSnap.forEach(async (pod) => {
            let dayLowestPrice = Infinity;
            let date = Date.now();
            // get lowest price from Sales Book 
            const podData = pod.data();
            if (podData) {
                let orderId = "";
                let sale: any = null;
                for ([orderId, sale] of Object.entries(podData.OrderBook.Sell)) {
                    if (sale.Price < dayLowestPrice && sale.Amount != 0) dayLowestPrice = sale.Price;
                }
            }
            // get price for nearest (date) price history, to use in case that have no sale offers today.
            if (dayLowestPrice == Infinity) {
                const priceHistorySnap = await pod.ref.collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
                if (priceHistorySnap.docs.length) {
                    const data = priceHistorySnap.docs[0].data();
                    dayLowestPrice = data.price;
                    date = data.date;
                }
            }
            // add this new price and date to PriceHistory colection
            if (dayLowestPrice != Infinity) {
                pod.ref.collection(collections.priceHistory).add({
                    price: dayLowestPrice,
                    date: date
                }
                );
            }
            // reset (empty) PriceOfTheDay
            const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get()
            priceOfTheDaySnap.forEach((doc) => doc.ref.delete());
        });
        console.log("--------- Pod managePriceHistory() finished ---------");
    } catch (err) {
        console.log('Error in controllers/podController -> managePriceHistory()', err);
    }
});