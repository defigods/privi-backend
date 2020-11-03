import express from 'express';
import podProtocol from "../blockchain/podProtocol";
import { updateFirebase, getRateOfChange, createNotificaction } from "../constants/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db } from "../firebase/firebase";
import cron from 'node-cron';

exports.initiatePOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const token = body.token;
        const duration = body.duration;
        const payments = body.payments;
        const principal = body.principal;
        const interest = body.interest;
        const p_liquidation = body.p_liquidation;
        const initialSupply = body.initialSupply;
        const collaterals = body.collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.initiatePOD(creator, token, duration, payments, principal, interest, p_liquidation, initialSupply, collaterals, rateOfChange);
        console.log(blockchainRes);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(creator, "FT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
            // Create Pod Rate Doc
            const newPodRate = 0.01;
            db.collection(collections.rates).doc(podId).set({ type: "FTPod", rate: newPodRate });
            db.collection(collections.rates).doc(podId).collection(collections.rateHistory).add({
                rateUSD: newPodRate,
                timestamp: Date.now()
            });
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> initiatePOD(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> initiatePOD(): ', err);
        res.send({ success: false });
    }
};

exports.deletePOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const publicId = body.publicId;
        const podId = body.podId;
        const blockchainRes = await podProtocol.deletePod(publicId, podId);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(publicId, "FT Pod - Pod Deleted",
                ` `,
                notificationTypes.podDeletion
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> deletePOD(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deletePOD(): ', err);
        res.send({ success: false });
    }
};

exports.investPOD = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investorId = body.investorId;
        const podId = body.podId;
        const amount = body.amount;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.investPOD(investorId, podId, amount, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            createNotificaction(investorId, "FT Pod - Pod Invested",
                ` `,
                notificationTypes.podInvestment
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> investPOD(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> investPOD(): ', err);
        res.send({ success: false });
    }
};

exports.swapPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const investorId = body.investorId;
        const liquidityPoolId = body.liquidityPoolId;
        const podId = body.podId;
        const amount = body.amount;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.swapPOD(investorId, liquidityPoolId, podId, amount, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            updateFirebase(blockchainRes);
            console.log(blockchainRes);
            createNotificaction(investorId, "FT Pod - Pod Swapped",
                ` `,
                notificationTypes.podSwapGive
            );
            res.send({ success: true });
        }
        else {
            console.log('Error in controllers/podController -> swapPod(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> swapPod(): ', err);
        res.send({ success: false });
    }
};



/////////////////////////// CRON JOBS //////////////////////////////


// helper function: calculate if deposited collateral is below required ccr level
function isPodCollateralBellowLiquidation(amount: number, token: string, requiredLevel: number, collaterals: { [key: string]: number }, ratesOfChange: { [key: string]: number }) {
    if (!requiredLevel || !collaterals || !ratesOfChange) return false;
    let sum: number = 0; // collateral sum in USD
    amount = amount * ratesOfChange[token];   // amount in USD
    for (const [token, colValue] of Object.entries(collaterals)) {
        let conversionRate = ratesOfChange[token];
        if (!conversionRate) conversionRate = 1;
        sum += colValue * conversionRate;
    }
    return (sum / amount < requiredLevel);
}

// helper function: get object of tokens whice values are list of uids of users that have loan with ccr lower than required level
async function getPodList() {
    const res: string[] = [];
    const rateOfChange = await getRateOfChange();
    const podsSnap = await db.collection(collections.podsFT).get();
    podsSnap.forEach(async (podDoc) => {
        const data = podDoc.data();
        const podId: string = podDoc.id;
        const minLiquidation: number = data.P_liquidation;
        const amount: number = data.Principal;
        const token: string = data.Token;
        const collaterals: { [key: string]: number } = data.Pools.Collateral_Pool;
        if (isPodCollateralBellowLiquidation(amount, token, minLiquidation, collaterals, rateOfChange)) res.push(podId);
    });
    return res;
}

// scheduled every 5 min
exports.checkLiquidation = cron.schedule('*/5 * * * *', async () => {
    try {
        console.log("********* Pod checkLiquidation() cron job started *********");
        const rateOfChange = await getRateOfChange();
        const candidates = await getPodList();
        const podIdUidMap = {};
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach((doc) => {
            podIdUidMap[doc.id] = doc.data().Creator;
        });
        candidates.forEach(async (podId) => {
            const blockchainRes = await podProtocol.checkPODLiquidation(podId, rateOfChange);
            if (blockchainRes && blockchainRes.success && blockchainRes.output.Liquidated == "YES") {
                updateFirebase(blockchainRes);
                createNotificaction(podIdUidMap[podId], "FT Pod - Pod Liquidated",
                    ` `,
                    notificationTypes.podLiquidationFunds
                );
            } else {
                console.log('Error in controllers/podController -> checkLiquidation().', podId, blockchainRes.message);
            }
        });
        console.log("--------- Pod checkLiquidation() finished ---------");
    } catch (err) {
        console.log('Error in controllers/podController -> checkLiquidation()', err);
    }
});

// scheduled every day 00:00
exports.payInterest = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* Pod payInterest() cron job started *********");
        // get interest rates
        const rateOfChange = await getRateOfChange();
        const podList: string[] = [];
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach((doc) => {
            podList.push(doc.id);
        });
        podsSnap.forEach(async (podId) => {
            const blockchainRes = await podProtocol.interestPOD(podId, rateOfChange);
            if (blockchainRes && blockchainRes.success) {
                updateFirebase(blockchainRes);
                const updateWallets = blockchainRes.output.UpdateWallets;
                let uid: string = "";
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(updateWallets)) {
                    if (walletObj["Transaction"].length > 0) {
                        createNotificaction(uid, "FT Pod - Interest Payment",
                            ` `,
                            notificationTypes.traditionalInterest
                        );
                    }
                }
                console.log("--------- Pod payInterest() finished ---------");
            }
            else {
                console.log('Error in controllers/podController -> payInterest(): success = false.', blockchainRes.message);
            }
        })
    } catch (err) {
        console.log('Error in controllers/podController -> payInterest()', err);
    }
});

exports.followPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        const userRef = db.collection(collections.user)
            .doc(body.user.id);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        const podToFollowRef = db.collection(collections[body.pod.type])
            .doc(body.pod.id);
        const podToFollowGet = await podToFollowRef.get();
        const podToFollowData : any = podToFollowGet.data();

        if(body.pod.type === 'podsFT') {
            let alreadyFollowing = user.followingFTPods.find((item) => item === body.pod.id);
            if(!alreadyFollowing){
                user.followingFTPods.push(body.pod.id);
            }
            await userRef.update({
                followingFTPods: user.followingFTPods,
                numFollowingFTPods: user.followingFTPods.length
            });
            res.send({ success: true });
        } else if(body.pod.type === 'podsNFT') {
            let alreadyFollowing = user.followingNFTPods.find((item) => item === body.pod.id);
            if(!alreadyFollowing){
                user.followingNFTPods.push(body.pod.id);
            }
            await userRef.update({
                followingNFTPods: user.followingNFTPods,
                numFollowingNFTPods: user.followingNFTPods.length
            });
            res.send({ success: true });
        } else {
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> followPod(): ', err);
        res.send({ success: false });
    }
};
exports.unFollowPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        const userRef = db.collection(collections.user)
            .doc(body.user.id);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        const podToFollowRef = db.collection(collections[body.pod.type])
            .doc(body.pod.id);
        const podToFollowGet = await podToFollowRef.get();
        const podToFollowData : any = podToFollowGet.data();

        if(body.pod.type === 'podsFT') {
            let newFollowings = user.followingFTPods.filter(item => item != body.pod.id)

            await userRef.update({
                followingFTPods: newFollowings,
                numFollowingFTPods: newFollowings.length
            });
            res.send({ success: true });
        } else if(body.pod.type === 'podsNFT') {
            let newFollowings = user.followingNFTPods.filter(item => item != body.pod.id)

            await userRef.update({
                followingNFTPods: newFollowings,
                numFollowingNFTPods: newFollowings.length
            });
            res.send({ success: true });
        } else {
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> unFollowPod(): ', err);
        res.send({ success: false });
    }
};