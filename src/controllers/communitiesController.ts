import express from "express";
import {createNotification, generateUniqueId, updateFirebase} from "../functions/functions";
import communities from "../blockchain/communities";
import notificationTypes from "../constants/notificationType";
import {db} from "../firebase/firebase";
import collections from '../firebase/collections';

const createBadge = async (req: express.Request, res: express.Response) => {
    try{
        const body = req.body;
        const creator = body.creator;
        const name = body.name;
        const description = body.description;
        const totalSupply = body.totalSupply;
        const royalty = body.royalty;
        const txid = generateUniqueId();
        const blockchainRes = await communities.createBadge(creator, name, name, totalSupply, parseFloat(royalty), Date.now(), 0, txid, 'PRIVI');

        if (blockchainRes && blockchainRes.success) {
            console.log('llega', creator);
            // updateFirebase(blockchainRes);
            /*await notificationsController.addNotification({
                userId: creatorId,
                notification: {
                    type: 45,
                    typeItemId: '',
                    itemId: '', //Liquidity pool id
                    follower: '',
                    pod: '',
                    comment: '',
                    token: token,
                    amount: 0,
                    onlyInformation: false,
                }
            });*/
            await db.runTransaction(async (transaction) => {

                // userData - no check if firestore insert works? TODO
                transaction.set(db.collection(collections.badges).doc(creator), {
                    creator: creator,
                    name: name,
                    description: description,
                    symbol: name,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                });
            });

            res.send({
                success: true, data: {
                    creator: creator,
                    name: name,
                    symbol: name,
                    users: [],
                    totalSupply: totalSupply,
                    date: Date.now(),
                    royalty: royalty,
                    txnId: txid,
                    hasPhoto: false
                }
            });
        }
        else {
            console.log('Error in controllers/communitiesControllers -> createBadge(): success = false.', blockchainRes.message);
            res.send({ success: false });
        }
    } catch (e) {
        return('Error in controllers/communitiesControllers -> createBadge()' + e)
    }
}


const changeBadgePhoto = async (req: express.Request, res: express.Response) => {
    try {
        if (req.file) {
            const badgeRef = db.collection(collections.badges)
                .doc(req.file.originalname);
            const badgeGet = await badgeRef.get();
            const badge: any = badgeGet.data();
            if (badge.hasPhoto) {
                await badgeRef.update({
                    hasPhoto: true
                });
            }
            res.send({ success: true });
        } else {
            console.log('Error in controllers/communitiesController -> changeBadgePhoto()', "There's no file...");
            res.send({ success: false });
        }
    } catch (err) {
        console.log('Error in controllers/communitiesController -> changePodPhoto()', err);
        res.send({ success: false });
    }
};


module.exports = {
    createBadge,
    changeBadgePhoto
}