import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const podController = require('../controllers/podController');

router.get('/NFT/getMyPods/:userId', authenticateJWT, podController.getMyPodsNFT);
router.get('/FT/getMyPods/:userId', authenticateJWT, podController.getMyPodsFT);
router.get('/NFT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsNFT);
router.get('/FT/getTrendingPods/:userId', authenticateJWT, podController.getTrendingPodsFT);
router.get('/NFT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsNFT);
router.get('/FT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsFT);

router.get('/NFT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllNFTPodsInfo);
router.get('/FT/getAllPodsInfo/:userId', authenticateJWT, podController.getAllFTPodsInfo);

router.post('/initiatePod', authenticateJWT, podController.initiatePOD);
router.post('/deletePod', authenticateJWT, podController.deletePOD);
router.post('/investPod', authenticateJWT, podController.investPOD);
router.post('/swapPod', authenticateJWT, podController.swapPod);

router.post('/followPod', authenticateJWT, podController.followPod);
router.post('/unFollowPod', authenticateJWT, podController.unFollowPod);

module.exports = router;
