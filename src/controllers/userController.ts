import express from 'express';
// import * as fs from 'fs';
// import * as path from 'path';
// import { stringify } from 'querystring';
//const jwt = require("jsonwebtoken");
import collections from '../firebase/collections';
import dataProtocol from '../blockchain/dataProtocol';
import { db } from '../firebase/firebase';
import { updateFirebase, getRateOfChange, getLendingInterest, getStakingInterest, createNotificaction, getUidFromEmail } from "../constants/functions";

// AUTHENTICATION

const signIn = async (req: express.Request, res: express.Response) => {
    try {
        const { email, password } = req.query;

        if (email && password) {

            // Compare user & pwd between login input and DB
            const user = await db.collection(collections.user)
                .where('email', '==', email)
                .where('password', '==', password)
                .get();

            // Return result
            if (user.empty) {
                res.send({ isSignedIn: false, userData: {} });
            } else {
                const data = user.docs[0].data();
                data.id = user.docs[0].id;
                console.log('Login successful');
                res.send({ isSignedIn: true, userData: data });
            };

            // TODO: Create session token
            // TODO: Compare password using encryption
        };
    } catch (err) {
        console.log('Error in controllers/user.ts -> signIn(): ', err);
    };
};

const signUp = async (req: express.Request, res: express.Response) => {
    try {
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
                    role: role,
                    gender: gender,
                    age: age,
                    country: country,
                    location: location,
                    address: address,
                    postalCode: postalCode,
                    password: password,     //TODO: encrypt password
                    firstName: firstName,
                    lastName: lastName,
                    dialCode: dialCode,
                    phone: phone,
                    email: email,
                    currency: currency,
                    lastUpdate: lastUpdate,
                    endorsementScore: output.UpdateWallets[uid].EndorsementScore,
                    trustScore: output.UpdateWallets[uid].TrustScore,
                    followings: [],
                    followers: [],
                    followingNFTPods: [],
                    followingFTPods: [],
                });

                // cloudDatabase
                transaction.set(db.collection(collections.cloudDatabase).doc(did), {
                    gender: gender,
                    age: age,
                    country: country,
                    location: location
                });

                // wallet
                const balances = output.UpdateWallets[uid].Balances;
                for (const [key, value] of Object.entries(balances)) {  // for each token obj
                    transaction.set(db.collection(collections.wallet).doc(key).collection(collections.user).doc(uid), value);
                };

                // transaction
                const history = output.UpdateWallets[uid].Transaction;
                if (history != null) {
                    history.forEach(obj => {
                        transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                        //transaction.set(db.collection(collections.allTransactions), obj); // to be deleted later
                        transaction.set(db.collection(collections.allTransactions).doc(obj.Id), obj); // to be deleted later
                    });
                };

            });
            res.send({ success: true, uid: uid, lastUpdate: lastUpdate });
        } else {
            console.log(
                'Warning in controllers/user.ts -> signUp():', blockchainRes);
            res.send({ success: false });
        };
    } catch (err) {
        console.log('Error in controllers/user.ts -> signUp(): ', err);
        res.send({ success: false });
    };
};

// MY WALL FUNCTIONS

// ----------------------------- Basic Info --------------------------

interface BasicInfo {
    name: string;
    profilePhoto: string,
    trustScore: number,
    endorsementScore: number,
    followers: number,
    followings: number
}

exports.getBasicInfo = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        let basicInfo: BasicInfo = { name: "", profilePhoto: "", trustScore: 0.5, endorsementScore: 0.5, followers: 0, followings: 0 };
        const userSnap = await db.collection(collections.user).doc(publicId).get();
        const userData = userSnap.data();
        if (userData !== undefined) {
            // update return data
            basicInfo.name = userData.firstName + " " + userData.lastName;
            basicInfo.trustScore = userData.trustScore;
            basicInfo.endorsementScore = userData.endorsementScore;
            basicInfo.followers = userData.followers.length;
            basicInfo.followings = userData.followings.length;
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
        const body = req.body;
        const publicId = body.publicId;
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
        const userSnap = await db.collection(collections.user).doc(publicId).get();
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
        const body = req.body;
        const publicId = body.publicId;
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
        const userSnap = await db.collection(collections.user).doc(publicId).get();
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
        const body = req.body;
        const publicId = body.publicId;
        const actions = [];
        let action: Action = { name: "", profilePhoto: "", description: "", date: Date.now() };
        const userSnap = await db.collection(collections.user).doc(publicId).get();
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
    console.log(userId);

};

const getFollowing = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const followUser = async (req: express.Request, res: express.Response) => {


};

const unFollowUser = async (req: express.Request, res: express.Response) => {


};

// INVESTMENTS

const getMyPods = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getPodsInvestments = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getPodsFollowed = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

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
    let userId = req.params.userId;
    console.log(userId);

};

const editUser = async (req: express.Request, res: express.Response) => {


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
    getSocialTokens
};
