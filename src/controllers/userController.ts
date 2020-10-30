import express from 'express';
// import * as fs from 'fs';
// import * as path from 'path';
// import { stringify } from 'querystring';
//const jwt = require("jsonwebtoken");
import collections from '../firebase/collections';
import dataProtocol from '../blockchain/dataProtocol';
import { db } from '../firebase/firebase';

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

const getFollowPodsInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getFollowUserInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

const getFollowMyInfo = async (req: express.Request, res: express.Response) => {
    let userId = req.params.userId;
    console.log(userId);

};

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
    getFollowUserInfo,
    getFollowMyInfo,
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
    changeUserProfilePhoto
};
