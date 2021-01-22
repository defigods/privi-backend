import express from 'express';
import {db} from "../firebase/firebase";
import collections from '../firebase/collections';
import coinBalance from '../blockchain/coinBalance';
import cron from 'node-cron';

const podController = require('./podController');

const apiKey = "PRIVI"; // just for now

const createCampaign = async (req: express.Request, res: express.Response) => {
    try {
        console.log(req.body);
        if (req.body) {
            let body = req.body;
            let campaignsGet = await db.collection(collections.campaigns).get();
            let id = campaignsGet.size + 1;

            await db.runTransaction(async (transaction) => {
                let date = new Date();
                let dateMonth = new Date();
                let last30DaysImpressions : any[] = [];
                let last30DaysUsers : any[] = [];
                let last30DaysClicks : any[] = [];
                last30DaysImpressions.length = 30;
                last30DaysUsers.length = 30;
                last30DaysClicks.length = 30;
                for (let i = 0; i < 30; i++) {
                    last30DaysImpressions[i] = {
                        impressions: 0,
                        date: date
                    };
                    last30DaysUsers[i] = {
                        users: 0,
                        date: date
                    };
                    last30DaysClicks[i] = {
                        clicks: 0,
                        date: date
                    };
                    date.setDate(date.getDate() - 1);
                }
                let last12MonthImpressions : any[] = [];
                let last12MonthUsers : any[] = [];
                let last12MonthClicks : any[] = [];
                last12MonthImpressions.length = 12;
                last12MonthUsers.length = 12;
                last12MonthClicks.length = 12;
                for (let i = 0; i < 12; i++) {
                    last12MonthImpressions[i] = {
                        impressions: 0,
                        date: dateMonth
                    }
                    last12MonthUsers[i] = {
                        users: 0,
                        date: dateMonth
                    }
                    last12MonthClicks[i] = {
                        clicks: 0,
                        date: dateMonth
                    }
                    dateMonth.setDate(dateMonth.getDate() - 1);
                }
                transaction.set(db.collection(collections.campaigns).doc('' + id), {
                    id: id,
                    name: body.name,
                    text: body.text,
                    dateStart: body.dateStart,
                    dateExpiration: body.dateExpiration,
                    totalBudget: body.totalBudget,
                    pricing: body.pricing,
                    dailyBudget: body.dailyBudget,
                    weeklyBudget: body.weeklyBudget,
                    targetHashtags: body.targetHashtags,
                    ageRangeStart: body.ageRangeStart,
                    ageRangeEnd: body.ageRangeEnd,
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
                    itemType: body.itemType,
                    itemId: body.itemId,
                    numImpressions: 0,
                    last30DaysImpressions: last30DaysImpressions,
                    last12MonthImpressions: last12MonthImpressions,
                    numUsers: 0,
                    last30DaysUsers: last30DaysUsers,
                    last12MonthUsers: last12MonthUsers,
                    numClicks: 0,
                    last30DaysClicks: last30DaysClicks,
                    last12MonthClicks: last12MonthClicks,
                    creatorAddress: body.creatorAddress,
                });
                res.send({
                    success: true,
                    data: {
                        id: id,
                        name: body.name,
                        text: body.text,
                        dateStart: body.dateStart,
                        dateExpiration: body.dateExpiration,
                        totalBudget: body.totalBudget,
                        pricing: body.pricing,
                        dailyBudget: body.dailyBudget,
                        weeklyBudget: body.weeklyBudget,
                        targetHashtags: body.targetHashtags,
                        ageRangeStart: body.ageRangeStart,
                        ageRangeEnd: body.ageRangeEnd,
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
                        last30DaysImpressions: last30DaysImpressions,
                        last12MonthImpressions: last12MonthImpressions,
                        numUsers: 0,
                        last30DaysUsers: last30DaysUsers,
                        last12MonthUsers: last12MonthUsers,
                        numClicks: 0,
                        last30DaysClicks: last30DaysClicks,
                        last12MonthClicks: last12MonthClicks,
                        creatorAddress: body.creatorAddress,
                    }
                })
            });
        } else {
            console.log('Error in controllers/priviDataController -> createCampaign(): ', 'No information');
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/priviDataController -> createCampaign(): ', err);
        res.send({success: false});
    }
}

const getInfo = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;

        const campaignsGet = await db.collection(collections.campaigns).get();
        const campaigns: any[] = [];
        campaignsGet.docs.map(doc => campaigns.push(doc.data()))

        const activeCampaigns = campaigns.filter((item, i) => {
            let startDate = new Date(item.dateStart);
            let expirationDate = new Date(item.dateExpiration);
            let now = new Date();
            return (item.creator === podId && startDate.getTime() > now.getTime() && expirationDate.getTime() < now.getTime());
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

        res.send({
            success: true, data: {
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
        res.send({success: false});
    }
}

const getCampaigns = async (req: express.Request, res: express.Response) => {
    try {
        const campaigns = await db.collection(collections.campaigns).get();
        res.send({success: true, data: campaigns});
    } catch (err) {
        console.log('Error in controllers/priviDataController -> getCampaigns(): ', err);
        res.send({success: false});
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

        res.send({
            success: true, data: {
                myFTPods: myFTPods,
                myNFTPods: myNFTPods,
                myPriviCredits: myPriviCredits,
                myPools: myPools,
                allPods: allFTPods.concat(allNFTPods)
            }
        });
    } catch (err) {
        console.log('Error in controllers/priviDataController -> getCampaigns(): ', err);
        res.send({success: false});
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
            res.send({success: true});
        } else {
            console.log('Error in controllers/priviDataRoutes -> changeCampaignPhoto()', "There's no file...");
            res.send({success: false});
        }
    } catch (err) {
        console.log('Error in controllers/priviDataRoutes -> changeCampaignPhoto()', err);
        res.send({success: false});
    }
};

const campaignClick = async (req: express.Request, res: express.Response) => {
    try {
        let body = req.body;
        let campaignRef = await db.collection(collections.campaigns).doc(body.campaignId);
        let campaignGet = await campaignRef.get();
        const campaign: any = campaignGet.data();
        let cpc = campaign.pricing;
        let from = campaign.creatorAddress;
        let to = body.to;
        let token = "pDATA";
        if (!checkDailyWeeklyBudget(campaign)) {
            res.send({success: false, message: 'Exceeding daily weekly budget'});
        }
        coinBalance.transfer("transfer", from, to, cpc, "pDATA", apiKey).then((blockchainRes) => {
            if (!blockchainRes.success) {
                console.log(`user ${to} dindt get ${token}, ${blockchainRes.message}`);
                res.send({success: false});
            }
        })
        campaign.last30DaysClicks[0] = campaign.last30DaysClicks[0] + 1;
        campaign.last12MonthClicks[0] = campaign.last12MonthClicks[0] + 1;
        await campaignRef.update({
            numClicks: campaign.numClicks + 1,
            last30DaysClicks: campaign.last30DaysClicks,
            last12MonthClicks: campaign.last12MonthClicks,
            dailySpent: campaign.dailySpent + cpc,
            weeklySpent: campaign.weeklySpent + cpc
        });
        res.send({success: true});
    } catch (e) {
        console.log('Error in controllers/priviDataRoutes -> campaignClick()', e);
        res.send({success: false, message: e});
    }
}

const campaignsDataNextMonth = cron.schedule("0 0 1 * *", async () => {
    try {
        console.log("********* dataController campaignsDataNextMonth() cron job started *********");
        const campaignsSnap = await db.collection(collections.campaigns).get();
        campaignsSnap.forEach(async (campaign) => {
            let campaignData = campaign.data();
            let date = new Date();
            campaignData.last12MonthImpressions.unshift({impressions: 0, date: date});
            campaignData.last12MonthImpressions.pop();
            campaignData.last12MonthUsers.unshift({users: 0, date: date});
            campaignData.last12MonthUsers.pop();
            campaignData.last12MonthClicks.unshift({users: 0, date: date});
            campaignData.last12MonthClicks.pop();
            const campaignRef = db.collection(collections.campaigns).doc(campaignData.id);
            campaignRef.update({
                last12MonthImpressions: campaignData.last12MonthImpressions,
                last12MonthUsers: campaignData.last12MonthUsers,
                last12MonthClicks: campaignData.last12MonthClicks,
            });
        })
    } catch (err) {
        console.log('Error in controllers/priviDataRoutes -> campaignsDataNextMonth()', err);
    }
})

const campaignsDataNextDay = cron.schedule("0 0 * * *", async () => {
    try {
        console.log("********* dataController campaignsDataNextDay() cron job started *********");
        const campaignsSnap = await db.collection(collections.campaigns).get();
        campaignsSnap.forEach(async (campaign) => {
            let campaignData = campaign.data();
            let date = new Date();
            campaignData.last30DaysImpressions.unshift({impressions: 0, date: date});
            campaignData.last30DaysImpressions.pop();
            campaignData.last30DaysUsers.unshift({users: 0, date: date});
            campaignData.last30DaysUsers.pop();
            campaignData.last30DaysClicks.unshift({users: 0, date: date});
            campaignData.last30DaysClicks.pop();
            const campaignRef = db.collection(collections.campaigns).doc(campaignData.id);
            campaignRef.update({
                last30DaysImpressions: campaignData.last30DaysImpressions,
                last30DaysUsers: campaignData.last12MonthUsers,
                last30DaysClicks: campaignData.last12MonthClicks,
                weeklySpent: campaignData.weeklySpent - campaignData.dailySpent,
                dailySpent: 0
            });
        })
    } catch (err) {
        console.log('Error in controllers/priviDataRoutes -> campaignsDataNextDay()', err);
    }
})

const getCampaign = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        if (body.user) {
            let user = body.user;
            // use only one where condition, bcs firebase doesn't support multiple not equals operators
            // https://firebase.google.com/docs/firestore/query-data/queries#query_limitations
            let campaignsGet = await db.collection(collections.campaigns)
                .where("dateExpiration", "<=", Date.now()).get();
            /*let campaigns: any[] = campaignsGet.data();
            if (campaigns && campaigns.length > 0) {
                campaigns = campaigns.filter(c => c.dateStart <= Date.now())
                if (campaigns.length >= 0) {
                    campaigns = campaigns.filter(c => checkDailyWeeklyBudget(c));
                    if (campaigns.length >= 0) {
                        campaigns = campaigns.filter(c => c.trustScore <= user.trustScore);
                        if (campaigns.length > 0) {
                            campaigns = campaigns.filter(c => c.endorsementScore <= user.endorsementScore);
                            if (campaigns.length > 0) {
                                campaigns = campaigns.filter(c => c.hasTokens == user.hasTokens);
                                if (campaigns.length > 0) {
                                    campaigns = campaigns.filter(c => c.ageRangeStart <= user.ageRangeStart);
                                    if (campaigns.length > 0) {
                                        campaigns = campaigns.filter(c => c.ageRangeEnd >= user.ageRangeEnd);
                                        if (campaigns.length > 0) {
                                            campaigns = campaigns.filter(c => c.sex == user.sex);
                                            if (campaigns.length > 0) {
                                                campaigns = campaigns.filter(c => c.memberOfPods == user.memberOfPods);
                                                if (campaigns.length > 0) {
                                                    campaigns = campaigns.filter(c => c.memberOfCommunities == user.memberOfCommunities);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        res.send({success: false, message: 'there is no funded campaign'});
                    }
                } else {
                    res.send({success: false, message: 'there is no active campaign'});
                }
            }
            if (campaigns.length > 0) {
                res.send({
                    success: true,
                    data: campaigns[0]
                });
            }*/
            res.send({success: false, message: 'Did not found suitable campaign'});
        } else {
            res.send({success: false, message: 'req.body.user is missing'});
        }
    } catch (e) {
        console.log('Error in controllers/priviDataRoutes -> getCampaign()', e);
    }
}

function checkDailyWeeklyBudget(campaign) {
    return campaign.dailySpent < campaign.dailyBudget || campaign.weeklySpent < campaign.weeklyBudget;
}

module.exports = {
    createCampaign,
    getInfo,
    getCampaigns,
    getMyPodsPoolsCreditsCommunities,
    changeCampaignPhoto,
    campaignClick,
    campaignsDataNextMonth,
    campaignsDataNextDay,
    getCampaign
};
