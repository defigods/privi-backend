import express from "express";
import { db } from "../firebase/firebase";
import collections from "../firebase/collections";
import coinBalance from "../blockchain/coinBalance";
import cron from "node-cron";
import { generateUniqueId } from "../functions/functions";
//import { uploadToFirestoreBucket } from '../functions/firestore'
import fs from "fs";
import path from "path";

const podController = require("./podController");

const apiKey = "PRIVI"; // just for now

const createCampaign = async (req: express.Request, res: express.Response) => {
  try {
    if (req.body) {
      let body = req.body;
      let Id = generateUniqueId();

      await db.runTransaction(async (transaction) => {
        let CreationDate = new Date();
        let DateMonth = new Date();
        let Last30DaysImpressions: any[] = [];
        let Last30DaysUsers: any[] = [];
        let Last30DaysClicks: any[] = [];
        Last30DaysImpressions.length = 30;
        Last30DaysUsers.length = 30;
        Last30DaysClicks.length = 30;
        for (let i = 0; i < 30; i++) {
          Last30DaysImpressions[i] = {
            Impressions: 0,
            Date: new Date(DateMonth).setDate(DateMonth.getDate() - 1 * i),
          };
          Last30DaysUsers[i] = {
            Users: 0,
            Date: new Date(DateMonth).setDate(DateMonth.getDate() - 1 * i),
          };
          Last30DaysClicks[i] = {
            Clicks: 0,
            Date: new Date(DateMonth).setDate(DateMonth.getDate() - 1 * i),
          };
          CreationDate.setDate(CreationDate.getDate() - 1);
        }
        let Last12MonthImpressions: any[] = [];
        let Last12MonthUsers: any[] = [];
        let Last12MonthClicks: any[] = [];
        Last12MonthImpressions.length = 12;
        Last12MonthUsers.length = 12;
        Last12MonthClicks.length = 12;
        for (let i = 0; i < 12; i++) {
          Last12MonthImpressions[i] = {
            Impressions: 0,
            Date: new Date(DateMonth).setMonth(DateMonth.getMonth() - 1 * i),
          };
          Last12MonthUsers[i] = {
            Users: 0,
            Date: new Date(DateMonth).setMonth(DateMonth.getMonth() - 1 * i),
          };
          Last12MonthClicks[i] = {
            Clicks: 0,
            Date: new Date(DateMonth).setMonth(DateMonth.getMonth() - 1 * i),
          };
          DateMonth.setDate(DateMonth.getDate() - 1);
        }
        transaction.set(db.collection(collections.campaigns).doc("" + Id), {
          Id: Id,
          Name: body.Name,
          Text: body.Text,
          DateStart: body.DateStart,
          DateExpiration: body.DateExpiration,
          TotalBudget: body.TotalBudget,
          Pricing: body.Pricing,
          PricingType: body.PricingType,
          DailyBudget: body.DailyBudget,
          WeeklyBudget: body.WeeklyBudget,
          TargetHashtags: body.TargetHashtags,
          AgeRangeStart: body.AgeRangeStart,
          AgeRangeEnd: body.AgeRangeEnd,
          Sex: body.Sex,
          TrustScore: body.TrustScore,
          EndorsementScore: body.EndorsementScore,
          Locations: body.Locations,
          HasTokens: body.HasTokens,
          MemberOfPods: body.MemberOfPods,
          MemberOfCommunities: body.MemberOfCommunities,
          Admins: body.Admins,
          Users: body.Users,
          Spent: 0,
          DailySpent: 0,
          WeeklySpent: 0,
          ItemType: body.ItemType,
          ItemId: body.ItemId,
          NumImpressions: 0,
          Last30DaysImpressions: Last30DaysImpressions,
          Last12MonthImpressions: Last12MonthImpressions,
          NumUsers: 0,
          Last30DaysUsers: Last30DaysUsers,
          Last12MonthUsers: Last12MonthUsers,
          NumClicks: 0,
          Last30DaysClicks: Last30DaysClicks,
          Last12MonthClicks: Last12MonthClicks,
          CreatorAddress: body.CreatorAddress,
          Creator: body.Creator,
          HasPhoto: body.HasPhoto,
        });
        res.send({
          success: true,
          data: {
            Id: Id,
            Name: body.Name,
            Text: body.Text,
            DateStart: body.DateStart,
            DateExpiration: body.DateExpiration,
            TotalBudget: body.TotalBudget,
            Pricing: body.Pricing,
            PricingType: body.PricingType,
            DailyBudget: body.DailyBudget,
            WeeklyBudget: body.WeeklyBudget,
            TargetHashtags: body.TargetHashtags,
            AgeRangeStart: body.AgeRangeStart,
            AgeRangeEnd: body.AgeRangeEnd,
            Sex: body.Sex,
            TrustScore: body.TrustScore,
            EndorsementScore: body.EndorsementScore,
            Locations: body.Locations,
            HasTokens: body.HasTokens,
            MemberOfPods: body.MemberOfPods,
            MemberOfCommunities: body.MemberOfCommunities,
            Admins: body.Admins,
            Users: body.Users,
            Spent: 0,
            DailySpent: 0,
            WeeklySpent: 0,
            ItemType: body.ItemType,
            ItemId: body.ItemId,
            NumImpressions: 0,
            Last30DaysImpressions: Last30DaysImpressions,
            Last12MonthImpressions: Last12MonthImpressions,
            NumUsers: 0,
            Last30DaysUsers: Last30DaysUsers,
            Last12MonthUsers: Last12MonthUsers,
            NumClicks: 0,
            Last30DaysClicks: Last30DaysClicks,
            Last12MonthClicks: Last12MonthClicks,
            CreatorAddress: body.CreatorAddress,
            Creator: body.Creator,
            HasPhoto: body.HasPhoto,
          },
        });
      });
    } else {
      console.log(
        "Error in controllers/priviDataController -> createCampaign(): ",
        "No information"
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/priviDataController -> createCampaign(): ",
      err
    );
    res.send({ success: false });
  }
};

const getInfo = async (req: express.Request, res: express.Response) => {
  try {
    let userId = req.params.userId;

    const campaignsData = await db.collection(collections.campaigns).get();
    const campaigns = [] as any;

    campaignsData.forEach((doc) => {
      campaigns.push(doc.data());
    });

    const activeCampaigns = [] as any;

    campaigns.forEach((item) => {
      let startDate = new Date(item.DateStart);
      let expirationDate = new Date(item.DateExpiration);
      let now = new Date();

      if (
        item.Creator === userId &&
        startDate.getTime() < now.getTime() &&
        expirationDate.getTime() > now.getTime()
      ) {
        activeCampaigns.push(item);
      }
    });

    let totalSpent = 0;
    let podsStarted = 0;
    let creditStarted = 0;
    let communitiesStarted = 0;
    let governanceGroup = 0;
    activeCampaigns.forEach((campaign, i) => {
      totalSpent += campaign.Spent;
      switch (campaign.ItemType) {
        case "Pod":
          podsStarted += 1;
          break;
        case "Pool":
          creditStarted += 1;
          break;
        case "Community":
          communitiesStarted += 1;
          break;
        case "Governance":
          governanceGroup += 1;
          break;
      }
    });

    res.send({
      success: true,
      data: {
        ActiveCampaigns: activeCampaigns.length,
        TotalSpent: totalSpent,
        PodsStarted: podsStarted,
        CreditStarted: creditStarted,
        CommunitiesStarted: communitiesStarted,
        GovernanceGroup: governanceGroup,
      },
    });
  } catch (err) {
    console.log("Error in controllers/priviDataController -> getInfo(): ", err);
    res.send({ success: false });
  }
};

const getCampaigns = async (req: express.Request, res: express.Response) => {
  try {
    const campaignsData = await db.collection(collections.campaigns).get();
    const campaigns = [] as any;

    campaignsData.forEach((doc) => {
      campaigns.push(doc.data());
    });

    //console.log(campaigns);
    res.send({ success: true, data: campaigns });
  } catch (err) {
    console.log(
      "Error in controllers/priviDataController -> getCampaigns(): ",
      err
    );
    res.send({ success: false });
  }
};

const getMyPodsPoolsCreditsCommunities = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let userId = req.params.userId;
    const userRef = db.collection(collections.user).doc(userId);
    const userGet = await userRef.get();
    const user: any = userGet.data();

    let allFTPods: any[] = await podController.getFTPods();
    allFTPods.forEach((item, i) => {
      item.type = "FT";
    });
    let allNFTPods: any[] = await podController.getNFTPods();
    allNFTPods.forEach((item, i) => {
      item.type = "NFT";
    });

    let myFTPods: any[] = await podController.getAllInfoMyPods(
      allFTPods,
      user.myFTPods
    );
    let myNFTPods: any[] = await podController.getAllInfoMyPods(
      allNFTPods,
      user.myNFTPods
    );

    let allCreditPools: any[] = await getCreditPools();
    let myCreditPools: any[] = allCreditPools.filter(
      (credit) => credit.Creator === userId
    );
    let allCommunities = await getCommunities();
    let myCommunities: any[] = allCommunities.filter(
      (community) => community.Creator === userId
    );

    res.send({
      success: true,
      data: {
        myFTPods: myFTPods,
        myNFTPods: myNFTPods,
        myCreditPools: myCreditPools,
        myCommunities: myCommunities,
        allPods: allFTPods.concat(allNFTPods),
        allCreditPools: allCreditPools,
        allCommunities: allCommunities,
      },
    });
  } catch (err) {
    console.log(
      "Error in controllers/priviDataController -> getCampaigns(): ",
      err
    );
    res.send({ success: false });
  }
};

const getCommunities = (exports.getCommunities = (): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    const communities = await db.collection(collections.community).get();

    let array: any[] = [];
    communities.docs.map((doc, i) => {
      array.push(doc.data());
      if (communities.docs.length === i + 1) {
        resolve(array);
      }
    });
  });
});

const getCreditPools = (exports.getCreditPools = (): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    const creditPools = await db.collection(collections.priviCredits).get();

    let array: any[] = [];
    creditPools.docs.map((doc, i) => {
      array.push(doc.data());
      if (creditPools.docs.length === i + 1) {
        resolve(array);
      }
    });
  });
});

const changeCampaignPhoto = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    if (req.file) {
      // upload to Firestore Bucket
      // await uploadToFirestoreBucket(req.file, "uploads/campaigns", "images/campaigns")

      res.send({ success: true });
    } else {
      console.log(
        "Error in controllers/priviDataRoutes -> changeCampaignPhoto()",
        "There's no file..."
      );
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/priviDataRoutes -> changeCampaignPhoto()",
      err
    );
    res.send({ success: false });
  }
};

const campaignClick = async (req: express.Request, res: express.Response) => {
  try {
    let body = req.body;
    let campaignRef = await db
      .collection(collections.campaigns)
      .doc(body.campaignId);
    let campaignGet = await campaignRef.get();
    const campaign: any = campaignGet.data();
    let cpc = campaign.Pricing;
    let from = campaign.CreatorAddress;
    let to = body.To;
    let token = "pDATA";
    if (!checkDailyWeeklyBudget(campaign)) {
      res.send({ success: false, message: "Exceeding daily weekly budget" });
    }
    coinBalance
      .transfer("transfer", from, to, cpc, "pDATA", apiKey)
      .then((blockchainRes) => {
        if (!blockchainRes.success) {
          console.log(
            `user ${to} dindt get ${token}, ${blockchainRes.message}`
          );
          res.send({ success: false });
        }
      });
    campaign.Last30DaysClicks[0].Clicks =
      campaign.Last30DaysClicks[0].Clicks + 1;
    campaign.Last12MonthClicks[0].Clicks =
      campaign.Last12MonthClicks[0].Clicks + 1;
    await campaignRef.update({
      NumClicks: campaign.NumClicks + 1,
      Last30DaysClicks: campaign.Last30DaysClicks,
      Last12MonthClicks: campaign.Last12MonthClicks,
      DailySpent: campaign.DailySpent + cpc,
      WeeklySpent: campaign.WeeklySpent + cpc,
    });
    res.send({ success: true });
  } catch (e) {
    console.log("Error in controllers/priviDataRoutes -> campaignClick()", e);
    res.send({ success: false, message: e });
  }
};

const campaignsDataNextMonth = cron.schedule("0 0 1 * *", async () => {
  try {
    console.log(
      "********* dataController campaignsDataNextMonth() cron job started *********"
    );
    const campaignsSnap = await db.collection(collections.campaigns).get();
    campaignsSnap.forEach(async (campaign) => {
      let campaignData = campaign.data();
      let date = new Date();
      campaignData.Last12MonthImpressions.unshift({
        Impressions: 0,
        Date: date,
      });
      campaignData.Last12MonthImpressions.pop();
      campaignData.Last12MonthUsers.unshift({ Users: 0, Date: date });
      campaignData.Last12MonthUsers.pop();
      campaignData.Last12MonthClicks.unshift({ Users: 0, Date: date });
      campaignData.Last12MonthClicks.pop();
      const campaignRef = db
        .collection(collections.campaigns)
        .doc(campaignData.Id);
      campaignRef.update({
        Last12MonthImpressions: campaignData.Last12MonthImpressions,
        Last12MonthUsers: campaignData.Last12MonthUsers,
        Last12MonthClicks: campaignData.Last12MonthClicks,
      });
    });
  } catch (err) {
    console.log(
      "Error in controllers/priviDataRoutes -> campaignsDataNextMonth()",
      err
    );
  }
});

const campaignsDataNextDay = cron.schedule("0 0 * * *", async () => {
  try {
    console.log(
      "********* dataController campaignsDataNextDay() cron job started *********"
    );
    const campaignsSnap = await db.collection(collections.campaigns).get();
    campaignsSnap.forEach(async (campaign) => {
      let campaignData = campaign.data();
      let date = new Date();
      campaignData.Last30DaysImpressions.unshift({
        Impressions: 0,
        Date: date,
      });
      campaignData.Last30DaysImpressions.pop();
      campaignData.Last30DaysUsers.unshift({ Users: 0, Date: date });
      campaignData.Last30DaysUsers.pop();
      campaignData.Last30DaysClicks.unshift({ Users: 0, Date: date });
      campaignData.Last30DaysClicks.pop();
      const campaignRef = db
        .collection(collections.campaigns)
        .doc(campaignData.Id);
      campaignRef.update({
        Last30DaysImpressions: campaignData.Last30DaysImpressions,
        Last30DaysUsers: campaignData.Last12MonthUsers,
        Last30DaysClicks: campaignData.Last12MonthClicks,
        WeeklySpent: campaignData.WeeklySpent - campaignData.DailySpent,
        DailySpent: 0,
      });
    });
  } catch (err) {
    console.log(
      "Error in controllers/priviDataRoutes -> campaignsDataNextDay()",
      err
    );
  }
});

const getCampaign = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body;
    if (body.user) {
      let user = body.user;
      // use only one where condition, bcs firebase doesn't support multiple not equals operators
      // https://firebase.google.com/docs/firestore/query-data/queries#query_limitations
      let campaignsGet = await db
        .collection(collections.campaigns)
        .where("dateExpiration", "<=", Date.now())
        .get();
      let campaigns: any[] = campaignsGet.docs;
      if (campaigns && campaigns.length > 0) {
        campaigns = campaigns.filter((c) => c.data().dateStart <= Date.now());
        if (campaigns.length >= 0) {
          campaigns = campaigns.filter((c) => checkDailyWeeklyBudget(c.data()));
          if (campaigns.length >= 0) {
            campaigns = campaigns.filter(
              (c) => c.data().TrustScore <= user.TrustScore
            );
            if (campaigns.length > 0) {
              campaigns = campaigns.filter(
                (c) => c.data().EndorsementScore <= user.EndorsementScore
              );
              if (campaigns.length > 0) {
                campaigns = campaigns.filter(
                  (c) => c.data().HasTokens == user.HasTokens
                );
                if (campaigns.length > 0) {
                  campaigns = campaigns.filter(
                    (c) => c.data().AgeRangeStart <= user.AgeRangeStart
                  );
                  if (campaigns.length > 0) {
                    campaigns = campaigns.filter(
                      (c) => c.data().AgeRangeEnd >= user.AgeRangeEnd
                    );
                    if (campaigns.length > 0) {
                      campaigns = campaigns.filter(
                        (c) => c.data().Sex == user.Sex
                      );
                      if (campaigns.length > 0) {
                        campaigns = campaigns.filter(
                          (c) => c.data().MemberOfPods == user.MemberOfPods
                        );
                        if (campaigns.length > 0) {
                          campaigns = campaigns.filter(
                            (c) =>
                              c.data().MemberOfCommunities ==
                              user.MemberOfCommunities
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            res.send({
              success: false,
              message: "there is no funded campaign",
            });
          }
        } else {
          res.send({ success: false, message: "there is no active campaign" });
        }
      }
      if (campaigns.length > 0) {
        res.send({
          success: true,
          data: campaigns[0].data(),
        });
      }
      res.send({ success: false, message: "Did not found suitable campaign" });
    } else {
      res.send({ success: false, message: "req.body.user is missing" });
    }
  } catch (e) {
    console.log("Error in controllers/priviDataRoutes -> getCampaign()", e);
  }
};

function checkDailyWeeklyBudget(campaign) {
  return (
    campaign.DailySpent < campaign.DailyBudget ||
    campaign.WeeklySpent < campaign.weeklyBudget
  );
}

const getCampaignPhotoById = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    let campaignId = req.params.campaignId;
    //console.log(campaignId);
    if (campaignId) {
      const directoryPath = path.join("uploads", "campaigns");
      fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
          return console.log("Unable to scan directory: " + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
        });
      });

      // stream the image back by loading the file
      res.setHeader("Content-Type", "image");
      let raw = fs.createReadStream(
        path.join("uploads", "campaigns", campaignId + ".png")
      );
      raw.on("error", function (err) {
        console.log(err);
        res.sendStatus(400);
      });
      raw.pipe(res);
    } else {
      console.log(
        "Error in controllers/priviDataController -> getPhotoById()",
        "There's no id..."
      );
      res.sendStatus(400); // bad request
      res.send({ success: false });
    }
  } catch (err) {
    console.log(
      "Error in controllers/priviDataController -> getPhotoById()",
      err
    );
    res.send({ success: false });
  }
};

module.exports = {
  createCampaign,
  getInfo,
  getCampaigns,
  getMyPodsPoolsCreditsCommunities,
  changeCampaignPhoto,
  campaignClick,
  campaignsDataNextMonth,
  campaignsDataNextDay,
  getCampaign,
  getCampaignPhotoById,
};
