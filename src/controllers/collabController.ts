import express from "express";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';

///////////////////////////// POST ///////////////////////////////
module.exports.createCollab = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.Creator;
        const collaborators = body.Collaborators;
        const idea = body.Idea;
        const platform = body.Platform;
        db.collection(collections.collabs).add({
            Creator: creator,
            Collaborators: collaborators,
            Idea: idea,
            Platform: platform
        });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/collabController -> createCollab()', err);
        res.send({ success: false });
    }
};

module.exports.upvote = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const user = body.User;
        const collabId = body.CollabId;
        const collabSnap = await db.collection(collections.collabs).doc(collabId).get();
        const data: any = collabSnap.data();
        const newUpvotes = data.Upvotes ?? {};
        newUpvotes[user] = "";
        collabSnap.ref.update({ Upvotes: newUpvotes });
        res.send({ success: true });
    } catch (err) {
        console.log('Error in controllers/collabController -> upvote()', err);
        res.send({ success: false });
    }
};

///////////////////////////// GET ///////////////////////////////

module.exports.getCollabs = async (req: express.Request, res: express.Response) => {
    try {
        const allCollabs: any[] = [];
        const trendingCollabs: any[] = [];
        const collabSnap = await db.collection(collections.collabs).get();
        const upvoteList: number[] = [];
        collabSnap.forEach((doc) => {
            const data = doc.data();
            const numUpvotes = Object.keys(data.Upvotes ?? {}).length;
            allCollabs.push({
                CollabId: doc.id,
                ...data
            });
            upvoteList.push(numUpvotes);
        });
        const mean = upvoteList.length > 0 ? upvoteList.reduce((a, b) => a + b) / upvoteList.length : 0;
        allCollabs.forEach((obj) => {
            const numUpvotes = Object.keys(obj.Upvotes ?? {}).length;
            if (numUpvotes >= mean) trendingCollabs.push(obj);
        });
        res.send({
            success: true, data: {
                allCollabs: allCollabs,
                trendingCollabs: trendingCollabs
            }
        });
    } catch (err) {
        console.log('Error in controllers/collabController -> getCollabs()', err);
        res.send({ success: false });
    }
};