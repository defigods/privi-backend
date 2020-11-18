import express, {response} from 'express';
import podProtocol from "../blockchain/podProtocol";
import nftPodProtocol from "../blockchain/nftPodProtocol";
import { updateFirebase, getRateOfChange, createNotification, updateFirebaseNFT, getUidNameMap } from "../functions/functions";
import notificationTypes from "../constants/notificationType";
import collections from "../firebase/collections";
import { db, firebase } from "../firebase/firebase";
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

exports.initiatePOD = async (req: express.Request, res: express.Response) => {
    try {
        console.log(req.body);
        const body = req.body;
        const creator = body.Creator;
        const token = body.Token;
        const duration = body.Duration;
        const payments = body.Payments;
        const principal = body.Principal;
        const interest = body.Interest;
        const p_liquidation = body.P_liquidation;
        const initialSupply = body.InitialSupply;
        const collaterals = body.Collaterals;
        const rateOfChange = await getRateOfChange();
        const blockchainRes = await podProtocol.initiatePOD(creator, token, duration, payments, principal, interest, p_liquidation, initialSupply, collaterals, rateOfChange);
        if (blockchainRes && blockchainRes.success) {
            const podId: string = Object.keys(blockchainRes.output.UpdatePods)[0];
            console.log(blockchainRes, blockchainRes.output.UpdatePods, blockchainRes.output.UpdatePods[podId]);

            blockchainRes.output.UpdatePods[podId].Name = body.Name || '';
            blockchainRes.output.UpdatePods[podId].Description = body.Description || '';
            blockchainRes.output.UpdatePods[podId].Hashtags = body.Hashtags || [];
            blockchainRes.output.UpdatePods[podId].Private = body.Private || false;
            blockchainRes.output.UpdatePods[podId].HasPhoto = body.HasPhoto || false;
            blockchainRes.output.UpdatePods[podId].EndorsementScore = 0.5;
            blockchainRes.output.UpdatePods[podId].TrustScore = 0.5;
            blockchainRes.output.UpdatePods[podId].Admins = body.Admins;

            updateFirebase(blockchainRes);
            createNotification(creator, "FT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            // Create Pod Rate Doc
            const newPodRate = 0.01;
            db.collection(collections.rates).doc(podId).set({ type: "FTPod", rate: newPodRate });
            db.collection(collections.rates).doc(podId).collection(collections.rateHistory).add({
                rateUSD: newPodRate,
                timestamp: Date.now()
            });

            // Add Pod Id into user myFTPods array
            if(blockchainRes.output.UpdatePods[0] && blockchainRes.output.UpdatePods[0].Creator) {
                const userRef = db.collection(collections.user)
                    .doc(blockchainRes.output.UpdatePods[0].Creator);
                const userGet = await userRef.get();
                const user : any = userGet.data();

                let myFTPods : any[] = user.myNFTPods || [];
                myFTPods.push(podId)

                await userRef.update({
                    myFTPods: myFTPods
                });
            }

            res.send({ success: true, data: podId });
        }
        else {
            console.log('Error in controllers/podController -> initiatePOD(): success = false.', blockchainRes.message);
            res.send({ success: false, error: blockchainRes.message});
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
            createNotification(publicId, "FT Pod - Pod Deleted",
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
            // add pod transaction (get price from blockchainRes)
            let price = 0;
            let token = "unknown";
            const output = blockchainRes.output;
            const updateWallets = output.UpdateWallets;
            const transactions = updateWallets[investorId].Transaction;
            transactions.forEach(tx => {
                if (tx.From == investorId) {
                    price = tx.Amount;
                    token = tx.Token;
                }
            });
            db.collection(collections.podsFT).doc(podId).collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token, 
                from: investorId,
                to: "Pod Pool",
                date: Date.now(),
                guarantor: "None"
            })
            createNotification(investorId, "FT Pod - Pod Invested",
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
            createNotification(investorId, "FT Pod - Pod Swapped",
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


exports.followPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        console.log(body);
        const userId = body.userId;
        const podId = body.podId;
        const podType = body.podType; // FT or NFT

        const userRef = db.collection(collections.user)
            .doc(userId);
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        const followerObj = {
            date: Date.now(),
            id: userId
        }
        // update user
        userRef.update({
            followingFTPods: firebase.firestore.FieldValue.arrayUnion(podId),
            numFollowingFTPods: firebase.firestore.FieldValue.increment(1)
        });
        // update pod
        db.collection(podRef).doc(podId).update({
            Followers: firebase.firestore.FieldValue.arrayUnion(followerObj)
        });
        res.send({ success: true });
        
    } catch (err) {
        console.log('Error in controllers/podController -> followPod(): ', err);
        res.send({ success: false });
    }
};

exports.unFollowPod = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const userId = body.userId;
        const podId = body.podId;
        const podType = body.podType; // FT or NFT

        const userRef = db.collection(collections.user)
            .doc(userId);
        let podRef = collections.podsFT;
        if (podType == "NFT") podRef = collections.podsNFT;

        // update user
        userRef.update({
            followingFTPods: firebase.firestore.FieldValue.arrayRemove(podId),
            numFollowingFTPods: firebase.firestore.FieldValue.increment(-1)
        });
        // update pod
        const mewFollowerField:any[] = [];
        const podsSnap = await db.collection(podRef).get();
        podsSnap.forEach((doc) => {
            const data = doc.data();
            const followers = data.Followers;
            if (followers) {
                followers.forEach((follower) => {
                    if (follower.id && follower.id != userId) mewFollowerField.push(follower);
                })
            }
        })
        db.collection(podRef).doc(podId).update({
            Followers: mewFollowerField
        });
        res.send({ success: true });
        
    } catch (err) {
        console.log('Error in controllers/podController -> unfollowPod(): ', err);
        res.send({ success: false });
    }
};


exports.getMyPodsNFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allNFTPods : any[] = await getNFTPods();

        let myNFTPods : any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        res.send({ success: true, data: myNFTPods});
    } catch (err) {
        console.log('Error in controllers/podController -> getMyPods()', err);
        res.send({ success: false });
    }
};

exports.getMyPodsFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allFTPods : any[] = await getFTPods();

        let myFTPods : any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        res.send({ success: true, data: myFTPods});
    } catch (err) {
        console.log('Error in controllers/podController -> getMyPods()', err);
        res.send({ success: false });
    }
};

const getAllInfoMyPods = (allItemArray, myArray) : Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {
        let array : any[] = [];
        if(myArray && myArray.length > 0) {
            myArray.forEach((item, i) => {
                let foundItem = allItemArray.find(allItem => allItem.id === item);
                if(foundItem)
                    array.push(foundItem);

                if(myArray.length === i + 1) {
                    resolve(array);
                }
            });
        } else {
            resolve([]);
        }
    });
};

exports.getTrendingPodsNFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        let allNFTPods : any[] = await getNFTPods();

        let trendingNFTPods : any[] = await countLastWeekPods(allNFTPods);

        res.send({ success: true, data: trendingNFTPods});
    } catch (err) {
        console.log('Error in controllers/podController -> getTrendingPods()', err);
        res.send({ success: false });
    }
};

exports.getTrendingPodsFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;
        let allFTPods : any[] = await getFTPods();

        let trendingFTPods : any[] = await countLastWeekPods(allFTPods);

        res.send({ success: true, data: trendingFTPods});
    } catch (err) {
        console.log('Error in controllers/podController -> getTrendingPods()', err);
        res.send({ success: false });
    }
};

const countLastWeekPods = (allPodsArray) : Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {

        let lastWeek = new Date();
        let pastDate = lastWeek.getDate() - 7;
        lastWeek.setDate(pastDate);

        if(allPodsArray && allPodsArray.length > 0) {
            allPodsArray.forEach((item, i) => {
                if(item.Followers && item.Followers.length > 0) {
                    let lastWeekFollowers = item.Followers.filter(follower => follower.date._seconds > lastWeek.getTime()/1000);
                    item.lastWeekFollowers = lastWeekFollowers.length;
                } else {
                    item.lastWeekFollowers = 0;
                }
                if(allPodsArray.length === i + 1) {
                    let sortedArray = allPodsArray.sort((a,b) => (a.lastWeekFollowers > b.lastWeekFollowers) ? 1 : ((b.lastWeekFollowers > a.lastWeekFollowers) ? -1 : 0));
                    let trendingArray = sortedArray.slice(0, 10);
                    resolve(trendingArray);
                }
            })
        } else {
            resolve([]);
        }
    })
};

exports.getOtherPodsNFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allNFTPods : any[] = await getNFTPods();

        let myNFTPods : any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        let otherNFTPods : any[] = await removeSomePodsFromArray(allNFTPods, myNFTPods);

        res.send({ success: true, data: otherNFTPods});
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};
exports.getOtherPodsFT = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allFTPods : any[] = await getFTPods();

        let myFTPods : any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        let otherFTPods : any[] = await removeSomePodsFromArray(allFTPods, myFTPods);

        res.send({ success: true, data: otherFTPods });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};

exports.getAllFTPodsInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allFTPods : any[] = await getFTPods();

        let trendingFTPods : any[] = await countLastWeekPods(allFTPods);

        let myFTPods : any[] = await getAllInfoMyPods(allFTPods, user.myFTPods);

        let otherFTPods : any[] = await removeSomePodsFromArray(allFTPods, myFTPods);

        res.send({ success: true, data: {
                myFTPods: myFTPods,
                otherFTPods: otherFTPods,
                trendingFTPods: trendingFTPods
            }
        });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};

exports.getAllNFTPodsInfo = async (req: express.Request, res: express.Response) => {
    try {
        let userId = req.params.userId;

        const userRef = db.collection(collections.user)
            .doc(userId);
        const userGet = await userRef.get();
        const user : any = userGet.data();

        let allNFTPods : any[] = await getNFTPods();

        let trendingNFTPods : any[] = await countLastWeekPods(allNFTPods);

        let myNFTPods : any[] = await getAllInfoMyPods(allNFTPods, user.myNFTPods);

        let otherNFTPods : any[] = await removeSomePodsFromArray(allNFTPods, myNFTPods);

        res.send({ success: true, data: {
                myNFTPods: myNFTPods,
                otherNFTPods: otherNFTPods,
                trendingNFTPods: trendingNFTPods
            }
        });
        res.send({ success: true, data: {
                myNFTPods: [],
                otherNFTPods: [],
                trendingNFTPods: []
            }
        });
    } catch (err) {
        console.log('Error in controllers/podController -> getOtherPods()', err);
        res.send({ success: false });
    }
};

const removeSomePodsFromArray = (fullArray, arrayToRemove) : Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {

        if(arrayToRemove && arrayToRemove.length !== 0) {
            arrayToRemove.forEach((item, i) => {
                let index = fullArray.findIndex(itemFullArray => itemFullArray.id === item.id)

                if(index && index === -1) {
                    fullArray = fullArray.slice(index, 1);
                }

                if(arrayToRemove.length === i + 1) {
                    resolve(fullArray)
                }
            });
        } else {
            resolve(fullArray)
        }
    });
}
;

const getNFTPods = () : Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        const podsNFT = await db.collection(collections.podsNFT).get();

        let array : any[] = [];
        podsNFT.docs.map((doc, i) => {
            array.push(doc.data());
            if (podsNFT.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
}

const getFTPods = () : Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
        const podsFT = await db.collection(collections.podsFT).get();

        let array : any[] = [];
        podsFT.docs.map((doc, i) => {
            array.push(doc.data());
            if (podsFT.docs.length === i + 1) {
                resolve(array)
            }
        });
    });
}

exports.changePodPhoto = async (req: express.Request, res: express.Response) => {
    try {
        if(req.file) {
            res.send({ success: true });
        } else {
            console.log('Error in controllers/podController -> changePodPhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};

exports.getPhotoById = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        console.log(podId);
        if(podId) {
            const directoryPath = path.join('uploads', 'pods');
            fs.readdir(directoryPath, function (err, files) {
                //handling error
                if (err) {
                    return console.log('Unable to scan directory: ' + err);
                }
                //listing all files using forEach
                files.forEach(function (file) {
                    // Do whatever you want to do with the file
                    console.log(file);
                });

            });

            // stream the image back by loading the file
            res.setHeader('Content-Type', 'image');
            let raw = fs.createReadStream(path.join('uploads', 'pods', podId + '.png'));
            raw.on('error', function(err) {
                console.log(err)
                res.sendStatus(400);
            });
            raw.pipe(res);
        } else {
            console.log('Error in controllers/podController -> getPhotoId()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};

exports.getNFTPod = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        if(podId) {
            const podRef = db.collection(collections.podsNFT)
                .doc(podId);
            const podGet = await podRef.get();
            const pod : any = podGet.data();
            res.send({ success: true, data: pod})
        } else {
            console.log('Error in controllers/podController -> getNFTPod()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getNFTPod()', err);
        res.send({ success: false });
    }
};

exports.getFTPod = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        console.log(podId);
        if(podId) {
            const podRef = db.collection(collections.podsFT)
                .doc(podId);
            const podGet = await podRef.get();
            const pod : any = podGet.data();

            // also send back pod rate and PC rate
            const val = 0.01; // val by default
            pod.rates = {};
            pod.rates.PC = val;
            pod.rates[podId] = val;
            const rateSnap = await db.collection(collections.rates).get();
            rateSnap.forEach((doc) => {
                if (doc.id == "PC" || doc.id == podId) { // only need these two
                    const rate = doc.data().rate;
                    pod.rates[doc.id] = rate;
                }
            });

            res.send({ success: true, data: pod})
        } else {
            console.log('Error in controllers/podController -> getFTPod()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getFTPod()', err);
        res.send({ success: false });
    }
};

exports.getFTPodTransactions = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        const txns:any[] = [];
        if(podId) {
            const uidNameMap = await getUidNameMap();
            const podTxnSnapshot = await db.collection(collections.podsFT).doc(podId).collection(collections.podTransactions).get();
            podTxnSnapshot.forEach((doc) => {
                const data = doc.data();
                const txn = data;
                let from = data.from;
                let to = data.to;
                // find name of "from" and "to"
                if (uidNameMap[from]) from = uidNameMap[from];
                if (uidNameMap[to]) to = uidNameMap[to];
                txn.from = from;
                txn.to = to;
                txns.push(txn);
            });
            res.send({ success: true, data: txns});
        } else {
            console.log('Error in controllers/podController -> getNFTPodTransactions()', "There's no pod id...");
            res.send({ success: false});
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getNFTPodTransactions()', err);
        res.send({ success: false });
    }
};


// ----------------------- NFT Pod backend-blockchain calls -------------------------------

exports.initiatePodNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const creator = body.creator;
        const token = body.token;
        const royalty = body.royalty;
        const offers = body.offers; 
        // maybe frontend need to store more info to db
        // ...
        const blockchainRes = await nftPodProtocol.initiatePodNFT(creator, token, royalty, offers);
        console.log(blockchainRes);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // TODO: set correct notification type
            createNotification(creator, "NFT Pod - Pod Created",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> initiatePodNFT(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> initiatePodNFT(): ', err);
        res.send({ success: false });
    }
}

exports.newBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const amount = body.amount;
        const price = body.price; 
        const blockchainRes = await nftPodProtocol.newBuyOrder(podId, trader, amount, price);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Buy Offer Crated",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> newBuyOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> newBuyOrder(): ', err);
        res.send({ success: false });
    }
}

exports.newSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const amount = body.amount;
        const price = body.price; 
        const blockchainRes = await nftPodProtocol.newSellOrder(podId, trader, amount, price);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Sell Offer Crated",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> newSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> newSellOrder(): ', err);
        res.send({ success: false });
    }
}

exports.deleteBuyOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const blockchainRes = await nftPodProtocol.deleteBuyOrder(podId, orderId, trader);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Buy Offer Deleted",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> deleteBuyOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteBuyOrder(): ', err);
        res.send({ success: false });
    }
}

exports.deleteSellOrder = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const blockchainRes = await nftPodProtocol.deleteSellOrder(podId, orderId, trader);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Sell Offer Deleted",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
        res.send({ success: false });
    }
}

exports.sellPodNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const amount = body.amount;
        const blockchainRes = await nftPodProtocol.sellPodNFT(podId, trader, orderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // add pod transaction
            let buyer = "unknown";
            let price = 0;
            let token = "unknown";
            const podSnap = await db.collection(collections.podsNFT).doc(podId).get();
            const data = podSnap.data();
            if (data && data.OrderBook && data.OrderBook.Buy && data.OrderBook.Buy[orderId]) {
                buyer = data.OrderBook.Buy[orderId].Trader;
                price = data.OrderBook.Buy[orderId].Price;
                token = data.Token;
            }
            db.collection(collections.podsNFT).doc(podId).collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token,
                from: trader,
                to: buyer,
                date: Date.now(),
                guarantor: "None"
            })
            // add to PriceOf the day 
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: price,
                date: Date.now()
            })

            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Token Sold",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> deleteSellOrder(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> deleteSellOrder(): ', err);
        res.send({ success: false });
    }
}

exports.buyPodNFT = async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;
        const trader = body.trader;
        const podId = body.podId;
        const orderId = body.orderId;
        const amount = body.amount;
        const blockchainRes = await nftPodProtocol.buyPodNFT(podId, trader, orderId, amount);
        if (blockchainRes && blockchainRes.success) {
            updateFirebaseNFT(blockchainRes);
            // add pod transaction
            let seller = "unknown";
            let price = 0;
            let token = "unknown";
            const podSnap = await db.collection(collections.podsNFT).doc(podId).get();
            const data = podSnap.data();
            if (data && data.OrderBook && data.OrderBook.Sell && data.OrderBook.Sell[orderId]) {
                seller = data.OrderBook.Sell[orderId].Trader;
                price = data.OrderBook.Sell[orderId].Price;
                token = data.Token;
            }
            podSnap.ref.collection(collections.podTransactions).add({
                amount: amount,
                price: price,
                token: token,
                from: seller,
                to: trader,
                date: Date.now(),
                guarantor: "none"
            })
            // add to PriceOf the day 
            podSnap.ref.collection(collections.priceOfTheDay).add({
                price: price,
                date: Date.now()
            })

            // TODO: set correct notification type
            createNotification(trader, "NFT Pod - Pod Token Bought",
                ` `,
                notificationTypes.podCreation
            );
            res.send({ success: true });
        } 
        else {
            console.log('Error in controllers/podController -> buyPodNFT(), blockchain success = false, ', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> buyPodNFT(): ', err);
        res.send({ success: false });
    }
}

exports.getNFTPodTransactions = async (req: express.Request, res: express.Response) => {
    try {
        let podId = req.params.podId;
        const txns:any[] = [];
        if(podId) {
            const uidNameMap = await getUidNameMap();
            const podTxnSnapshot = await db.collection(collections.podsNFT).doc(podId).collection(collections.podTransactions).get();
            podTxnSnapshot.forEach((doc) => {
                const data = doc.data();
                const txn = data;
                let from = data.from;
                let to = data.to;
                // find name of "from" and "to"
                if (uidNameMap[from]) from = uidNameMap[from];
                if (uidNameMap[to]) to = uidNameMap[to];
                txn.from = from;
                txn.to = to;
                txns.push(txn);
            });
            res.send({ success: true, data: txns});
        } else {
            console.log('Error in controllers/podController -> getNFTPodTransactions()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getNFTPodTransactions()', err);
        res.send({ success: false });
    }
};


// get price from history and today price colections, merge, sort (by ascending date) and return this data
exports.getNFTPodPriceHistory = async (req: express.Request, res: express.Response) => {
    try {
        // comparator function used to sort by ascending date
        const comparator = (a, b) => {
            if (a.date > b.date) return 1;
            if (b.date > a.date) return -1;
            return 0;
        }

        let podId = req.params.podId;
        const data:any[] = [];
        if(podId) {
            const priceHistorySnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceHistory).get();
            priceHistorySnap.forEach((doc) => {
                data.push(doc.data());
            });
            const todayPriceSnap = await db.collection(collections.podsNFT).doc(podId).collection(collections.priceOfTheDay).get();
            todayPriceSnap.forEach((doc) => {
                data.push(doc.data());
            });
            // sort data by ascending date
            data.sort(comparator);
            res.send({ success: true, data: data});
        } else {
            console.log('Error in controllers/podController -> getNFTPodTransactions()', "There's no pod id...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/podController -> getNFTPodTransactions()', err);
        res.send({ success: false });
    }
};

// --------------------------------------------------------------------


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

// scheduled every 5 min, checks the liquidation of each pod (that is ccr below required level)
exports.checkLiquidation = cron.schedule('*/5 * * * *', async () => {
    try {
        console.log("********* Pod checkLiquidation() cron job started *********");
        const rateOfChange = await getRateOfChange();
        const candidates = await getPodList();
        const podIdUidMap = {}; // maps podId to creatorId, used to notify creator when pod liquidated
        const podsSnap = await db.collection(collections.podsFT).get();
        podsSnap.forEach((doc) => {
            podIdUidMap[doc.id] = doc.data().Creator;
        });
        candidates.forEach(async (podId) => {
            const blockchainRes = await podProtocol.checkPODLiquidation(podId, rateOfChange);
            if (blockchainRes && blockchainRes.success && blockchainRes.output.Liquidated == "YES") {
                updateFirebase(blockchainRes);
                createNotification(podIdUidMap[podId], "FT Pod - Pod Liquidated",
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

// scheduled every day at 00:00, for each pod calls the blockchain payInterest function
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
        podsSnap.forEach(async (pod) => {
            const blockchainRes = await podProtocol.interestPOD(pod.id, rateOfChange);
            if (blockchainRes && blockchainRes.success) {
                updateFirebase(blockchainRes);
                const updateWallets = blockchainRes.output.UpdateWallets;
                let uid: string = "";
                let walletObj: any = null;
                for ([uid, walletObj] of Object.entries(updateWallets)) {
                    if (walletObj["Transaction"].length > 0) {
                        createNotification(uid, "FT Pod - Interest Payment",
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

// NFT cron job, scheduled every day at 00:00. For each NFT pod, this function gets the lowest sale price of the day from the "SalesOfTheDay" colection
// and add this to "PriceHistory" colection. Then resets (clearing) "SalesOfTheDay".
exports.managePriceHistory = cron.schedule('0 0 * * *', async () => {
    try {
        console.log("********* NFT Pod managePriceHistory() cron job started *********");
        const podsSnap = await db.collection(collections.podsNFT).get();
        podsSnap.forEach(async (pod) => {
            let dayLowestPrice = Infinity;
            let date = Date.now();
            // get lowest price from Sales Book 
            const podData = pod.data();
            if (podData) {
                let orderId = "";
                let sale:any = null;
                for ([orderId, sale] of Object.entries(podData.OrderBook.Sell)) {
                    if (sale.Price < dayLowestPrice && sale.Amount != 0) dayLowestPrice = sale.Price;
                }
            }
            // get price for nearest (date) price history, to use in case that have no sale offers today.
            if (dayLowestPrice == Infinity) {
                const priceHistorySnap = await pod.ref.collection(collections.priceHistory).orderBy("date", "desc").limit(1).get();
                if (priceHistorySnap.docs.length) {
                    const data = priceHistorySnap.docs[0].data();
                    dayLowestPrice = data.price;
                    date = data.date;
                }
            }
            // add this new price and date to PriceHistory colection
            if (dayLowestPrice == Infinity) dayLowestPrice = 0; 
            pod.ref.collection(collections.priceHistory).add({
                price: dayLowestPrice,
                date: date}
            );
            // reset (empty) PriceOfTheDay
            const priceOfTheDaySnap = await pod.ref.collection(collections.priceOfTheDay).get()
            priceOfTheDaySnap.forEach((doc) => doc.ref.delete());
        })
        console.log("--------- NFT Pod managePriceHistory() finished ---------");
    } catch (err) {
        console.log('Error in controllers/podController -> managePriceHistory()', err);
    }
});