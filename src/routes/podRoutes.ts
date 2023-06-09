import express from 'express';
import multer from 'multer';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const podController = require('../controllers/podController');
const podWallController = require('../controllers/podWallController');
const userController = require('../controllers/userController');

// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/pods');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload = multer({
  storage: storage,
});

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podWallPost');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload3 = multer({
  storage: storage3,
});

let storage2 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podWallPost/' + 'photos-' + req.params.podWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload2 = multer({
  storage: storage2,
});
let storage22 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podWallPost/' + 'videos-' + req.params.podWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4');
  },
});
let upload22 = multer({
  storage: storage22
});

let storage5 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podNFTWallPost');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload5 = multer({
  storage: storage5,
});

let storage4 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podNFTWallPost/' + 'photos-' + req.params.podNFTWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload4 = multer({
  storage: storage4,
});

let storage44 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/podNFTWallPost/' + 'videos-' + req.params.podNFTWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4');
  },
});
let upload44 = multer({
  storage: storage44
});

let storage6 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/wip');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload6 = multer({
  storage: storage6
});

let storage7 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/wipToken');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload7 = multer({
  storage: storage7
});

// COMMON

router.get('/FT/getPhoto/:podId', podController.getPhotoById);
router.get('/NFT/getPhoto/:podId', podController.getNFTPhotoById);
router.post('/followPod', authenticateJWT, podController.followPod);
router.post('/unFollowPod', authenticateJWT, podController.unFollowPod);
router.post('/inviteRole', authenticateJWT, podController.inviteRole);
router.post('/replyRoleInvitation', authenticateJWT, podController.replyRoleInvitation);
router.post('/inviteView', authenticateJWT, podController.inviteView);
router.post('/editPod', authenticateJWT, podController.editPod);
router.post('/sumTotalViews', authenticateJWT, podController.sumTotalViews);
router.post('/like', authenticateJWT, podController.like);

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
router.get('/FT/getTrendingPods', authenticateJWT, podController.getTrendingPodsFT);
router.get('/FT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsFT);
router.get('/FT/getAllPodsInfo/:pagination/:lastId', authenticateJWT, podController.getAllFTPodsInfo);
router.post('/FT/checkPodInfo', authenticateJWT, podController.checkPodInfo);

router.post('/changeFTPodPhoto', authenticateJWT, upload.single('image'), podController.changeFTPodPhoto);
router.post('/updateFTPodPhotoDimensions', authenticateJWT, podController.updateFTPodPhotoDimensions);

// NFT
router.post('/NFT/initiatePod', authenticateJWT, podController.initiateNFTPod);
router.post('/NFT/newBuyOrder', authenticateJWT, podController.newBuyOrder);
router.post('/NFT/newSellOrder', authenticateJWT, podController.newSellOrder);
router.post('/NFT/deleteBuyOrder', authenticateJWT, podController.deleteBuyOrder);
router.post('/NFT/deleteSellOrder', authenticateJWT, podController.deleteSellOrder);
router.post('/NFT/sellPodTokens', authenticateJWT, podController.sellPodTokens);
router.post('/NFT/buyPodTokens', authenticateJWT, podController.buyPodTokens);
router.post('/NFT/exportToEthereum', authenticateJWT, podController.exportToEthereum);

router.get('/NFT/getHistories/:podId', authenticateJWT, podController.getNFTPodHistories);
router.get('/NFT/getPod/:podId', authenticateJWT, podController.getNFTPod);
router.get('/NFT/getPodTransactions/:podId', authenticateJWT, podController.getNFTPodTransactions);
router.get('/NFT/getMyPods/:userId', authenticateJWT, podController.getMyPodsNFT);
router.get('/NFT/getTrendingPods', authenticateJWT, podController.getTrendingPodsNFT);
router.get('/NFT/getOtherPods/:userId', authenticateJWT, podController.getOtherPodsNFT);
router.get('/NFT/getAllPodsInfo/:pagination/:lastId', authenticateJWT, podController.getAllNFTPodsInfo);
router.post('/changeNFTPodPhoto', authenticateJWT, upload.single('image'), podController.changeNFTPodPhoto);
router.post('/updateNFTPodPhotoDimensions', authenticateJWT, podController.updateNFTPodPhotoDimensions);

router.post('/NFT/saveMediaPod', authenticateJWT, podController.saveNFTMedia);
router.post('/NFT/addOffer', authenticateJWT, podController.addOffer);
router.post('/NFT/changeOffer', authenticateJWT, podController.changeOffer);
router.post('/NFT/signTransactionAcceptOffer', authenticateJWT, podController.signTransactionAcceptOffer);
router.get('/NFT/getWIP/:mediaIdNFT/:userId/:notificationId', authenticateJWT, podController.getWIP);
router.get('/NFT/getNFTsList', authenticateJWT, podController.getNFTsList);

router.post('/WIP/changePhoto', authenticateJWT, upload6.single('image'), podController.changeWIPPhoto);
router.post('/WIP/changePhotoToken', authenticateJWT, upload7.single('image'), podController.changeWIPPhotoToken);
router.get('/WIP/getPhoto/:wipId', podController.getPhotoWIP);
router.get('/WIP/getPhotoToken/:wipId', podController.getPhotoTokenWIP);

//wall
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
router.post('/wall/addVideo/:podWallPostId', authenticateJWT, upload22.array('video'), podWallController.addVideoPost);
router.post('/wall/getVideo/:podWallPostId/:videoId', authenticateJWT, podWallController.getVideoPost);

//wall NFT
router.post('/NFT/wall/createPost', authenticateJWT, podWallController.postCreateNFT);
router.post('/NFT/wall/deletePost', authenticateJWT, podWallController.postDeleteNFT);
router.get('/NFT/wall/getPodPosts/:podId', authenticateJWT, podWallController.getPodPostsNFT);
router.get('/NFT/wall/getPodPost/:postId', authenticateJWT, podWallController.getPodPostByIdNFT);
router.post('/NFT/wall/changePostPhoto', authenticateJWT, upload5.single('image'), podWallController.changePostPhotoNFT);
router.post('/NFT/wall/changePostDescriptionPhotos/:podNFTWallPostId', authenticateJWT, upload4.array('image'), podWallController.changePostDescriptionPhotosNFT);
router.get('/NFT/wall/getPostPhoto/:podNFTWallPostId', podWallController.getPodWallPostPhotoByIdNFT);
router.get('/NFT/wall/getDescriptionPostPhoto/:podNFTWallPostId/:photoId', podWallController.getPodWallPostDescriptionPhotoByIdNFT);
router.post('/NFT/wall/makeResponse', authenticateJWT, podWallController.makeResponsePodWallPostNFT);
router.post('/NFT/wall/likePost', authenticateJWT, podWallController.likePostNFT);
router.post('/NFT/wall/dislikePost', authenticateJWT, podWallController.dislikePostNFT);
router.post('/NFT/wall/pinPost', authenticateJWT, podWallController.pinPostNFT);
router.post('/NFT/wall/addVideo/:podNFTWallPostId', authenticateJWT, upload44.array('video'), podWallController.addVideoPostNFT);
router.post('/NFT/wall/getVideo/:podNFTWallPostId/:videoId', authenticateJWT, podWallController.getVideoPostNFT);

//POD SLUG
router.get('/checkSlugExists/:urlSlug/:id/:type', userController.checkSlugExists);
router.get('/getIdFromSlug/:urlSlug/:type', userController.getIdFromSlug);
router.get('/getSlugFromId/:urlId/:type', userController.getSlugFromId);

module.exports = router;
