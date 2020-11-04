import express from 'express';
// import * as fs from 'fs';
// import * as path from 'path';
// import { stringify } from 'querystring';
//const jwt = require("jsonwebtoken");
import collections from '../firebase/collections';
import dataProtocol from '../blockchain/dataProtocol';
import coinBalance from '../blockchain/coinBalance';
import { db } from '../firebase/firebase';
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest, createNotificaction, getUidFromEmail } from "../functions/functions";
import {addListener} from "cluster";

// AUTHENTICATION

const signIn = async (req: express.Request, res: express.Response) => {
    try {
<<<<<<< HEAD
        const { email, password } = req.body;
=======
        const body = req.body;

        const email = body.email;
        const password = body.password;

>>>>>>> 0b04f600bf24137fa1d544b21236d1c578e25126
        if (email && password) {

            // Compare user & pwd between login input and DB
            const user = await db.collection(collections.user)
                .where('email', '==', email)
                .where('password', '==', password)
                .get();

            // Return result
            if (user.empty) {
<<<<<<< HEAD
                console.log("Login failed");
=======
                console.log('not found')
>>>>>>> 0b04f600bf24137fa1d544b21236d1c578e25126
                res.send({ isSignedIn: false, userData: {} });
            } else {
                console.log('found')
                const data = user.docs[0].data();
                data.id = user.docs[0].id;
                console.log('Login successful');
                res.send({ isSignedIn: true, userData: data });
            }

            // TODO: Create session token
            // TODO: Compare password using encryption
        }
    } catch (err) {
        console.log('Error in controllers/user.ts -> signIn(): ', err);
    }
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
<<<<<<< HEAD
            , password } = req.body;
=======
            , password } = req.query;
*/

        const body = req.body;

        const firstName = body.firstName;
        const country = body.country;
        const currency = body.currency;
        const email = body.email;
        const password = body.password;
        const role = body.role; // role should not be coming from user input?

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

>>>>>>> 0b04f600bf24137fa1d544b21236d1c578e25126
        let uid: string = '';
        const lastUpdate = Date.now();

        // check if email is in database
		const emailUidMap = await getUidFromEmail(email);
		let toUid = emailUidMap[email!.toString()];
		console.log(email);
        if (toUid) {
            res.send({ success: false, message: "email is already in database" });
            return;
        }

        const blockchainRes = await dataProtocol.register(role);

        if (blockchainRes && blockchainRes.success) {
            // Get IDs from blockchain response
            const output = blockchainRes.output;
            uid = output.ID;
            const did = output.DID;

            // Creates User in DB
            await db.runTransaction(async (transaction) => {

                // userData
                transaction.set(db.collection(collections.user).doc(uid), {
                    firstName: firstName,
                    country: country,
                    currency: currency,
                    email: email,
                    password: password,     //TODO: encrypt password
                    role: role,

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
                    endorsementScore: output.UpdateWallets[uid].EndorsementScore,
                    trustScore: output.UpdateWallets[uid].TrustScore,
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

                // wallet
                const balances = output.UpdateWallets[uid].Balances;
                for (const [key, value] of Object.entries(balances)) {  // for each token obj
                    transaction.set(db.collection(collections.wallet).doc(key).collection(collections.user).doc(uid), value);
                }

                // transaction
                const history = output.UpdateWallets[uid].Transaction;
                if (history != null) {
                    history.forEach(obj => {
                        transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                        //transaction.set(db.collection(collections.allTransactions), obj); // to be deleted later
                        transaction.set(db.collection(collections.allTransactions).doc(obj.Id), obj); // to be deleted later
                    });
                }

            });

            // ------------------------- Provisional for TestNet ---------------------------------
            // give user some balance in each tokens (50/tokenRate).
            const coinsVal = 50; // value in USD to be sent
            const fromUid = "k3Xpi5IB61fvG3xNM4POkjnCQnx1"; // Privi UID
            const rateOfChange = await getRateOfChange();   // get rate of tokens
            const arrayMultiTransfer: {}[] = [];  // build multitransfer array object
            let token: string = "";
            let rate: any = null;
            for ([token, rate] of Object.entries(rateOfChange)) {
                const amount = coinsVal / rateOfChange[token];
                const transferObj = {
                    Type: "transfer",
                    Token: token,
                    From: fromUid,
                    To: uid,
                    Amount: amount
                };
                arrayMultiTransfer.push(transferObj);
            }
            const blockchainRes2 = await coinBalance.multitransfer(arrayMultiTransfer);
            if (blockchainRes2 && blockchainRes2.success) {
                console.log('User initial gift sent: 50USD in each token');
                updateFirebase(blockchainRes2);
            }
            else {
                console.log('Error in sending intial 50USD, blockchain success = false.', blockchainRes2.message);
            }
            // ------------------------------------------------------------------------------------

            res.send({ success: true, uid: uid, lastUpdate: lastUpdate });
        } else {
            console.log(
                'Warning in controllers/user.ts -> signUp():', blockchainRes);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/user.ts -> signUp(): ', err);
        res.send({ success: false });
    }
};

// MY WALL FUNCTIONS

// ----------------------------- Basic Info --------------------------

interface BasicInfo {
    name: string;
    profilePhoto: string,
    trustScore: number,
    endorsementScore: number,
    numFollowers: number,
    numFollowings: number,
    bio: string
}

const getBasicInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        let basicInfo: BasicInfo = { name: "", profilePhoto: "", trustScore: 0.5, endorsementScore: 0.5, numFollowers: 0, numFollowings: 0, bio: '' };
        const userSnap = await db.collection(collections.user).doc(userId).get();
        const userData = userSnap.data();
        if (userData !== undefined) {
            // update return data
            basicInfo.name = userData.firstName + " " + userData.lastName;
            basicInfo.trustScore = userData.trustScore;
            basicInfo.endorsementScore = userData.endorsementScore;
            basicInfo.numFollowers = userData.numFollowers || 0;
            basicInfo.numFollowings = userData.numFollowings || 0;
            basicInfo.bio = userData.bio || '';
            res.send({ success: true, data: basicInfo });
        }
        else res.send({ success: false });

    } catch (err) {
        console.log('Error in controllers/profile -> getBasicInfo()', err);
        res.send({ success: false });
    }
}

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
    profilePhoto: string,
    description: string,
    date: number
}

const getFollowPodsInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        console.log(userId);
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
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
            res.send({ success: true, data: actions });
        }
        else res.send({ success: false });
    } catch (err) {
        console.log('Error in controllers/profile -> getFollowPodsInfo()', err);
        res.send({ success: false });
    }
}


const getFollowingUserInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        console.log(userId);
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
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
}

const getOwnInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        console.log(userId);
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
        const userSnap = await db.collection(collections.user).doc(userId).get();
        const userData = userSnap.data();
        // create action and fill actions (to be specified)
        res.send({ success: true, data: actions });
    } catch (err) {
        console.log('Error in controllers/profile -> getOwnInfo()', err);
        res.send({ success: false });
    }
}

// CONNECTIONS FUNCTIONS

const getFollowers = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    try {
        const userRef = await db.collection(collections.user)
            .doc(userId).get();
        const user : any = userRef.data();

        if(user && user.followers) {
            if(user.followers.length === 0) {
                res.send({
                    success: true,
                    data: {
                        followers: 0
                    }
                });
            } else {
                let followers : any[] = [];
                user.followers.forEach(async (follower, id) => {
                    const followerInfo = await db.collection(collections.user)
                        .doc(follower).get();
                    const followerData : any = followerInfo.data();

                    let isFollowing = user.followings.find(following => following === follower);

                    let followerObj = {
                        id: follower,
                        name: followerData.firstName + ' ' + followerData.lastName,
                        endorsementScore: followerData.endorsementScore,
                        trustScore: followerData.trustScore,
                        numFollowers: followerData.numFollowers,
                        numFollowings: followerData.numFollowings,
                        isFollowing: !!isFollowing
                    };

                    followers.push(followerObj);

                    if(user.followers.length === id + 1) {
                        res.send({
                            success: true,
                            data: {
                                followers: followers
                            }
                        });
                    }
                });
            }
        }
    } catch (err) {
        console.log('Error in controllers/profile -> getFollowers()', err);
        res.send({ success: false });
    }
};

const getFollowing = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    try {
        const userRef = await db.collection(collections.user)
            .doc(userId).get();
        const user : any = userRef.data();

        let followings : any[] = [];
        if(user && user.followings) {
            if (user.followings.length === 0) {
                res.send({
                    success: true,
                    data: {
                        followers: 0
                    }
                });
            } else {
                user.followings.forEach(async (following, id) => {
                    const followingInfo = await db.collection(collections.user)
                        .doc(following).get();
                    const followingData: any = followingInfo.data();

                    let followingObj = {
                        id: following,
                        name: followingData.firstName + ' ' + followingData.lastName,
                        endorsementScore: followingData.endorsementScore,
                        trustScore: followingData.trustScore,
                        numFollowers: followingData.numFollowers,
                        numFollowings: followingData.numFollowings,
                        isFollowing: true
                    };

                    followings.push(followingObj);

                    if (user.followings.length === id + 1) {
                        res.send({
                            success: true,
                            data: {
                                followings: followings
                            }
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

        const userRef = db.collection(collections.user)
            .doc(body.user.id);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        const userToFollowRef = db.collection(collections.user)
            .doc(userToFollow.id);
        const userToFollowGet = await userToFollowRef.get();
        const userToFollowData : any = userToFollowGet.data();

        let alreadyFollowing = user.followings.find((item) => item === userToFollow.id);
        if(!alreadyFollowing){
            user.followings.push(userToFollow.id);
        }

        let alreadyFollower = userToFollowData.followers.find((item) => item === body.user.id);
        if(!alreadyFollower){
            userToFollowData.followers.push(body.user.id);
        }
        userToFollowData.numFollowers = userToFollowData.followers.length;

        await userToFollowRef.update({
            followers: userToFollowData.followers,
            numFollowers: userToFollowData.numFollowers
        });
        await userRef.update({
            followings: user.followings,
            numFollowings: user.followings.length
        });
        res.send({ success: true, data: userToFollowData });
    } catch (err) {
        console.log('Error in controllers/followUser -> followUser()', err);
        res.send({ success: false });
    }
};

const unFollowUser = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        let userToUnFollow = body.userToUnFollow;

        console.log(body.user.id, userToUnFollow)

        const userRef = db.collection(collections.user)
            .doc(body.user.id);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        const userToUnFollowRef = db.collection(collections.user)
            .doc(userToUnFollow.id);
        const userToUnFollowGet = await userToUnFollowRef.get();
        const userToUnFollowData : any = userToUnFollowGet.data();

        let newFollowings = user.followings.filter(item => item != userToUnFollow.id)

        let newFollowers = userToUnFollowData.followers.filter((item) => item !== body.user.id);

        console.log(userToUnFollowData.followers);
        console.log(newFollowers);
        userToUnFollowData.numFollowers = newFollowers.length;

        await userToUnFollowRef.update({
            followers: newFollowers,
            numFollowers: newFollowers.length
        });
        await userRef.update({
            followings: newFollowings,
            numFollowings: newFollowings.length
        });

        res.send({ success: true, data: userToUnFollowData });
    } catch (err) {
        console.log('Error in controllers/unFollowUser -> unFollowUser()', err);
        res.send({ success: false });
    }
};

// INVESTMENTS

const getMyPods = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    try {
        const userRef = await db.collection(collections.user)
            .doc(userId).get();
        const user : any = userRef.data();
        let myNFTPods : any[] = [];
        let myFTPods : any[] = [];

        if(user.myNFTPods && user.myNFTPods.length > 0) {
            myNFTPods = await getPodsArray(user.myNFTPods, collections.podsNFT);
        }

        if(user.myFTPods && user.myFTPods.length > 0) {
            myFTPods = await getPodsArray(user.myFTPods, collections.podsFT);
        }

        res.send({
            success: true,
            data: {
                NFT: myNFTPods || [],
                FT: myFTPods || []
            }
        });
    } catch (err) {
        console.log('Error in controllers/profile -> getMyPods()', err);
        res.send({ success: false });
    }
};

const getPodsInvestments = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    try {
        const userRef = await db.collection(collections.user)
            .doc(userId).get();
        const user : any = userRef.data();

        let investedNFTPods : any[] = [];
        let investedFTPods : any[] = [];

        if(user.investedNFTPods && user.investedNFTPods.length > 0) {
            investedNFTPods = await getPodsArray(user.investedNFTPods, collections.podsNFT);
        }

        if(user.investedFTPods && user.investedFTPods.length > 0) {
            investedFTPods = await getPodsArray(user.investedFTPods, collections.podsFT);
        }

        res.send({
            success: true,
            data: {
                NFT: investedNFTPods,
                FT: investedFTPods
            }
        });
    } catch (err) {
        console.log('Error in controllers/profile -> getPodsInvestments()', err);
        res.send({ success: false });
    }
};

const getPodsFollowed = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    try {
        const userRef = await db.collection(collections.user)
            .doc(userId).get();
        const user : any = userRef.data();

        let followingNFTPods : any[] = [];
        let followingFTPods : any[] = [];

        if(user.followingNFTPods && user.followingNFTPods.length > 0) {
            followingNFTPods = await getPodsArray(user.followingNFTPods, collections.podsNFT);
        }

        if(user.followingFTPods && user.followingFTPods.length > 0) {
            followingFTPods = await getPodsArray(user.followingFTPods, collections.podsFT);
        }

        res.send({
            success: true,
            data: {
                NFT: followingNFTPods,
                FT: followingFTPods
            }
        });
    } catch (err) {
        console.log('Error in controllers/profile -> getPodsFollowed()', err);
        res.send({ success: false });
    }
};

const getPodsArray = (arrayPods : any[], collection: any) : Promise<any[]> => {
    return new Promise((resolve, reject) => {
        let podInfo : any[] = [];
        arrayPods.forEach(async (item, i) => {
            const podRef = await db.collection(collection)
                .doc(item).get();

            podInfo.push(podRef.data());

            if(arrayPods.length === i + 1) {
                resolve(podInfo);
            }
        });
    })
}

const getReceivables = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getLiabilities = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getSocialTokens = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const editUser = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;

        const userRef = db.collection(collections.user)
            .doc(body.id);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        await userRef.update({
            firstName: body.firstName,
            lastName: body.lastName,
            // dob: body.dob,
            country: body.country,
            postalCode: body.postalCode,
            location: body.location,
            address: body.address,
            bio: body.bio
        });

        res.send({ success: true, data: {
                id: body.id,
                firstName: body.firstName,
                lastName: body.lastName,
                //dob: body.dob,
                country: body.country,
                postalCode: body.postalCode,
                location: body.location,
                address: body.address,
                bio: body.bio
            }
        });
    } catch (err) {
        console.log('Error in controllers/editUser -> editUser()', err);
        res.send({ success: false });
    }

};


const changeUserProfilePhoto = async (req: express.Request, res: express.Response) => {
    if (req.file) {
        console.log(req.file);
        let newImage = {
            filename: req.file.filename,
            originalName: req.file.originalname
            // url: req.protocol + '://' + req.get('host') + '/images/' + image._id
        };
        newImage.filename = req.file.filename;
        newImage.originalName = req.file.originalname;

    } else {
        res.status(400).json({ error: 'No file' });
    }
};


module.exports = {
    signIn,
    signUp,
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
    getBasicInfo
};
