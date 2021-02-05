import express from 'express';
import priviCredit from "../blockchain/priviCredit";
import { updateFirebase, createNotification, generateUniqueId, getRateOfChangeAsMap, filterTrending, isPaymentDay, follow, unfollow, addZerosToHistory } from "../functions/functions";
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

        const trustScore = body.Requirements.TrustScore;
        const endorsementScore = body.Requirements.EndorsementScore;
        const collateralsAccepted = body.Requirements.CollateralsAccepted;
        const ccr = body.Requirements.CCR;

        const initialDeposit = body.Initialisation.InitialDeposit;
        const hash = body.Initialisation.Hash;
        const signature = body.Initialisation.Signature;

        if (!body.priviUser || !body.priviUser.id || body.priviUser.id != creator) {
            console.log("creator not matching jwt user");
            res.send({ success: false, message: "creator not matching jwt user" });
            return;
        }

        const blockchainRes = await priviCredit.initiatePRIVIcredit(creator, creditName, lendingToken, maxFunds, interest, frequency, p_incentive,
            p_premium, dateExpiration, trustScore, endorsementScore, collateralsAccepted, ccr, initialDeposit, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            await updateFirebase(blockchainRes);
            const output = blockchainRes.output;
            const updatedCreditInfo = output.UpdatedCreditInfo;
            const creditAddress = Object.keys(updatedCreditInfo)[0];

            // add some more data to firebase
            const description = body.Description;
            const admins = body.Admins; // string[]
            const insurers = body.Insurers; // string[]
            const userRoles = body.UserRoles;   // {name, role, status}[]

            const userSnap = await db.collection(collections.user).doc(creator).get();
            const userData: any = userSnap.data();

            const discordChatJarrCreation: any = await chatController.createDiscordChat(creator, userData.firstName);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Discussions', creator, userData.firstName, 'general', false, []);
            await chatController.createDiscordRoom(discordChatJarrCreation.id, 'Information', creator, userData.firstName, 'announcements', false, []);

            db.collection(collections.priviCredits).doc(creditAddress).set({
                Description: description,
                Admins: admins,
                Insurers: insurers,
                UserRoles: userRoles,
                Posts: [],
                JarrId: discordChatJarrCreation.id,
            }, { merge: true })

            // add transaction to credit doc
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).doc(tid).set({ Transactions: txnArray });
            }

            // update user levels
            let numCreatedPriviCredits = 0;
            const userLevelSnap = await db.collection(collections.levels).doc(creator).get();
            const data: any = userLevelSnap.data();
            if (data && data.NumCreatedPriviCredits) numCreatedPriviCredits = data.NumCreatedPriviCredits;
            numCreatedPriviCredits += 1;
            userLevelSnap.ref.set({ NumCreatedPriviCredits: numCreatedPriviCredits });

            // add zeros to graph
            const creditRef = db.collection(collections.priviCredits).doc(creditAddress);
            addZerosToHistory(creditRef.collection(collections.priviCreditAvailableHistory), "available");
            addZerosToHistory(creditRef.collection(collections.priviCreditBorrowedHistory), "borrowed");
            addZerosToHistory(creditRef.collection(collections.priviCreditDepositedHistory), "deposited");
            addZerosToHistory(creditRef.collection(collections.priviCreditInterestHistory), "interest");

            await notificationsController.addNotification({
                userId: creator,
                notification: {
                    type: 33,
                    typeItemId: 'token',
                    itemId: creditAddress,
                    follower: '',
                    pod: '',
                    comment: '',
                    token: creditName,
                    amount: '',
                    onlyInformation: false,
                    otherItemId: ''
                }
            });
            userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 59,
                        typeItemId: 'user',
                        itemId: creator,
                        follower: userData.firstName,
                        pod: '',
                        comment: '',
                        token: creditName,
                        amount: '',
                        onlyInformation: false,
                        otherItemId: creditAddress
                    }
                });
            })

            res.send({ success: true, data: { id: creditAddress } });
        }
        else {
            console.log('Error in controllers/priviCredit -> initiateCredit(): success = false', blockchainRes.message);
            res.send({ success: false, error: blockchainRes.message });
            return;
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> initiateCredit(): ', err);
        res.send({ success: false, error: err });
        return;
    }
};

exports.depositFunds = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creditAddress = body.CreditAddress;
        const address = body.Address;   // userId
        const amount = body.Amount;
        const hash = body.Hash;
        const signature = body.Signature;

        if (address != body.priviUser.id) {
            console.log("UserId doesnt match with jwt");
            res.send({ sucess: false, message: "UserId doesnt match with jwt" });
            return;
        }

        const blockchainRes = await priviCredit.depositFunds(creditAddress, address, amount, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);

            // add transaction to credit doc
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).doc(tid).set({ Transactions: txnArray });
            }

            const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
            const priviCreditData: any = priviCreditSnap.data();
            const userSnap = await db.collection(collections.user).doc(address).get();
            const userData: any = userSnap.data();
            const userCreatorSnap = await db.collection(collections.user).doc(priviCreditData.Creator).get();
            const userCreatorData: any = userCreatorSnap.data();
            /*userData.followers.forEach(async (item, i) => {
                await notificationsController.addNotification({
                    userId: item.user,
                    notification: {
                        type: 0,
                        typeItemId: 'user',
                        itemId: address,
                        follower: '',
                        pod: '',
                        comment: '',
                        token: '',
                        amount: 0,
                        onlyInformation: false,
                        otherItemId: ''
                    }
                });
            });*/


            await notificationsController.addNotification({
                userId: address,
                notification: {
                    type: 39,
                    typeItemId: 'token',
                    itemId: '',
                    follower: '',
                    pod: priviCreditData.CreditName,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });
            await notificationsController.addNotification({
                userId: priviCreditData.Creator,
                notification: {
                    type: 35,
                    typeItemId: 'user',
                    itemId: address,
                    follower: userData.firstName,
                    pod: priviCreditData.CreditName,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });

            let investors: any[] = [];
            const creditPoolBorrowersSnap = await db.collection(collections.priviCredits).doc(creditAddress)
                .collection(collections.priviCreditsBorrowing).get();
            const creditPoolLendersSnap = await db.collection(collections.priviCredits).doc(creditAddress)
                .collection(collections.priviCreditsLending).get();
            if (!creditPoolBorrowersSnap.empty) {
                for (const doc of creditPoolBorrowersSnap.docs) {
                    let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
                    if (foundIndexInvestor === -1) {
                        investors.push(doc.id);
                    }
                }
            }

            if (!creditPoolLendersSnap.empty) {
                for (const doc of creditPoolLendersSnap.docs) {
                    let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
                    if (foundIndexInvestor === -1) {
                        investors.push(doc.id);
                    }
                }
            }

            console.log(investors);
            for (const investor of investors) {
                if (investor !== address) {
                    await notificationsController.addNotification({
                        userId: investor,
                        notification: {
                            type: 64,
                            typeItemId: 'user',
                            itemId: address,
                            follower: userData.firstName,
                            pod: priviCreditData.CreditName,
                            comment: '',
                            token: '',
                            amount: amount,
                            onlyInformation: false,
                            otherItemId: creditAddress
                        }
                    });
                }
            }
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
        const creditAddress = body.CreditAddress;
        const address = body.Address;   // userId
        const amount = body.Amount;
        const collaterals = body.Collaterals;

        const hash = body.Hash;
        const signature = body.Signature;
        const rateOfChange = await getRateOfChangeAsMap();

        if (address != body.priviUser.id) {
            console.log("UserId doesnt match with jwt");
            res.send({ sucess: false, message: "UserId doesnt match with jwt" });
            return;
        }
        const blockchainRes = await priviCredit.borrowFunds(creditAddress, address, amount, collaterals, rateOfChange, hash, signature, apiKey);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            // add transaction to credit doc
            const output = blockchainRes.output;
            const transactions = output.Transactions;
            let tid = "";
            let txnArray: any = null;
            for ([tid, txnArray] of Object.entries(transactions)) {
                db.collection(collections.priviCredits).doc(creditAddress).collection(collections.priviCreditsTransactions).doc(tid).set({ Transactions: txnArray });
            }

            const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
            const priviCreditData: any = priviCreditSnap.data();
            const userSnap = await db.collection(collections.user).doc(address).get();
            const userData: any = userSnap.data();
            const userCreatorSnap = await db.collection(collections.user).doc(priviCreditData.Creator).get();
            const userCreatorData: any = userCreatorSnap.data();

            await notificationsController.addNotification({
                userId: address,
                notification: {
                    type: 37,
                    typeItemId: 'token',
                    itemId: '',
                    follower: '',
                    pod: priviCreditData.CreditName,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });
            await notificationsController.addNotification({
                userId: priviCreditData.Creator,
                notification: {
                    type: 36,
                    typeItemId: 'user',
                    itemId: address,
                    follower: userData.firstName,
                    pod: priviCreditData.CreditName,
                    comment: '',
                    token: '',
                    amount: amount,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });

            let investors: any[] = [];
            const creditPoolBorrowersSnap = await db.collection(collections.priviCredits).doc(creditAddress)
                .collection(collections.priviCreditsBorrowing).get();
            const creditPoolLendersSnap = await db.collection(collections.priviCredits).doc(creditAddress)
                .collection(collections.priviCreditsLending).get();
            if (!creditPoolBorrowersSnap.empty) {
                for (const doc of creditPoolBorrowersSnap.docs) {
                    let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
                    if (foundIndexInvestor === -1) {
                        investors.push(doc.id);
                    }
                }
            }

            if (!creditPoolLendersSnap.empty) {
                for (const doc of creditPoolLendersSnap.docs) {
                    let foundIndexInvestor = investors.findIndex((inv) => inv === doc.id);
                    if (foundIndexInvestor === -1) {
                        investors.push(doc.id);
                    }
                }
            }

            console.log(investors);
            for (const investor of investors) {
                if (investor !== address) {
                    await notificationsController.addNotification({
                        userId: investor,
                        notification: {
                            type: 63,
                            typeItemId: 'user',
                            itemId: address,
                            follower: userData.firstName,
                            pod: priviCreditData.CreditName,
                            comment: '',
                            token: '',
                            amount: amount,
                            onlyInformation: false,
                            otherItemId: creditAddress
                        }
                    });
                }
            }
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
        if (await follow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) {
            const userSnap = await db.collection(collections.user).doc(userAddress).get();
            const userData: any = userSnap.data();

            const priviCreditsRef = db.collection(collections.priviCredits).doc(creditAddress);
            const priviCreditsGet = await priviCreditsRef.get();
            const priviCredits: any = priviCreditsGet.data();

            const userCreatorSnap = await db.collection(collections.user).doc(priviCredits.Creator).get();
            const userCreatorData: any = userCreatorSnap.data();

            await notificationsController.addNotification({
                userId: userAddress,
                notification: {
                    type: 83,
                    typeItemId: 'user',
                    itemId: userAddress,
                    follower: userData.firstName,
                    pod: priviCredits.CreditName,
                    comment: '',
                    token: '',
                    amount: 0,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });
            await notificationsController.addNotification({
                userId: priviCredits.Creator,
                notification: {
                    type: 43,
                    typeItemId: 'user',
                    itemId: userAddress,
                    follower: userData.firstName,
                    pod: priviCredits.CreditName,
                    comment: '',
                    token: '',
                    amount: 0,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });

            res.send({ success: true });
        }
        else res.send({ success: false });

    } catch (err) {
        console.log('Error in controllers/priviCreditController -> followCredit(): ', err);
        res.send({ success: false, error: err });
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
        if (await unfollow(userAddress, creditAddress, collections.priviCredits, fields.followingCredits)) {
            const userSnap = await db.collection(collections.user).doc(userAddress).get();
            const userData: any = userSnap.data();

            const priviCreditsRef = db.collection(collections.priviCredits).doc(creditAddress);
            const priviCreditsGet = await priviCreditsRef.get();
            const priviCredits: any = priviCreditsGet.data();

            await notificationsController.addNotification({
                userId: userAddress,
                notification: {
                    type: 84,
                    typeItemId: 'user',
                    itemId: userAddress,
                    follower: userData.firstName,
                    pod: priviCredits.CreditName,
                    comment: '',
                    token: '',
                    amount: 0,
                    onlyInformation: false,
                    otherItemId: creditAddress
                }
            });

            res.send({ success: true });
        }
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
        const t1 = Date.now();
        const lastCredit = req.query.lastCredit;
        const allCredits: any[] = [];

        let creditsSnap : any;
        if (lastCredit) {
            creditsSnap = await db.collection(collections.priviCredits).startAfter(lastCredit).limit(5).get();
        } else {
            creditsSnap = await db.collection(collections.priviCredits).limit(5).get();
        }
        if(!creditsSnap.empty) {
            for (const doc of creditsSnap.docs) {
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
        }
        // get the trending ones
        console.log(Date.now() - t1, "ms");
        res.send({
            success: true, data: {
                allCredits: allCredits,
            }
        });
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPriviCredits(): ', err);
        res.send({success: false});
    }
};

exports.getTrendingPriviCredits = async (req: express.Request, res: express.Response) => {
    try {
        const trendingCredits: any[] = [];
        const creditsSnap = await db.collection(collections.trendingPriviCredit).get();
        creditsSnap.docs.forEach(c => {
            trendingCredits.push(c.data());
        });
        res.send({success: true, data: {trending: trendingCredits}});
    } catch (e) {
        console.log('Error in controllers/priviCredit -> getTrendingPriviCredits(): ', e);
        res.send({success: false, message: e});
    }
}

exports.setTrendingPriviCredits = cron.schedule('0 0 * * *', async () => {
    try {
        const allCredits: any[] = [];
        const creditsSnap = await db.collection(collections.priviCreditsLending).get();
        const popularity = 0.5;
        creditsSnap.docs.forEach(async c => {
            const data = c.data();
            const lenders: any[] = [];
            const borrowers: any[] = [];
            const lendersSnap = await c.ref.collection(collections.priviCreditsLending).get();
            const borrowersSnap = await c.ref.collection(collections.priviCreditsBorrowing).get();
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
        });

        const trendingCredits = filterTrending(allCredits);
        let batch = db.batch()

        await db.collection(collections.trendingPriviCredit).listDocuments().then(val => {
            val.map((val) => {
                batch.delete(val)
            })
        })
        await trendingCredits.forEach((doc) => {
            let docRef = db.collection(collections.trendingCommunity).doc();
            batch.set(docRef, doc);
        })
        await batch.commit();
    } catch (err) {
        console.log('Error in controllers/priviCredit -> setTrendingPriviCredits(): ', err);
    }
})

// given an id, return the complete data of a certain privi credit
exports.getPriviCredit = async (req: express.Request, res: express.Response) => {
    try {
        let creditId = req.params.creditId;
        console.log("asdas", creditId);
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

            let creditData: any = creditSnap.data();

            creditData.PostsArray = [];
            if (creditData.Posts && creditData.Posts.length > 0) {
                for (const post of creditData.Posts) {
                    const creditWallPostSnap = await db.collection(collections.creditWallPost).doc(post).get();
                    const creditWallPostData: any = creditWallPostSnap.data();
                    creditWallPostData.id = creditWallPostSnap.id;
                    creditData.PostsArray.push(creditWallPostData);
                }
            }

            creditData.VotingsArray = [];
            if (creditData.Votings && creditData.Votings.length > 0) {
                for (const voting of creditData.Votings) {
                    const votingSnap = await db.collection(collections.voting).doc(voting).get();
                    const votingData: any = votingSnap.data();
                    votingData.id = votingSnap.id;
                    creditData.VotingsArray.push(votingData);
                }
            }

            const data = {
                ...creditData,
                id: creditSnap.id,
                Lenders: lenders,
                Borrowers: borrowers,
                BorrowerTrustScore: trustMean,
                BorrowerEndorsementScore: endorsementMean,
            }
            res.send({ success: true, data: data });
        } else {
            console.log('Error in controllers/priviCredit -> getPriviCredit(): cant find credit with the given id ', creditId);
            res.send({
                success: false,
                error: 'Error in controllers/priviCredit -> getPriviCredit(): cant find credit with the given id '
            });
        }
    } catch (err) {
        console.log('Error in controllers/priviCredit -> getPriviCredit(): ', err);
        res.send({
            success: false,
            error: err
        });
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
                                /*createNotification(from, "Privi Credit - Interest Payment",
                                    ` `,
                                    notificationTypes.priviCreditInterest
                                );*/
                                totalInterest += txnObj.Amount;

                                const priviCreditSnap = await db.collection(collections.priviCredits).doc(creditAddress).get();
                                const priviCreditData: any = priviCreditSnap.data();
                                await notificationsController.addNotification({
                                    userId: from,
                                    notification: {
                                        type: 44,
                                        typeItemId: 'user',
                                        itemId: from,
                                        follower: '',
                                        pod: priviCreditData.CreditName,
                                        comment: '',
                                        token: '',
                                        amount: totalInterest,
                                        onlyInformation: false,
                                        otherItemId: creditAddress
                                    }
                                });
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
