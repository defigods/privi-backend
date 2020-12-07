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

router.post('/changePodPhoto', authenticateJWT, upload.single('image'), podController.changePodPhoto);
router.get('/FT/getPhoto/:podId', podController.getPhotoById);

router.get('/NFT/getPod/:podId', authenticateJWT, podController.getNFTPod);
router.get('/FT/getPod/:podId', authenticateJWT, podController.getFTPod);

router.get('/NFT/getPodTransactions/:podId', authenticateJWT, podController.getNFTPodTransactions);
router.get('/FT/getPodTransactions/:podId', authenticateJWT, podController.getFTPodTransactions);

router.get('/NFT/getMyPods/:userId', authenticateJWT, podController.getMyPodsNFT);
router.get('/FT/getMyPods/:userId', authenticateJWT, podController.getMyPodsFT);
router.get('/NFT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsNFT);
router.get('/FT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsFT);
router.get('/NFT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsNFT);
router.get('/FT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsFT);

router.get('/NFT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllNFTPodsInfo);
router.get('/FT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllFTPodsInfo);

router.post('/FT/initiatePod', authenticateJWT, podController.initiateFTPOD);
router.post('/FT/deletePod', authenticateJWT, podController.deleteFTPOD);
router.post('/FT/investPod', authenticateJWT, podController.investFTPOD);
router.post('/FT/sellPod', authenticateJWT, podController.sellFTPOD);
router.post('/FT/swapPod', authenticateJWT, podController.swapFTPod);

router.post('/followPod', authenticateJWT, podController.followPod);
router.post('/unFollowPod', authenticateJWT, podController.unFollowPod);

router.get('/FT/getPriceHistory/:podId', authenticateJWT, podController.getFTPodPriceHistory);
router.post('/FT/getPodTokenAmount', authenticateJWT, podController.getPodTokenAmount);
router.post('/FT/getFundingTokenAmount', authenticateJWT, podController.getFundingTokenAmount);

// NFT 
router.post('/NFT/initiatePod', authenticateJWT, podController.initiateNFTPod);
router.post('/NFT/newBuyOrder', authenticateJWT, podController.newBuyOrder);
router.post('/NFT/newSellOrder', authenticateJWT, podController.newSellOrder);
router.post('/NFT/deleteBuyOrder', authenticateJWT, podController.deleteBuyOrder);
router.post('/NFT/deleteSellOrder', authenticateJWT, podController.deleteSellOrder);
router.post('/NFT/sellPodNFT', authenticateJWT, podController.sellPodNFT);
router.post('/NFT/buyPodNFT', authenticateJWT, podController.buyPodNFT);
router.get('/NFT/getPriceHistory/:podId', authenticateJWT, podController.getNFTPodPriceHistory);

// common functions
router.post('/inviteRole', authenticateJWT, podController.inviteRole);
router.post('/replyRoleInvitation', authenticateJWT, podController.replyRoleInvitation);
router.post('/inviteView', authenticateJWT, podController.inviteView);

module.exports = router;
