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

router.post('/changePodPhoto', upload.single('image'), podController.changePodPhoto);
router.get('/FT/getPhoto/:podId', podController.getPhotoById);

router.get('/NFT/getPod/:podId', podController.getNFTPod);
router.get('/FT/getPod/:podId', podController.getFTPod);

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
