import express from "express";
import {generateUniqueId} from "../functions/functions";
import {db} from "../firebase/firebase";
import collections from "../firebase/collections";
import cron from 'node-cron';

exports.createVoting = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const uid = generateUniqueId();

        const voting = {
            id: uid,
            itemType: body.itemType,
            itemId: body.itemId,
            question: body.question,
            possibleAnswers: body.possibleAnswers,
            creatorId: body.creatorId,
            answers: [],
            openVotation: true,
            endingDate: body.endingDate
        }
        await db.runTransaction(async (transaction) => {
            transaction.set(db.collection(collections.voting).doc('' + voting.id), voting)
        })

        if (voting.itemType === 'Pod') {
            const podRef = db.collection(collections.podsFT).doc(body.itemId);
            const podGet = await podRef.get();
            const pod: any = podGet.data();

            let votingsIdArray: any[] = [];
            if (pod && pod.Votings) {
                let podVotings = [...pod.Votings];
                podVotings.push(uid);
                votingsIdArray = podVotings;
            } else {
                votingsIdArray.push(voting.id)
            }

            await podRef.update({
                Votings: votingsIdArray
            })
        }

        res.send({
            success: true, data: voting
        })
    } catch (e) {
        console.log('Error in controllers/votingController -> createVoting()', e);
        res.send({success: false, error: e});
    }
}

exports.makeVote = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        if (!(body && body.userId && body.answer)) {
            console.log('Error in controllers/votingController -> makeVote()', 'Info not provided');
            res.send({success: false, error: 'Info not provided'});
        }
        const vote = {
            userId: body.userId,
            answer: body.answer
        }

        const votingRef = db.collection(collections.Voting).doc(body.votingId);
        const votingGet = await votingRef.get();
        const voting: any = votingGet.data();

        let answers: any[] = [];
        if (!(voting && voting.openVotation)) {
            console.log('Error in controllers/votingController -> makeVote()', 'Voting is closed or missing')
            res.send({success: false, error: 'Voting is closed or missing'});
            return
        }
        if (voting && voting.answers) {
            let votingAnswers = [...voting.answers];
            votingAnswers.push(vote);
            answers = votingAnswers;
        } else {
            answers.push(vote);
        }

        await votingRef.update({
            answers: answers
        })

        res.send({success: true, data: vote});
    } catch (err) {
        console.log('Error in controllers/votingController -> makeVote()', err)
        res.send({success: false, error: err})
    }
}

exports.endVoting = cron.schedule('* */1 * * *', async () => {
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
    } catch (err) {
        console.log('Error in controllers/votingController -> endVoting()', err)
    }
});