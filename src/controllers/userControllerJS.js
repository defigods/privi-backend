import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
// const jwt = require("jsonwebtoken");
//const Cons = require('../shared/Config');
//const { query } = require('../shared/query');
import { db, admin } from "../firebase/firebase";
const collections = require("../firebase/collections");
const dataProtocol = require("../blockchain/dataProtocol");


exports.addToWaitlist = async (req, res) => {
    try {
        const body = req.body;
        const mail = body.mail;
        const underConstructionFunctionality = body.underConstructionFunctionality;
        db.collection(collections.waitlist).doc(underConstructionFunctionality).collection("users").add({
            email: mail,
        });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/user -> addToWaitlist(): ', err);
        res.send({ success: false });
    }
}

exports.register = async (req, res) => {
    try {
        const body = req.body;
        const role = body.role; // "USER", "COMPANY", ...
        const firstName = body.firstName;
        const lastName = body.lastName;
        const gender = body.gender;
        const age = body.age;
        const country = body.country;
        const location = body.location;
        const address = body.address;
        const postalCode = body.postalCode;
        const dialCode = body.dialCode;
        const phone = body.phone;
        const currency = body.currency;
        const email = body.email;
        const password = body.password;

        const blockchainRes = await dataProtocol.register(role);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            const uid = output.ID;  // extract from blockchain res
            const did = output.DID;
            await admin.auth().createUser({
                uid: uid,
                email: email,
                password: password
            });
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
                    firstName: firstName,
                    lastName: lastName,
                    dialCode: dialCode,
                    phone: phone,
                    email: email,
                    currency: currency,
                    lastUpdate: Date.now(),
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
                }

                // transaction
                const history = output.UpdateWallets[uid].Transaction;
                if (history != null) {
                    history.forEach(obj => {
                        transaction.set(db.collection(collections.history).doc(collections.history).collection(uid).doc(obj.Id), obj);
                        transaction.set(db.collection(collections.allTransactions), obj); // to be deleted later
                    });
                }
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in blockchain call at controllers/user -> register(): ');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/user -> register(): ', err);
        res.send({ success: false });
    }
}

exports.getPrivacy = async (req, res) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const blockchainRes = await dataProtocol.getPrivacy(publicId);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            const retData = [];
            for (const [companyId, enabled] of Object.entries(output)) {
                resData.push({ name: companyId, id: companyId, enabled: enabled });
            }
            const companySnapshot = await db.collection(collections.user).where("role", "==", "COMPANY").get();
            // to be improved (efficiency): now O(n^2)
            for (let i = 0; i < retData.length; i++) {
                let obj = retData[i];
                companySnapshot.docs.forEach((doc) => {
                    if (doc.id == obj.id) {
                        const data = doc.data();
                        obj.name = data.name;   // company name
                    }
                })
            }
            res.send({ success: true, data: retData });
        } else {
            console.log('Error in controllers/user -> getPrivacy(): ', err);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/user -> getPrivacy(): ', err);
        res.send({ success: false });
    }
}

exports.setPrivacy = async (req, res) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const businessId = body.businessId;
        const enabled = body.enabled;
        const blockchainRes = await dataProtocol.modifyPrivacy(publicId, businessId, enabled);
        if (blockchainRes && blockchainRes.success) {
            const output = blockchainRes.output;
            // ....
            res.send({ success: true });
        } else {
            console.log('Error in controllers/user -> setPrivacy(): ', err);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/user -> setPrivacy(): ', err);
        res.send({ success: false });
    }
}

exports.signIn = async (req, res) => {
    try {
        /*
        const args = req.query;

        // check user & pwd in DB
        const q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_user.sql`), 'utf8');
        const resDB = await query(q, 'select', [args.login, args.password]);

        // Create session token
        const token = jwt.sign({ id: args.login }, Cons.SEED.secret, {
            expiresIn: 86400 // 24 hours
            //expiresIn: 1
        });

        // Add session token to User data
        if (resDB.length > 0) resDB[0].token = token;

        // send query result
        (resDB.length > 0) ? res.status(200).json(resDB) : res.status(204).json('KO');
        */
        console.log(req);
        console.log('signIn');
        res.send({ signIn: true })
    } catch (err) {
        console.log('Error in controllers/user -> signIn(): ', err);
    }
};
