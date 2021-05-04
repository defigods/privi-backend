import express from 'express';
import { db } from '../firebase/firebase';
import collections, { podsFT } from '../firebase/collections';
import { generateUniqueId } from '../functions/functions';
import fs from 'fs';
import path from 'path';

exports.createChat = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const {title, description, podId, createdBy } = body;
        if(!podId) res.status(200).send({
            success: false,
            error: 'Error in controllers/podDiscussionController -> createChat(): PodId is not provided',
        })

        const podRef = await db.collection(collections.mediaPods).doc(podId);
        const podGet: any = await podRef.get();

        const topicId = body.topicId ?? generateUniqueId();
        const topicRef = await podRef.collection(collections.podDiscussions ).doc(topicId);
        let topicGet = await topicRef.get();
        if(!topicGet.exists) {
            let users;
            if(podGet.exists) {
                const podData = podGet.data();
                if(podData) users = [...(podData.Investors ?? []), ...(podData.Collabs ?? []), podData.Creator];
            }
            if(!users) users = [];
            await topicRef.set({
                        title,
                        description,
                        users,
                        created: Date.now(),
                        createdBy,
                        lastMessage: null,
                        lastMessageDate: null,
                    });
        }
        topicGet = await topicRef.get();
        const topicData = topicGet.data();
        console.log('topicData', topicData);
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

exports.getDiscussions = async (req: express.Request, res: express.Response) => {
    const { podId } = req.params;
    if(!podId) res.status(200).send({
        success: false,
        error: 'Error in controllers/podDiscussionController -> getDiscussions(): PodId is not provided',
    })

    const podRef = await db.collection(collections.mediaPods).doc(podId);
    const podGet: any = podRef.get();
    const topics: any = [];
    const topicsRef = podRef.collection(collections.podDiscussions);
    const topicsGet = await topicsRef.get();
    topicsGet.forEach(doc => topics.push({id: doc.id, ...doc.data()}));
    res.send({success: true, topics});
}

exports.getMessages = async (req: express.Request, res: express.Response) => {
    const { podId, topicId } = req.params;
    if(!podId || !topicId) {
        console.log('Error in controllers/podDiscussionController -> getMessages(): topicId or podId is not provided', podId, topicId);
        res.status(200).send({
            success: false,
            error: 'Error in controllers/podDiscussionController -> getMessages(): topicId or podId is not provided',
        });
    }

    const topicRef = db.collection(collections.mediaPods).doc(podId).collection(collections.podDiscussions).doc(topicId);
    const topicGet = await topicRef.get();
    if(!topicGet.exists) {
        console.log('Error in controllers/podDiscussionController -> getMessages(): No such database', podId, topicId);
        res.status(200).send({
            success: false,
            error: 'Error in controllers/podDiscussionController -> getMessages(): No such database'
        });
    }

    const messageRef = topicRef.collection(collections.podDiscussionMessage);
    const messageGet = await messageRef.get();
    const messages: any = [];
    messageGet.forEach(doc => messages.push(doc.data()));
    res.send({success: true, messages: messages});
}