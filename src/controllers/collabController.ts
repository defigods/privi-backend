import express from "express";
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';
import { TwitterClient } from 'twitter-api-client';

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


const config2 = {
    apiKey: '7zIOdV7fG0hPNRU3McZuAqp3w',
    apiSecret: 'Ti17IYmlHMZLfQtBJ17AIa2ea0LkZ6Q6Ve5cgqXlYKBahnytLq',
    accessToken: '1152134295013777409-zRyzXdGumjG5Qf5H9EmeleDx7DJ8gE',
    accessTokenSecret: '4wrqJVhQuERIMVaAqUmV94lPT5HBtd9O7pbfoFjg8z4UC',
}

const twitterClient = new TwitterClient(config2);

module.exports.getTwitterUsers = async (req: express.Request, res: express.Response) => {
    try {
        const retData: any[] = [];
        const query = req.query;
        const q: any = query.q;
        const data = await twitterClient.accountsAndUsers.usersSearch({ q: q });
        data.forEach((user) => {
            retData.push({
                name: user.name,
                username: user.screen_name
            })
        });
        res.send({ success: true, data: retData });
    } catch (err) {
        console.log('Error in controllers/collabController -> getTwitterUsers()', err);
        res.send({ success: false });
    }
};