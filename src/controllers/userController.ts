import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
const jwt = require("jsonwebtoken");
//const Cons = require('../shared/Config');
//const { query } = require('../shared/query');
const firebase = require("../firebase/firebase");
const admin = firebase.getAdmin();
const db = firebase.getDb();
const collections = require("../firebase/collections");
const dataProtocol = require("../blockchain/dataProtocol");


const addToWaitlist = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const mail = body.mail;
        const underConstructionFunctionality = body.underConstructionFunctionality;
        db.collection(collections.waitlist).doc(underConstructionFunctionality).collection("users").add({
            email: mail,
        });
        res.send({sucess: true});
    } catch (err) {
        console.log('Error in controllers/user.ts -> addToWaitlist(): ', err);
        res.send({sucess: false});
    }
}

const register = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const role = body.role; // "USER", "COMPANY", ...
        const firstName = body.firstName;
        const lastName = body.lastName;
        const gender = body.gender;
        const age = body.age;
        const country = body.country;
        const location = body.location;
        const dialCode = body.dialCode;
        const phone = body.phone;
        const currency = body.currency;
        const email = body.email;
        const password = body.password;

        const blockchainRes = await dataProtocol.register(role);
        if (blockchainRes && blockchainRes.success) {
            console.log("blockchain success ***********************")
            const output = blockchainRes.output;
            const uid = output.ID;  // extract from blockchain res
            const did = output.DID;
            await admin.auth().createUser({
                uid: uid,
                email: email,
                password: password
            });
            console.log("user created ***********************")
            await db.runTransaction(async (transaction:any) => {
                // userData
                transaction.set( db.collection(collections.user).doc(uid), {
                    gender: gender,
                    age: age,
                    country: country,
                    location: location,
                    firstName: firstName,
                    lastName: lastName,
                    dialCode: dialCode,
                    phone: phone,
                    email: email,
                    currency: currency,
                    lastUpdate: Date.now(),
                    endorsementScore: 0.5,
                    trustScore: 0.5,
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
                    console.log(value);
                    transaction.set(db.collection(collections.wallet).doc(key).collection(collections.user).doc(uid), value);
                }
            });
            res.send({sucess: true, data: {
            }});
        }
        else {
            console.log('Error in blockchain call at controllers/user.ts -> register(): ');
            res.send({sucess: false});
        }
    } catch (err) {
        console.log('Error in controllers/user.ts -> register(): ', err);
        res.send({sucess: false});
    }
}

const signIn = async (req: express.Request, res: express.Response) => {
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
        res.send({signIn: true})
    } catch (err) {
        console.log('Error in controllers/user.ts -> signIn(): ', err);
    }
};

module.exports = {
    signIn,
    addToWaitlist,
    register
};
