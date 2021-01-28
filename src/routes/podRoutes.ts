import express from 'express';
import multer from "multer";
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const podController = require('../controllers/podController');
const podWallController = require('../controllers/podWallController');

// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/pods')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});

let storage3 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/podWallPost')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload3 = multer({
    storage: storage3
});


let storage2 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/podWallPost/' + 'photos-' + req.params.podWallPostId)
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload2 = multer({
    storage: storage2
});


// COMMON

router.post('/changePodPhoto', authenticateJWT, upload.single('image'), podController.changePodPhoto);
router.get('/FT/getPhoto/:podId', podController.getPhotoById);
router.post('/followPod', authenticateJWT, podController.followPod);
router.post('/unFollowPod', authenticateJWT, podController.unFollowPod);
router.post('/inviteRole', authenticateJWT, podController.inviteRole);
router.post('/replyRoleInvitation', authenticateJWT, podController.replyRoleInvitation);
router.post('/inviteView', authenticateJWT, podController.inviteView);


// FT

router.post('/FT/initiatePod', authenticateJWT, podController.initiateFTPOD);
router.post('/FT/deletePod', authenticateJWT, podController.deleteFTPOD);
router.post('/FT/investPod', authenticateJWT, podController.investFTPOD);
router.post('/FT/sellPod', authenticateJWT, podController.sellFTPOD);
router.post('/FT/swapPod', authenticateJWT, podController.swapFTPod);

router.post('/FT/getBuyTokenAmount', authenticateJWT, podController.getBuyTokenAmount);
router.post('/FT/getSellTokenAmount', authenticateJWT, podController.getSellTokenAmount);
router.get('/FT/getMarketPrice/:podId', authenticateJWT, podController.getMarketPrice);
router.get('/FT/getPriceHistory/:podId', authenticateJWT, podController.getFTPodPriceHistory);
router.get('/FT/getSupplyHistory/:podId', authenticateJWT, podController.getFTPodSupplyHistory);
router.get('/FT/getPod/:podId', authenticateJWT, podController.getFTPod);
router.get('/FT/getPodTransactions/:podId', authenticateJWT, podController.getFTPodTransactions);
router.get('/FT/getMyPods/:userId', authenticateJWT, podController.getMyPodsFT);
router.get('/FT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsFT);
router.get('/FT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsFT);
router.get('/FT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllFTPodsInfo);
router.get('/NFT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllNFTPodsInfo);


// NFT 

router.post('/NFT/initiatePod', authenticateJWT, podController.initiateNFTPod);
router.post('/NFT/newBuyOrder', authenticateJWT, podController.newBuyOrder);
router.post('/NFT/newSellOrder', authenticateJWT, podController.newSellOrder);
router.post('/NFT/deleteBuyOrder', authenticateJWT, podController.deleteBuyOrder);
router.post('/NFT/deleteSellOrder', authenticateJWT, podController.deleteSellOrder);
router.post('/NFT/sellPodTokens', authenticateJWT, podController.sellPodTokens);
router.post('/NFT/buyPodTokens', authenticateJWT, podController.buyPodTokens);

router.get('/NFT/getHistories/:podId', authenticateJWT, podController.getNFTPodHistories);
router.get('/NFT/getPod/:podId', authenticateJWT, podController.getNFTPod);
router.get('/NFT/getPodTransactions/:podId', authenticateJWT, podController.getNFTPodTransactions);
router.get('/NFT/getMyPods/:userId', authenticateJWT, podController.getMyPodsNFT);
router.get('/NFT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsNFT);
router.get('/NFT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsNFT);

router.post('/wall/createPost', authenticateJWT, podWallController.postCreate);
router.post('/wall/deletePost', authenticateJWT, podWallController.postDelete);
router.get('/wall/getPodPosts/:podId', authenticateJWT, podWallController.getPodPosts);
router.get('/wall/getPodPost/:postId', authenticateJWT, podWallController.getPodPostById);
router.post('/wall/changePostPhoto', authenticateJWT, upload3.single('image'), podWallController.changePostPhoto);
router.post('/wall/changePostDescriptionPhotos/:podWallPostId', authenticateJWT, upload2.array('image'), podWallController.changePostDescriptionPhotos);
router.get('/wall/getPostPhoto/:podWallPostId', podWallController.getPodWallPostPhotoById);
router.get('/wall/getDescriptionPostPhoto/:podWallPostId/:photoId', podWallController.getPodWallPostDescriptionPhotoById);
router.post('/wall/makeResponse', authenticateJWT, podWallController.makeResponsePodWallPost);
router.post('/wall/likePost', authenticateJWT, podWallController.likePost);
router.post('/wall/dislikePost', authenticateJWT, podWallController.dislikePost);
router.post('/wall/pinPost', authenticateJWT, podWallController.pinPost);

module.exports = router;
