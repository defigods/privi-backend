import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
const insuranceController = require('../controllers/insuranceController');
const insuranceWallController = require('../controllers/insuranceWallController');

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/insuranceWallPost')
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
    cb(null, 'uploads/insuranceWallPost/' + 'photos-' + req.params.insuranceWallPostId)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png')
  }
});
let upload2 = multer({
  storage: storage2
});

let storage22 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/insuranceWallPost/' + 'videos-' + req.params.insuranceWallPostId)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4')
  }
});
let upload22 = multer({
  storage: storage22
});


// FT
router.post('/FT/initiateInsurancePool', authenticateJWT, insuranceController.initiateInsurancePool);
router.post('/FT/investInsurancePool', authenticateJWT, insuranceController.investInsurancePool);
router.post('/FT/subscribeInsurancePool', authenticateJWT, insuranceController.subscribeInsurancePool);
router.post('/FT/unsubscribeInsurancePool', authenticateJWT, insuranceController.unsubscribeInsurancePool);

router.get('/FT/getAllInsurancePools', authenticateJWT, insuranceController.getAllInsurancePools);

// NFT
router.post('/NFT/initiateInsurancePool', authenticateJWT, insuranceController.initiateInsurancePoolNFT);
router.post('/NFT/investInsurancePool', authenticateJWT, insuranceController.investInsurancePoolNFT);
router.post('/NFT/subscribeInsurancePool', authenticateJWT, insuranceController.subscribeInsurancePoolNFT);
router.post('/NFT/unsubscribeInsurancePool', authenticateJWT, insuranceController.unsubscribeInsurancePoolNFT);


router.post('/wall/createPost', authenticateJWT, insuranceWallController.postCreate);
router.post('/wall/deletePost', authenticateJWT, insuranceWallController.postDelete);
router.get('/wall/getInsurancePosts/:podId', authenticateJWT, insuranceWallController.getInsurancePost);
router.get('/wall/getInsurancePost/:postId', authenticateJWT, insuranceWallController.getInsurancePostById);
router.post('/wall/changePostPhoto', authenticateJWT, upload3.single('image'), insuranceWallController.changePostPhoto);
router.post('/wall/changePostDescriptionPhotos/:insuranceWallPostId', authenticateJWT, upload2.array('image'), insuranceWallController.changePostDescriptionPhotos);
router.get('/wall/getPostPhoto/:insuranceWallPostId', insuranceWallController.getInsuranceWallPostPhotoById);
router.get('/wall/getDescriptionPostPhoto/:insuranceWallPostId/:photoId', insuranceWallController.getInsuranceWallPostDescriptionPhotoById);
router.post('/wall/makeResponse', authenticateJWT, insuranceWallController.makeResponseInsuranceWallPost);
router.post('/wall/likePost', authenticateJWT, insuranceWallController.likePost);
router.post('/wall/dislikePost', authenticateJWT, insuranceWallController.dislikePost);
router.post('/wall/pinPost', authenticateJWT, insuranceWallController.pinPost);
router.post('/wall/addVideo/:insuranceWallPostId', authenticateJWT, upload22.array('video'), insuranceWallController.addVideoPost);
router.post('/wall/getVideo/:insuranceWallPostId/:videoId', authenticateJWT, insuranceWallController.getVideoPost);

module.exports = router;
