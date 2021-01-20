import express from "express";
import {generateUniqueId, updateFirebase} from "../functions/functions";
import {db} from "../firebase/firebase";
import collections from "../firebase/collections";
import cron from 'node-cron';
import votation from "../blockchain/votation";

exports.createVoting = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const uid = generateUniqueId();

        let voting: any = {
            VotationId: uid,
            Type: body.Type,
            ItemType: body.ItemType,
            ItemId: body.ItemId,
            Question: body.Question,
            PossibleAnswers: body.PossibleAnswers,
            CreatorAddress: body.CreatorAddress,
            Answers: [],
            OpenVotation: true,
            StartingDate: body.StartingDate,
            EndingDate: body.EndingDate
        }

        if(voting.Type && voting.ItemType) {
            if (voting.Type === 'staking') {
                voting.VotationAddress = body.VotationAddress;
                voting.VotingToken = body.VotingToken;
                voting.QuorumRequiered = body.QuorumRequiered;
                voting.Hash = body.Hash;
                voting.Signature = body.Signature;

                const blockchainRes = await votation.createVotation(voting);
                if (blockchainRes && blockchainRes.success) {
                    updateFirebase(blockchainRes);
                } else {
                    console.log('Error in controllers/votingController -> createVotation()', blockchainRes.message);
                    res.send({success: false, error: blockchainRes.message})
                }
            } else if (voting.Type === 'regular') {
                await db.runTransaction(async (transaction) => {
                    transaction.set(db.collection(collections.voting).doc('' + voting.VotationId), voting)
                })
            } else {
                console.log('Error in controllers/votingController -> createVotation()', 'Voting type is unknown');
                res.send({success: false, error: 'Voting type is unknown'})
            }

            if (voting.ItemType === 'Pod') {
                const podRef = db.collection(collections.podsFT).doc(body.ItemId);
                const podGet = await podRef.get();
                const pod: any = podGet.data();

                await updateItemTypeVoting(podRef, podGet, pod, uid, voting);

            } else if(voting.ItemType === 'Community') {
                const communityRef = db.collection(collections.community).doc(body.ItemId);
                const communityGet = await communityRef.get();
                const community: any = communityGet.data();

                await updateItemTypeVoting(communityRef, communityGet, community, uid, voting);

            } else if(voting.ItemType === 'CreditPool') {
                const priviCreditsRef = db.collection(collections.priviCredits).doc(body.ItemId);
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
    } catch (e) {
        console.log('Error in controllers/votingController -> createVoting()', e);
        res.send({success: false, error: e});
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

exports.makeVote = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        if (!(body && body.userId && body.VotingType)) {
            console.log('Error in controllers/votingController -> makeVote()', 'Info not provided');
            res.send({success: false, error: 'Info not provided'});
        }
        let vote: any = {
            userId: body.userId,
            VotingType: body.VotingType, // YES or NO
        }

        if (body.Type === 'staking') {
            vote.VoterAddress = body.VoterAddress;
            vote.VotationId = body.VotationId;
            vote.StakedAmount = body.StakedAmount;
            vote.VotationAddress = body.VotationAddress;
            vote.Hash = body.Hash;
            vote.Signature = body.Signature;

            const blockchainRes = await votation.makeVote(vote);
            if (blockchainRes && blockchainRes.success) {
                updateFirebase(blockchainRes);
            } else {
                console.log('Error in controllers/votingController -> createVotation()', blockchainRes.message);
                res.send({success: false, error: blockchainRes.message})
            }
        } else if (body.Type === 'regular') {
            const votingRef = db.collection(collections.Voting).doc(body.VotationId);
            const votingGet = await votingRef.get();
            const voting: any = votingGet.data();

            let answers: any[] = [];
            if (!(voting && voting.openVotation && voting.StartingDate < Date.now() && voting.EndingDate > Date.now())) {
                console.log('Error in controllers/votingController -> makeVote()', 'Voting is closed or missing')
                res.send({success: false, error: 'Voting is closed or missing'});
                return
            }

            if (voting.answers) {
                let votingAnswers = [...voting.answers];
                votingAnswers.push(vote);
                answers = votingAnswers;
            } else {
                answers.push(vote);
            }

            await votingRef.update({
                answers: answers
            })
        }

        res.send({success: true, data: vote});
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
                const votingRef = db.collection(collections.Voting).doc(votingData.id);
                votingRef.update({
                    openVotation: false
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
                    VotationAddress: votationData.VotationAddress,
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
        const votingRef = db.collection(collections.Voting).doc(votationId);
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