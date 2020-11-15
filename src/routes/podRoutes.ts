import express from 'express';
import multer from "multer";
const router = express.Router();

const podController = require('../controllers/podController');

router.get('/NFT/getMyPods/:userId', podController.getMyPodsNFT);
router.get('/FT/getMyPods/:userId', podController.getMyPodsFT);
router.get('/NFT/getTrendingPods/:userId', podController.getTrendingPodsNFT);
router.get('/FT/getTrendingPods/:userId', podController.getTrendingPodsFT);
router.get('/NFT/getOtherPods/:userId', podController.getOtherPodsNFT);
router.get('/FT/getOtherPods/:userId', podController.getOtherPodsFT);

router.get('/NFT/getAllPodsInfo/:userId', podController.getAllNFTPodsInfo);
router.get('/FT/getAllPodsInfo/:userId', podController.getAllFTPodsInfo);

router.post('/initiatePod', podController.initiatePOD);
router.post('/deletePod', podController.deletePOD);
router.post('/investPod', podController.investPOD);
router.post('/swapPod', podController.swapPod);

router.post('/followPod', podController.followPod);
router.post('/unFollowPod', podController.unFollowPod);

module.exports = router;
