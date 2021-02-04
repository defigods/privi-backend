import express from "express";
import {generateUniqueId, updateFirebase} from "../functions/functions";
import {db} from "../firebase/firebase";
import collections from "../firebase/collections";
import cron from 'node-cron';
import votation from "../blockchain/votation";
import coinBalance from '../blockchain/coinBalance';
import path from "path";
import fs from "fs";

const communityWallController = require('./communityWallController');
const apiKey = "PRIVI"; // just for now
const treasurer = "TREASURER";

exports.createVoting = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const uid = generateUniqueId();

        let isAdmin : boolean = false;
        let checkUserRole : any;

        const userRef = db.collection(collections.user).doc(body.userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        if (body.itemType === 'Pod') {
            const podRef = db.collection(collections.podsFT).doc(body.itemId);
            const podGet = await podRef.get();
            const pod: any = podGet.data();

            isAdmin = await checkIfUserIsAdmin(pod.Creator, body.userId);

        } else if(body.itemType === 'Community') {
            const communityRef = db.collection(collections.community).doc(body.itemId);
            const communityGet = await communityRef.get();
            const community: any = communityGet.data();

            if(body.type === 'regular') {
                checkUserRole = await communityWallController.checkUserRole(body.userId, user.email, body.itemId, true, false, ['Moderator'])
            } else {
                checkUserRole = await communityWallController.checkUserRole(body.userId, user.email, body.itemId, true, false, ['Treasurer'])
            }
            isAdmin = await checkIfUserIsAdmin(community.Creator, body.userId);
            console.log(isAdmin, community.Creator, body.userId)

        } else if(body.itemType === 'CreditPool') {
            const priviCreditsRef = db.collection(collections.priviCredits).doc(body.itemId);
            const priviCreditsGet = await priviCreditsRef.get();
            const priviCredits: any = priviCreditsGet.data();

            isAdmin = await checkIfUserIsAdmin(priviCredits.Creator, body.userId);

        } else {
            console.log('Error in controllers/votingController -> createVotation()', 'Voting ItemType is unknown');
            res.send({success: false, error: 'Voting ItemType is unknown'})
        }

        if(isAdmin || checkUserRole.checked) {
            let voting: any = {
                VotationId: uid,
                Type: body.type,
                ItemType: body.itemType,
                ItemId: body.itemId,
                Question: body.question,
                CreatorAddress: body.creatorAddress,
                CreatorId: body.userId,
                Answers: [],
                OpenVotation: false,
                Description: body.description,
                StartingDate: body.startingDate,
                EndingDate: body.endingDate
            }

            if(body.startingDate < Date.now()) {
                voting.OpenVotation = true
            }

            if(voting.Type && voting.ItemType) {
                if (voting.Type === 'staking') {
                    voting.VotationAddress = body.votationAddress;
                    voting.VotationToken = body.votationToken;
                    voting.TotalVotes = body.totalVotes;
                    voting.QuorumRequired = body.quorumRequired/100;
                    voting.Hash = body.hash;
                    voting.Signature = body.signature;
                    voting.PossibleAnswers = ['Yes', 'No'];
                    voting.Caller = 'PRIVI';
                    voting.hasPhoto = false;

                    console.log(voting);
                    const blockchainRes = await votation.createVotation(voting);
                    if (blockchainRes && blockchainRes.success) {
                        updateFirebase(blockchainRes);
                        await db.runTransaction(async (transaction) => {
                            transaction.set(db.collection(collections.voting).doc('' + voting.VotationId), voting)
                        })
                    } else {
                        console.log('Error in controllers/votingController -> createVotation()', blockchainRes.message);
                        res.send({success: false, error: blockchainRes.message});
                        return;
                    }
                } else if (voting.Type === 'regular') {
                    voting.PossibleAnswers = body.possibleAnswers;
                    await db.runTransaction(async (transaction) => {
                        transaction.set(db.collection(collections.voting).doc('' + voting.VotationId), voting)
                    })
                } else if (voting.Type === 'multisignature') {
                    if (voting.NumberOfSignatures <= 1) {
                        let mes = 'wrong number of signatures: ' + voting.NumberOfSignatures;
                        console.log('Error in controllers/votingController -> createVotation()', mes);
                        res.send({success: false, error: mes});
                    }

                    const blockchainRes = await coinBalance.balanceOf(voting.TranferFrom, voting.TokenToTransfer);
                    if (blockchainRes && blockchainRes.success) {
                        const balance = blockchainRes.output.Amount;
                        if (balance < voting.AmountToTransfer) {
                            let mes = 'amount to transfer ' + voting.AmountToTransfer + ' is more than current balance: ' + voting.AmountToTransfer;
                            console.log('Error in controllers/votingController -> createVotation()', mes);
                            res.send({success: false, error: mes});
                        }
                    }

                    /*let isRightRole = checkIfUserHasRightRole(voting.CreatorId, treasurer)
                    if (isRightRole) {
                        voting.NumberOfSignatures = body.numberOfSignatures;
                        voting.AmountToTransfer = body.amountToTransfer;
                        voting.TokenToTransfer = body.tokenToTransfer;
                        voting.TransferFrom = body.transferFrom;
                        voting.TransferTo = body.transferTo;
                        voting.OrderType = body.orderType; // buy or sell
                        voting.PossibleAnswers = ['Yes', 'No'];
                    } else {
                        let mes = 'User ' + voting.CreatorId + ' does not have the right role for creating multisignature votation';
                        console.log('Error in controllers/votingController -> createVotation()', mes);
                        res.send({success: false, error: mes});
                    }*/

                } else {
                    console.log('Error in controllers/votingController -> createVotation()', 'Voting type is unknown');
                    res.send({success: false, error: 'Voting type is unknown'});
                    return;
                }

                if (voting.ItemType === 'Pod') {
                    const podRef = db.collection(collections.podsFT).doc(voting.ItemId);
                    const podGet = await podRef.get();
                    const pod: any = podGet.data();

                    await updateItemTypeVoting(podRef, podGet, pod, uid, voting);

                } else if(voting.ItemType === 'Community') {
                    const communityRef = db.collection(collections.community).doc(voting.ItemId);
                    const communityGet = await communityRef.get();
                    const community: any = communityGet.data();

                    await updateItemTypeVoting(communityRef, communityGet, community, uid, voting);

                } else if(voting.ItemType === 'CreditPool') {
                    const priviCreditsRef = db.collection(collections.priviCredits).doc(voting.ItemId);
                    const priviCreditsGet = await priviCreditsRef.get();
                    const priviCredits: any = priviCreditsGet.data();

                    await updateItemTypeVoting(priviCreditsRef, priviCreditsGet, priviCredits, uid, voting);

                } else {
                    console.log('Error in controllers/votingController -> createVotation()', 'Voting ItemType is unknown');
                    res.send({success: false, error: 'Voting ItemType is unknown'})
                }
            } else {
                console.log('Error in controllers/votingController -> createVotation()', 'Voting Type or ItemType is unknown');
                res.send({success: false, error: 'Voting Type or ItemType is unknown'})
            }
            res.send({
                success: true, data: voting
            })
        } else {
            console.log('Error in controllers/votingController -> createVotation()', "You don't have rights to create voting");
            res.send({success: false, error: "You don't have rights to create voting"})

        }
    } catch (e) {
        console.log('Error in controllers/votingController -> createVoting()', e);
        res.send({success: false, error: e});
    }
}

exports.changeVotingPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const votingRef = db.collection(collections.voting)
              .doc(req.file.originalname);
            const votingGet = await votingRef.get();
            const voting: any = await votingGet.data();

            if (voting.hasPhoto) {
                await votingRef.update({
                    hasPhoto: true
                });
            }

            res.send({ success: true });
        } else {
            console.log('Error in controllers/communityController -> changeVotingPhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communityController -> changeVotingPhoto()', err);
        res.send({ success: false });
    }
}

exports.makeVote = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        if (!body || !body.userId || body.voteIndex === -1 ||
            !body.type || !body.votationId || !body.itemType || !body.itemId) {
            console.log('Error in controllers/votingController -> makeVote()', 'Info not provided');
            res.send({success: false, error: 'Info not provided'});
        } else {
            let possibleVoters : any[] = await getPossibleVoters(body.itemType, body.itemId);

            let foundUser : boolean = false;
            let isUserRole : any;

            if(body.itemType === 'Pod' || body.itemType === 'CreditPool') {
                let foundUserIndex = possibleVoters.findIndex(voter => voter === body.userId);
                if(foundUserIndex !== -1) {
                    foundUser = true;
                }
            } else if(body.itemType === 'Community') {
                const userRef = db.collection(collections.user).doc(body.userId);
                const userGet = await userRef.get();
                const user: any = userGet.data();

                isUserRole = await communityWallController.checkUserRole(body.author, user.email, body.communityId, true, true, ['Moderator', 'Treasurer']);
            } else {
                foundUser = true;
            }


            if(foundUser || isUserRole.checked) {
                let vote: any = {
                    UserId: body.userId,
                    VoteIndex: body.voteIndex,
                    Date: Date.now()
                }

                if (body.type === 'staking') {
                    vote.VoterAddress = body.voterAddress;
                    vote.VotationId = body.votationId;
                    vote.StakedAmount = body.stakedAmount;
                    vote.Hash = body.hash;
                    vote.Signature = body.signature;

                    const blockchainRes = await votation.makeVote(vote);
                    if (blockchainRes && blockchainRes.success) {
                        updateFirebase(blockchainRes);
                    } else {
                        console.log('Error in controllers/votingController -> createVotation()', blockchainRes.message);
                        res.send({success: false, error: blockchainRes.message})
                    }
                } else if (body.type === 'regular' || body.type === 'multisignature') {
                    const votingRef = db.collection(collections.voting).doc(body.votationId);
                    const votingGet = await votingRef.get();
                    const voting: any = votingGet.data();

                    let answers: any[] = [];
                    if (!(voting && voting.OpenVotation && voting.StartingDate < Date.now() && voting.EndingDate > Date.now())) {
                        console.log('Error in controllers/votingController -> makeVote()', 'Voting is closed or missing')
                        res.send({success: false, error: 'Voting is closed or missing'});
                        return
                    }

                    if (voting.Answers && voting.Answers.length > 0) {
                        let foundVote = voting.Answers.findIndex(item => item.UserId === body.userId);
                        if(foundVote !== -1) {
                            let votingAnswers = [...voting.Answers];
                            votingAnswers.push(vote);
                            answers = votingAnswers;
                            if (body.type === 'multisignature') {
                                let isRightRole = await checkIfUserHasRightRole(vote.VoterAddress, treasurer);
                                if (!isRightRole) {
                                    let mes = 'User ' + vote.VoterAddress + ' does not have the right role for voting in multisignature votation';
                                    console.log('Error in controllers/votingController -> createVotation()', mes);
                                    res.send({success: false, error: mes});

                                }
                                if (answers.length >= voting.NumberOfSignatures) {
                                    coinBalance.transfer("transfer", voting.TransferFrom, voting.TransferTo,
                                        voting.AmountToTransfer, voting.TokenToTransfer, apiKey).then((blockchainRes) => {
                                        if (!blockchainRes.success) {
                                            console.log(`user ${voting.TransferTo} did not get ${voting.TokenToTransfer}, ${blockchainRes.message}`);
                                            res.send({success: false});
                                        }
                                    });
                                    await votingRef.update({
                                        Answers: answers,
                                        OpenVotation: false
                                    });
                                    res.send({success: true, data: vote});
                                }
                            }
                        } else {
                            res.send({success: false, error: "You've already voted"});
                            return;
                        }
                    } else {
                        answers.push(vote);
                    }
                    await votingRef.update({
                        Answers: answers
                    })
                }
                res.send({success: true, data: vote});
            } else {
                res.send({success: false, error: "You don't have rights to vote"});
            }
        }
    } catch (err) {
        console.log('Error in controllers/votingController -> makeVote()', err)
        res.send({success: false, error: err})
    }
}

exports.endVoting = cron.schedule('* */1 * * *', async () => {
    // TODO at some point we should add here request with limit and offset to avoid performance issue
    try {
        console.log("********* Voting endVoting() cron job started *********");
        const votingSnap = await db.collection(collections.voting).get();
        votingSnap.forEach(async (voting) => {
            let votingData = voting.data()
            let endingDate = votingData.endingDate;
            if (endingDate > Date.now()) {
                const votingRef = db.collection(collections.voting).doc(votingData.id);
                votingRef.update({
                    OpenVotation: false
                });
            }
        })

        const votationSnap = await db.collection(collections.votation).get();
        votationSnap.forEach(async (voting) => {
            let votationData = voting.data();
            let endingDate = votationData.EndingDate;
            if (endingDate > Date.now()) {
                let votationEnd = {
                    VotationId: votationData.VotationId,
                }
                const blockchainRes = await votation.endVotation(votationEnd);

                if (blockchainRes && blockchainRes.success) {
                    updateFirebase(blockchainRes);
                }
            }
        });
    } catch (err) {
        console.log('Error in controllers/votingController -> endVoting()', err)
    }
});

exports.getVotationInfo = async (req: express.Request, res: express.Response) => {
    try {
        const votationId = req.params.VotationId;
        const votingRef = db.collection(collections.voting).doc(votationId);
        const votingGet = await votingRef.get();
        const voting: any = votingGet.data();

        res.send({
            success: true,
            data: voting
        });
    } catch (e) {
        console.log('Error in controllers/votingController -> getVotationInfo()', e);
        res.send({
            success: false,
            message: e
        });
    }
}


const updateItemTypeVoting = (itemRef, itemGet, item, uid, voting) => {
    return new Promise(async (resolve, reject) => {
        try {
            let votingsIdArray: any[] = [];
            if (item && item.Votings) {
                let communityVotings = [...item.Votings];
                communityVotings.push(uid);
                votingsIdArray = communityVotings;
            } else {
                votingsIdArray.push(voting.VotationId)
            }

            await itemRef.update({
                Votings: votingsIdArray
            });

            resolve(true)
        } catch(e) {
            reject('Error in updateItemTypeVoting: ' + e);
        }
    });
}


const getPossibleVoters = (itemType, itemId) : Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            let possibleVoters : any = [];

            if(itemType === 'Community') {
                const communityRef = db.collection(collections.community)
                  .doc(itemId);
                const communityGet = await communityRef.get();
                const community: any = communityGet.data();

                // Apply future privacy limitations
                possibleVoters = null;

            } else if(itemType === 'Pod') {
                const podRef = db.collection(collections.podsFT)
                  .doc(itemId);
                const podGet = await podRef.get();
                const pod: any = podGet.data();

                possibleVoters = Object.keys(pod.Investors);

            } else if(itemType === 'CreditPool') {
                const creditPoolBorrowersSnap = await db.collection(collections.priviCredits).doc(itemId)
                  .collection(collections.priviCreditsBorrowing).get();
                const creditPoolLendersSnap = await db.collection(collections.priviCredits).doc(itemId)
                  .collection(collections.priviCreditsLending).get();

                if (!creditPoolBorrowersSnap.empty) {
                    for (const doc of creditPoolBorrowersSnap.docs) {
                        possibleVoters.push(doc.id)
                    }
                }
                if (!creditPoolLendersSnap.empty) {
                    for (const doc of creditPoolLendersSnap.docs) {
                        possibleVoters.push(doc.id)
                    }
                }
            }
            resolve(possibleVoters);
        } catch (e) {
            console.log('Error in getPossibleVoters', e);
            reject(e);
        }
    });
}

const checkIfUserIsAdmin = (creator, userId): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        if (creator === userId) {
            resolve(true);
        } else {
            resolve(false);
        }
    })
}

const checkIfUserHasRightRole = (userId, role): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userRef = db.collection(collections.user).doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();
        resolve(user.role == role);
    })
}

exports.getUserVotation = async (req: express.Request, res: express.Response) => {
    try {
        const votationId = req.params.VotationId;
        const voterAddress = req.params.VoterId;
        const voterRef = db.collection(collections.voter).doc(votationId + voterAddress);
        const voterGet = await voterRef.get();
        const voter: any = voterGet.data();

        res.send({
            success: true,
            data: voter
        });
    } catch (e) {
        console.log('Error in controllers/votingController -> getUserVotation()', e);
        res.send({
            success: false,
            message: e
        });
    }
}

exports.getVotationState = async (req: express.Request, res: express.Response) => {
    try {
        const votationId = req.params.VotationId;
        const votationStateRef = db.collection(collections.votationState).doc(votationId);
        const votationStateGet = await votationStateRef.get();
        const votationState: any = votationStateGet.data();

        res.send({
            success: true,
            data: votationState
        });
    } catch (e) {
        console.log('Error in controllers/votingController -> getVotationInfo()', e);
        res.send({
            success: false,
            message: e
        });
    }
}


exports.getPhotoById = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.votingId;
        console.log(userId);
        if (userId) {
            const directoryPath = path.join("uploads", "voting");
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log("Unable to scan directory: " + err);
                }
                //listing all files using forEach
                files.forEach(function (file) {
                    // Do whatever you want to do with the file
                    console.log(file);
                });
            });

            // stream the image back by loading the file
            res.setHeader("Content-Type", "image");
            let raw = fs.createReadStream(
              path.join("uploads", "voting", userId + ".png")
            );
            raw.on("error", function (err) {
                console.log(err);
                res.sendStatus(400);
            });
            raw.pipe(res);
        } else {
            console.log("Error in controllers/votingController -> getPhotoById()", "There's no id...");
            res.send({ success: false, error: "There's no id..." });
        }
    } catch (err) {
        console.log("Error in controllers/votingController -> getPhotoById()", err);
        res.send({ success: false, error: err });
    }
};