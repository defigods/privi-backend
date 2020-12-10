import express from 'express';
import priviCredit from "../blockchain/priviLending";
import { updateFirebase, createNotification, generateUniqueId, getRateOfChange, filterTrending } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import cron from 'node-cron';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';

require('dotenv').config();
const apiKey = "PRIVI"; // just for now

///////////////////////////// POSTS //////////////////////////////

exports.initiatePriviCredit = async (req: express.Request, res: express.Response) => {
    try {

        const body = req.body;
        const creator = body.creator;
        const creditName = body.creditName;
        const lendingToken = body.lendingToken;
        const maxFunds = body.maxFunds;
        const interest = body.interest;
        const frequency = body.frequency.toUpperCase();
        const p_incentive = body.p_incentive;
        const p_premium = body.p_premium;
        const date = body.date; // ini date
        const dateExpiration = body.dateExpiration; // end date
        const trustScore = body.trustScore;
        const endorsementScore = body.endorsementScore;
        const collateralsAccepted = body.collateralsAccepted;
        const ccr = body.ccr;
        const initialDeposit = body.initialDeposit;

        const description = body.description;
        const discordId = body.discordId;
        const ethereumAddress = body.ethereumAddress;

        const creditAddress = generateUniqueId();
        const txnId = generateUniqueId();

        const admins = body.admins; // string[]
        const insurers = body.insurers; // string[]
        const userRoles = body.userRoles;   // {name, role, status}[]

        const blockchainRes = await priviCredit.initiatePRIVIcredit(creator, creditName, creditAddress, lendingToken, maxFunds, interest, frequency, p_incentive,
            p_premium, date, dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);
            createNotification(creator, "Privi Credit - Loan Offer Created",
                `You have successfully created a new PRIVI Credit. ${initialDeposit} ${lendingToken} has been added to the PRIVI Credit Pool!`,
                notificationTypes.priviCreditCreated
            );

            // add some more data to firebase
            db.collection(collections.priviCredits).doc(creditAddress).set({
                Description: description,
                DiscordId: discordId,
                EthereumAddress: ethereumAddress,
                Admins: admins,
                Insurers: insurers,
                UserRoles: userRoles
            }, { merge: true })

            // return new created credit id to FE
            const updateCredit = blockchainRes.output.UpdatedCreditInfo;
            const loanIds: string[] = Object.keys(updateCredit);
            const id = loanIds[0];
            res.send({ success: true, data: { id: id, date: date } });
        }
        else {
            console.log('Error in controllers/priviCredit -> initiateCredit(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> initiateCredit(): ', err);
        res.send({ success: false });
    }
};

exports.depositFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const address = body.address;   // user addr
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await priviCredit.depositFunds(creditAddress, address, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(address, "Privi Credit - Credit Deposited",
                `You have succesfully deposited ${amount} Coins into your Privi Credit loan`,
                notificationTypes.priviCreditDeposited
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> depositFunds(): success = false');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> depositFunds(): ', err);
        res.send({ success: false });
    }
};

exports.borrowFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.creditAddress;
        const address = body.address;   // user addr
        const amount = body.amount;
        const collateral = body.collateral;

        const date = Date.now();
        const txnId = generateUniqueId();
        const rateOfChange = await getRateOfChange();

        const blockchainRes = await priviCredit.borrowFunds(creditAddress, address, amount, date, txnId, collateral, rateOfChange, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotification(address, "Privi Credit - Loan Borrowed",
                `You have succesfully borrowed a Privi Credit loan offer, enjoy your ${amount} Coins`,
                notificationTypes.priviCreditBorrowed
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/priviCredit -> borrowFunds(): success = false', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> borrowFunds(): ', err);
        res.send({ success: false });
    }
};

///////////////////////////// GETS //////////////////////////////

exports.getPriviCredits = async (req: express.Request, res: express.Response) => {
    try {
        const allCredits: any[] = [];
        const creditsSnap = await db.collection(collections.priviCredits).get();
        for (var i = 0; i < creditsSnap.docs.length; i++) {
            const doc = creditsSnap.docs[i];
            const data = doc.data();
            const popularity = 0.5;
            const lenders: any[] = [];
            const borrowers: any[] = [];
            const lendersSnap = await doc.ref.collection(collections.priviCreditsLending).get();
            const borrowersSnap = await doc.ref.collection(collections.priviCreditsBorrowing).get();
            lendersSnap.forEach((doc) => {
                lenders.push(doc.data());
            });
            borrowersSnap.forEach((doc) => {
                borrowers.push(doc.data());
            });

            allCredits.push({
                ...data,
                popularity: popularity,
                Lenders: lenders,
                Borrowers: borrowers
            });
        }

        // get the trending ones
        const trendingCredits = filterTrending(allCredits);

        res.send({
            success: true, data: {
                allCredits: allCredits,
                trendingCredits: trendingCredits
            }
        });
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPriviCredits(): ', err);
        res.send({ success: false });
    }
};


/////////////////////////// CRON JOBS //////////////////////////////

// // scheduled every day at 00:00
// exports.managePRIVIcredits = cron.schedule('0 0 * * *', async () => {
//     try {
//         console.log("******** Privi Credit managePRIVIcredits ********");
//         const blockchainRes = await priviCredit.managePRIVIcredits();
//         if (blockchainRes && blockchainRes.success) {
//             console.log("******** Privi Credit managePRIVIcredits finished ********");
//             updateFirebase(blockchainRes);
//             const updateWallets = blockchainRes.output.UpdateWallets;
//             let uid: string = "";
//             let walletObj: any = null;
//             for ([uid, walletObj] of Object.entries(updateWallets)) {
//                 if (walletObj["Transaction"].length > 0) {
//                     createNotification(uid, "Privi Credit - Interest Payment",
//                         ` `,
//                         notificationTypes.priviCreditInterest
//                     );
//                 }
//             }
//         }
//         else {
//             console.log('Error in controllers/priviCredit -> managePRIVIcredits(): success = false');
//         }
//     } catch (err) {
//         console.log('Error in controllers/priviCredit -> managePRIVIcredits()', err);
//     }
// });