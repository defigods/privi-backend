import express from 'express';
import priviCredit from "../blockchain/priviCredit";
import { updateFirebase, createNotification, generateUniqueId, getRateOfChangeAsMap, filterTrending, isPaymentDay, follow, unfollow } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import cron from 'node-cron';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import fields from '../firebase/fields';
import { user } from 'firebase-functions/lib/providers/auth';

const notificationsController = require('./notificationsController');
const chatController = require('./chatController');

require('dotenv').config();
// const apiKey = process.env.API_KEY;
const apiKey = "PRIVI"

///////////////////////////// POSTS //////////////////////////////

exports.initiatePriviCredit = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        const creator = body.Parameters.Creator;
        const creditName = body.Parameters.CreditName;
        const lendingToken = body.Parameters.LendingToken;
        const maxFunds = body.Parameters.MaxFunds;
        const interest = body.Parameters.Interest;
        const frequency = body.Parameters.Frequency;
        const p_incentive = body.Parameters.P_incentive;
        const p_premium = body.Parameters.P_premium;
        const dateExpiration = body.Parameters.DateExpiration;

        const trustScore = body.TrustScore;
        const endorsementScore = body.EndorsementScore;
        const collateralsAccepted = body.CollateralsAccepted;
        const ccr = body.CCR;

        const initialDeposit = body.Initialisation.InitialDeposit;
        const hash = body.Initialisation.Hash;
        const signature = body.Initialisation.Signature;

        const blockchainRes = await priviCredit.initiatePRIVIcredit(creator, creditName, lendingToken, maxFunds, interest, frequency, p_incentive,
            p_premium, dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);
            const output = blockchainRes.output;
            const updatedCreditInfo = output.UpdatedCreditInfo;
            const creditAddress = Object.keys(updatedCreditInfo)[0];

            // add some more data to firebase
            const description = body.description;
            const discordId = body.discordId;
            const ethereumAddress = body.ethereumAddress;
            const admins = body.admins; // string[]
            const insurers = body.insurers; // string[]
            const userRoles = body.userRoles;   // {name, role, status}[]
            db.collection(collections.priviCredits).doc(creditAddress).set({
                Description: description,
                DiscordId: discordId,
                EthereumAddress: ethereumAddress,
                Admins: admins,
                Insurers: insurers,
                UserRoles: userRoles
            }, { merge: true })

            // add transaction to credit doc
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).doc(tid).set({ Transactions: txnArray });
            }

            const userSnap = await db.collection(collections.user).doc(creator).get();
            const userData: any = userSnap.data();
            await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 16,
                    typeItemId: 'token',
                    itemId: creditAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: creditName,
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
                        follower: '',
                        pod: '',
                        comment: '',
                        token: creditName,
                        amount: '',
                        onlyInformation: false,
                    }
                });
            })

            const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, userData.firstName);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Discussions', creator, userData.firstName, 'general');
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Information', creator, userData.firstName, 'announcements');

            res.send({ success: true, data: { id: creditAddress } });
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
        const address = body.userId;   // user addr
        const amount = body.amount;

        const date = Date.now();
        const txnId = generateUniqueId();

        const blockchainRes = await priviCredit.depositFunds(creditAddress, address, amount, date, txnId, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add transaction to credit doc
            let objList: any[] = [];
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == creditAddress || obj.To == creditAddress) objList.push(obj);
            }
            objList.forEach((obj) => {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).add(obj)
            });

            createNotification(address, "Privi Credit - Credit Deposited",
                `You have succesfully deposited ${amount} Coins into your Privi Credit loan`,
                notificationTypes.priviCreditDeposited
            );

            const userSnap = await db.collection(collections.user).doc(address).get();
            const userData: any = userSnap.data();
            await notificationsController.addNotification({
                userId: address,
                notification: {
                    type: 17,
                    typeItemId: 'token',
                    itemId: '',
                    follower: '',
                    pod: '',
                    comment: '',
                    token: '',
                    amount: 0,
                    onlyInformation: false,
                }
            });
            userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 43,
                        typeItemId: 'user',
                        itemId: address,
                        follower: '',
                        pod: '',
                        comment: '',
                        token: '',
                        amount: 0,
                        onlyInformation: false,
                    }
                });
            });

            // update total deposited
            const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
            const priviCreditData: any = priviCreditSnap.data();
            let totalDeposited = priviCreditData.TotalDeposited ?? 0;
            totalDeposited += amount;
            priviCreditSnap.ref.update({
                TotalDeposited: totalDeposited
            });

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
        const address = body.userId;   // user addr
        const amount = body.amount;
        const collaterals = body.collaterals;

        const date = Date.now();
        const txnId = generateUniqueId();
        const rateOfChange = await getRateOfChangeAsMap();

        const blockchainRes = await priviCredit.borrowFunds(creditAddress, address, amount, date, txnId, collaterals, rateOfChange, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add transaction to credit doc
            let objList: any[] = [];
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let key = "";
            let obj: any = null;
            for ([key, obj] of Object.entries(transactions)) {
                if (obj.From == creditAddress || obj.To == creditAddress) objList.push(obj);
            }
            objList.forEach((obj) => {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).add(obj);
            });

            createNotification(address, "Privi Credit - Loan Borrowed",
                `You have succesfully borrowed a Privi Credit loan offer, enjoy your ${amount} Coins`,
                notificationTypes.priviCreditBorrowed
            );

            const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
            const priviCreditData: any = priviCreditSnap.data();
            await notificationsController.addNotification({
                userId: priviCreditData.Creator,
                notification: {
                    type: 18,
                    typeItemId: 'token',
                    itemId: creditAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: creditAddress,
                    amount: amount,
                    onlyInformation: false,
                }
            });
            // update total borrowed
            let totalBorrowed = priviCreditData.TotalBorrowed ?? 0;
            totalBorrowed += amount;
            priviCreditSnap.ref.update({
                TotalBorrowed: totalBorrowed
            })

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


/**
 * Function called when a user request to follow a pod (FT/NFT), updating both user and firebase docs 
 * @param req {userId, creditId}
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.followCredit = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userAddress = body.userId;
        const creditAddress = body.creditId;
        if (await follow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) res.send({ success: true });
        else res.send({ success: false });

    } catch (err) {
        console.log('Error in controllers/priviCreditController -> followCredit(): ', err);
        res.send({ success: false });
    }
};

/**
 * Function called when a user request to unfollow a Privi Credit, updating both user and firebase docs 
 * @param req {userId, podId, podType} podType in [FT, NFT]
 * @param res {success}. success: boolean that indicates if the opreaction is performed.
 */
exports.unfollowCredit = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userAddress = body.userId;
        const creditAddress = body.creditId;
        if (await unfollow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) res.send({ success: true });
        else res.send({ success: false });
    } catch (err) {
        console.log('Error in controllers/priviCreditController -> unFollowCredit(): ', err);
        res.send({ success: false });
    }
};

///////////////////////////// GETS //////////////////////////////

// getter for the whole collection, Optimization TODO: only return the necessary data to FE in order to reduce transmission load
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

// given an id, return the complete data of a certain privi credit 
exports.getPriviCredit = async (req: express.Request, res: express.Response) => {
    try {
        let creditId = req.params.creditId;
        const creditSnap = await db.collection(collections.priviCredits).doc(creditId).get();
        if (creditSnap.exists) {
            // lenders and borrowers
            const lenders: any[] = [];
            const borrowers: any[] = [];
            const lendersSnap = await creditSnap.ref.collection(collections.priviCreditsLending).get();
            const borrowersSnap = await creditSnap.ref.collection(collections.priviCreditsBorrowing).get();
            lendersSnap.forEach((doc) => {
                lenders.push(doc.data());
            });
            borrowersSnap.forEach((doc) => {
                borrowers.push(doc.data());
            });
            // borrowers ponderated mean scores (trust, endorsement)
            let totalBorrowed = 0;
            let trustMean = 0;
            let endorsementMean = 0;
            const borrowerScores: any[] = [];
            for (var i = 0; i < borrowers.length; i++) {
                const borrower = borrowers[i];
                const id = borrower.BorrowerAddress;
                const userSnap = await db.collection(collections.user).doc(id).get();
                if (userSnap.exists) {
                    const data: any = userSnap.data();
                    borrowerScores.push({
                        borrowed: borrower.Amount,
                        endorsementScore: data.endorsementScore,
                        trustScore: data.trustScore
                    })
                    totalBorrowed += borrower.Amount;
                }
            }
            borrowerScores.forEach((borrower) => {
                trustMean += borrower.trustScore * (borrower.borrowed / totalBorrowed);
                endorsementMean += borrower.endorsementScore * (borrower.borrowed / totalBorrowed);
            })

            const data = {
                ...creditSnap.data(),
                id: creditSnap.id,
                Lenders: lenders,
                Borrowers: borrowers,
                BorrowerTrustScore: trustMean,
                BorrowerEndorsementScore: endorsementMean,
            }
            res.send({ success: true, data: data });
        }
        else {
            console.log('Error in controllers/priviCredit -> getPriviCredit(): cant find credit with the given id ', creditId);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPriviCredit(): ', err);
        res.send({ success: false });
    }
};

// given the credit id, return the complete data of a certain privi credit 
exports.getPriviTransactions = async (req: express.Request, res: express.Response) => {
    try {
        let creditId = req.params.creditId;
        const data: any[] = [];
        const creditTxnSnap = await db.collection(collections.priviCredits).doc(creditId).collection(collections.priviCreditsTransactions).get();
        creditTxnSnap.forEach((doc) => {
            data.push(doc.data());
        })
        res.send({ success: true, data: data });
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPriviTransactions(): ', err);
        res.send({ success: false });
    }
};

// given the credit id, return all the data necessary for the graph, that is the history of interest, deposited, borrowed and available.
exports.getHistories = async (req: express.Request, res: express.Response) => {
    try {
        let creditId = req.params.creditId;
        const interestHistory: any[] = [];
        const depositedHistory: any[] = [];
        const borrowedHistory: any[] = [];
        const availableHistory: any[] = [];

        const creditRef = db.collection(collections.priviCredits).doc(creditId);
        const interestSnap = await creditRef.collection(collections.priviCreditInterestHistory).get();
        const depositedSnap = await creditRef.collection(collections.priviCreditDepositedHistory).get();
        const borrowedSnap = await creditRef.collection(collections.priviCreditBorrowedHistory).get();
        const availableSnap = await creditRef.collection(collections.priviCreditAvailableHistory).get();
        interestSnap.forEach((doc) => {
            interestHistory.push(doc.data());
        });
        depositedSnap.forEach((doc) => {
            depositedHistory.push(doc.data());
        });
        borrowedSnap.forEach((doc) => {
            borrowedHistory.push(doc.data());
        });
        availableSnap.forEach((doc) => {
            availableHistory.push(doc.data());
        });
        res.send({
            success: true, data: {
                interestHistory: interestHistory,
                depositedHistory: depositedHistory,
                borrowedHistory: borrowedHistory,
                availableHistory: availableHistory
            }
        });
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getHistories(): ', err);
        res.send({ success: false });
    }
};

/////////////////////////// CRON JOBS //////////////////////////////

// interest manager scheduled every day at 00:00
exports.payInterest = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("******** Privi Credit payInterest ********");
        const creditsSnap = await db.collection(collections.priviCredits).get();
        const credits = creditsSnap.docs;
        for (let i = 0; i <= credits.length; i++) {
            const creditAddress = credits[i].id;
            const data = credits[i].data();
            if (data) {
                const frequency = data.Frequency;
                const paymentDay = 1; // fixed for now
                if (isPaymentDay(frequency, paymentDay)) {
                    const date = Date.now();
                    const txnId = generateUniqueId();
                    const blockchainRes = await priviCredit.payInterest(creditAddress, date, txnId, apiKey);
                    if (blockchainRes && blockchainRes.success) {
                        updateFirebase(blockchainRes);
                        const transactions = blockchainRes.output.Transactions;
                        let tid: string = "";
                        let txnObj: any = null;
                        let totalInterest = data.TotalInterest ?? 0;
                        for ([tid, txnObj] of Object.entries(transactions)) {
                            const from = txnObj.From;
                            const to = txnObj.To;
                            if (txnObj.Type && txnObj.Type == notificationTypes.priviCreditInterest && from && to == creditAddress) {
                                createNotification(from, "Privi Credit - Interest Payment",
                                    ` `,
                                    notificationTypes.priviCreditInterest
                                );
                                await notificationsController.addNotification({
                                    userId: from,
                                    notification: {
                                        type: 25,
                                        typeItemId: 'user',
                                        itemId: from,
                                        follower: '',
                                        pod: '',
                                        comment: '',
                                        token: '',
                                        amount: 0,
                                        onlyInformation: false,
                                    }
                                });
                                totalInterest += txnObj.Amount;
                            }
                        }
                        // update total interest
                        db.collection(collections.priviCredits).doc(creditAddress).update({ TotalInterest: totalInterest });
                    }
                    else {
                        console.log('Error in controllers/priviCredit -> payInterest(): success = false for credit ', creditAddress, blockchainRes.message);
                    }
                }
            }
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> payInterest()', err);
    }
});

// cron scheduled every day at 00:00, generates a doc for Deposited, Borrowed and Available history collections
exports.manageHistory = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("******** Privi Credit manageHistory ********");
        const creditsSnap = await db.collection(collections.priviCredits).get();
        creditsSnap.forEach((doc) => {
            const data: any = doc.data();
            const totalInterest = data.TotalInterest ?? 0;
            const totalDeposited = data.TotalDeposited ?? 0;
            const totalBorrowed = data.TotalBorrowed ?? 0;
            // add to interest history colection
            doc.ref.collection(collections.priviCreditInterestHistory).add({
                interest: totalInterest,
                date: Date.now()
            });
            // add to deposited history colection
            doc.ref.collection(collections.priviCreditDepositedHistory).add({
                deposited: totalDeposited,
                date: Date.now()
            });
            // add to borrowed history colection
            doc.ref.collection(collections.priviCreditBorrowedHistory).add({
                borrowed: totalBorrowed,
                date: Date.now()
            });
            // add to available history colection
            doc.ref.collection(collections.priviCreditAvailableHistory).add({
                available: totalDeposited - totalBorrowed,
                date: Date.now()
            });
        });
    } catch (err) {
        console.log('Error in controllers/priviCredit -> payInterest()', err);
    }
});
