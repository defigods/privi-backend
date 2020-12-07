import express from 'express';
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';

const createCampaign = async (req: express.Request, res: express.Response) => {
    try {
        console.log(req.body);
        if(req.body) {
            let body = req.body;
            let campaignsGet = await db.collection(collections.campaigns).get();
            let id = campaignsGet.size;

            await db.runTransaction(async (transaction) => {

                transaction.set(db.collection(collections.campaigns).doc(''+(id+1)), {
                    name: body.name,
                    text: body.text,
                    dateStart: body.dateStart,
                    dateExpiration: body.dateExpiration,
                    totalBudget: body.totalBudget,
                    pricing: body.pricing,
                    dailyBudget: body.dailyBudget,
                    weeklyBudget: body.weeklyBudget,
                    targetHashtags: body.targetHashtags,
                    ageRange: body.ageRange,
                    sex: body.sex,
                    trustScore: body.trustScore,
                    endorsementScore: body.endorsementScore,
                    locations: body.locations,
                    hasTokens: body.hasTokens,
                    memberOfPods: body.memberOfPods,
                    memberOfCommunities: body.memberOfCommunities,
                    admins: body.admins,
                    users: body.users
                });
                res.send({ success: true,
                    data:  {
                        name: body.name,
                        text: body.text,
                        dateStart: body.dateStart,
                        dateExpiration: body.dateExpiration,
                        totalBudget: body.totalBudget,
                        pricing: body.pricing,
                        dailyBudget: body.dailyBudget,
                        weeklyBudget: body.weeklyBudget,
                        targetHashtags: body.targetHashtags,
                        ageRange: body.ageRange,
                        sex: body.sex,
                        trustScore: body.trustScore,
                        endorsementScore: body.endorsementScore,
                        locations: body.locations,
                        hasTokens: body.hasTokens,
                        memberOfPods: body.memberOfPods,
                        memberOfCommunities: body.memberOfCommunities,
                        admins: body.admins,
                        users: body.users
                    }})
            });
        } else {
            console.log('Error in controllers/priviDataController -> createCampaign(): ', 'No information');
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviDataController -> createCampaign(): ', err);
        res.send({ success: false });
    }
}

const getInfo = async (req: express.Request, res: express.Response) => {
    try {

    } catch (err) {
        console.log('Error in controllers/priviDataController -> getInfo(): ', err);
        res.send({ success: false });
    }
}

const getCampaigns = async (req: express.Request, res: express.Response) => {
    try {
        const campaigns = await db.collection(collections.campaigns).get();
        res.send({ success: true, data: campaigns });
    } catch (err) {
        console.log('Error in controllers/priviDataController -> getCampaigns(): ', err);
        res.send({ success: false });
    }
}

module.exports = {
    createCampaign,
    getInfo,
    getCampaigns
};
