import express from 'express';
import { db } from '../firebase/firebase';
import collections from '../firebase/collections';
import { generateUniqueId } from '../functions/functions';
import fs from 'fs';
import path from 'path';

exports.createChat = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const {title, description, podId } = body;
        if(!podId) res.status(200).send({
            success: false,
            error: 'Error in controllers/podDiscussionController -> createChat(): Non Users Provided Correctly',
        })

        const podRef = await db.collection(collections.podDiscussions).doc(podId);
        const podData: any = podRef.get();

        if(!podData.exists) await podRef.set({});
        const topicId = body.topicId ?? generateUniqueId();
        const topicRef = await podRef.collection(collections.topicRoom).doc(topicId);
        let topicData: any = topicRef.get();
        if(!topicData.exists) {
            const users = (await db.collection(collections.user).listDocuments()).map(it => 
                ({userId: it.id, roles: ['creators' , 'collabs' , 'investors']}));
            await topicRef.set({
                title,
                description,
                users,
                created: Date.now(),
                lastMessage: null,
                lastMessageDate: null,
                messages: [],
            });
        }
        console.log('get Test', topicData);
        topicData = topicRef.get();
        res.status(200).send({
            success: true,
            data: {
                topicId,
                topicData
            }
        });
    }
    catch (e) {
        console.log('Error in controllers/podDiscussionController -> createChat() ' + e);
        res.send({ success: false, error: e });
    }
};

