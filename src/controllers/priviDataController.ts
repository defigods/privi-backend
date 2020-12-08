import express from 'express';
import { db } from "../firebase/firebase";
import collections from '../firebase/collections';
const podController = require('./podController');

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
                    users: body.users,
                    spent: 0,
                    dailySpent: 0,
                    weeklySpent: 0,
                    itemType: '',
                    itemId: '',
                    numImpressions: 0,
                    last30DaysImpressions: [],
                    last12MonthImpressions: [],
                    numUsers: 0,
                    last30DaysUsers: [],
                    last12MonthUsers: [],
                    numClicks: 0,
                    last30DaysClicks: [],
                    last12MonthClicks: []
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
                        users: body.users,
                        spent: 0,
                        dailySpent: 0,
                        weeklySpent: 0,
                        itemType: '',
                        itemId: '',
                        numImpressions: 0,
                        last30DaysImpressions: [],
                        last12MonthImpressions: [],
                        numUsers: 0,
                        last30DaysUsers: [],
                        last12MonthUsers: [],
                        numClicks: 0,
                        last30DaysClicks: [],
                        last12MonthClicks: []
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
        let podId = req.params.podId;

        const campaignsGet = await db.collection(collections.campaigns).get();
        const campaigns : any[] = [];
        campaignsGet.docs.map(doc => campaigns.push(doc.data()))

        const activeCampaigns = campaigns.filter((item, i) => {
            let startDate = new Date(item.dateStart);
            let expirationDate = new Date(item.dateExpiration);
            let now = new Date();
            return(item.creator === podId && startDate.getTime() > now.getTime() && expirationDate.getTime() < now.getTime());
        });

        let totalSpent = 0;
        let podsStarted = 0;
        let creditStarted = 0;
        let communitiesStarted = 0;
        let governanceGroup = 0;
        activeCampaigns.forEach((campaign, i) => {
            totalSpent += campaign.spent;
            switch (campaign.itemType) {
                case 'Pod':
                    podsStarted += 1;
                    break;
                case 'Credit':
                    creditStarted += 1;
                    break;
                case 'Community':
                    communitiesStarted += 1;
                    break;
                case 'Governance':
                    governanceGroup += 1;
                    break;
            }
        });

        res.send({ success: true, data: {
                activeCampaigns: activeCampaigns.length,
                totalSpent: totalSpent,
                podsStarted: podsStarted,
                creditStarted: creditStarted,
                communitiesStarted: communitiesStarted,
                governanceGroup: governanceGroup
            }
        });
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

const getMyPodsPoolsCreditsCommunities = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user: any = userGet.data();

        let allFTPods: any[] = await podController.getFTPods();
        allFTPods.forEach((item, i) => {
            item.type = 'FT'
        })
        let allNFTPods: any[] = await podController.getNFTPods();
        allNFTPods.forEach((item, i) => {
            item.type = 'NFT'
        })
        let allPriviCredits: any[] = await getAllPriviCredits();

        let myFTPods: any[] = await podController.getAllInfoMyPods(allFTPods, user.myFTPods);
        let myNFTPods: any[] = await podController.getAllInfoMyPods(allNFTPods, user.myNFTPods);
        let myPriviCredits: any[] = await getMyPriviCredits(allPriviCredits, userGet.id);

        let myPools: any[] = [];

        res.send({ success: true, data: {
                myFTPods: myFTPods,
                myNFTPods: myNFTPods,
                myPriviCredits: myPriviCredits,
                myPools: myPools,
                allPods: allFTPods.concat(allNFTPods)
            }
        });
    } catch (err) {
        console.log('Error in controllers/priviDataController -> getCampaigns(): ', err);
        res.send({ success: false });
    }
}

const getMyPriviCredits = (allItemArray, userId): Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {
        let array: any[] = [];
        if (allItemArray && allItemArray.length > 0) {
            allItemArray.forEach((item, i) => {
                let foundItem = allItemArray.find(allItem => allItem.creator === userId);
                if (foundItem)
                    array.push(foundItem);

                if (allItemArray.length === i + 1) {
                    resolve(array);
                }
            });
        } else {
            resolve([]);
        }
    });
}

const getAllPriviCredits = () => {
    return new Promise<any[]>(async (resolve, reject) => {
        const priviCredits = await db.collection(collections.priviCredits).get();

        let array: any[] = [];
        priviCredits.docs.map((doc, i) => {
            array.push(doc.data());
            if (priviCredits.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
}

const changeCampaignPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            res.send({ success: true });
        } else {
            console.log('Error in controllers/priviDataRoutes -> changeCampaignPhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/priviDataRoutes -> changeCampaignPhoto()', err);
        res.send({ success: false });
    }
};

module.exports = {
    createCampaign,
    getInfo,
    getCampaigns,
    getMyPodsPoolsCreditsCommunities,
    changeCampaignPhoto
};
