import express from 'express';
import multer from "multer";
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const podController = require('../controllers/podController');

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

router.post('/FT/getPodTokenAmount', authenticateJWT, podController.getPodTokenAmount);
router.post('/FT/getFundingTokenAmount', authenticateJWT, podController.getFundingTokenAmount);
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


module.exports = router;
