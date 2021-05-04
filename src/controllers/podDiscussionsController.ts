import express from 'express';
import { db } from '../firebase/firebase';
import collections, { podsFT } from '../firebase/collections';
import fs from 'fs';
import path from 'path';
import { rejects } from 'assert';

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

        // const topicId = body.topicId ?? generateUniqueId();
        let users;
        if(podGet.exists) {
            const podData = podGet.data();
            if(podData) users = [...(podData.Investors ?? []), ...(podData.Collabs ?? []), podData.Creator];
        }
        if(!users) users = [];
        const topicData = {
            title,
            description,
            users,
            created: Date.now(),
            createdBy,
            lastMessage: null,
            lastMessageDate: null,
        };
        const { id: topicId } = await podRef.collection(collections.podDiscussions ).add(topicData);
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
    let messages: any = [];
    messageGet.forEach(doc => messages.push(doc.data()));
    console.log('messages', messages);
    messages = [...messages.sort((a, b) => a.created - b.created)];
    console.log('messages', messages);
    res.send({success: true, messages: messages});
}

exports.fileName = async (req: express.Request, res: express.Response) => {
    if(req.file) {
        res.send({
            success: true,
            file: req.file
        })
    }
}

exports.getFile = type => async (req: express.Request, res: express.Response) => {
    const { podId, topicId, fileName } = req.params; 
    if(podId && topicId && fileName) {
        const dirPath = path.join('uploads', 'podDiscussions', podId, topicId, fileName)
        return new Promise(async (resolve, reject) => {
            try {
                res.setHeader('Content-Type', type);
                const raw = fs.createReadStream(dirPath);
                raw.on('error', function (err) {
                    console.log(err);
                    res.sendStatus(400);
                });
                raw.pipe(res);
            } catch (e) {
                reject(e);
            }
        });
    }
}