import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const priviCreditController = require('../controllers/priviCreditController');
const priviCreditWallController = require('../controllers/priviCreditWallController');
const userController = require('../controllers/userController');

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/creditWallPost');
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
    cb(null, 'uploads/creditWallPost/' + 'photos-' + req.params.creditWallPostId);
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
    cb(null, 'uploads/creditWallPost/' + 'videos-' + req.params.creditWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4');
  },
});
let upload22 = multer({
  storage: storage22
});

let storage4 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/creditPools');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload4 = multer({
  storage: storage4,
});

router.get('/getPriviCredits/:pagination/:lastId', authenticateJWT, priviCreditController.getPriviCredits);
router.get('/getTrendingPriviCredits', authenticateJWT, priviCreditController.getTrendingPriviCredits);
router.get('/getPriviCredit/:creditId', authenticateJWT, priviCreditController.getPriviCredit);
router.get('/getPriviTransactions/:creditId', authenticateJWT, priviCreditController.getPriviTransactions);
router.get('/getHistories/:creditId', authenticateJWT, priviCreditController.getHistories);
router.get('/getPhoto/:creditId', priviCreditController.getCreditPoolPhotoById);
router.post('/sumTotalViews', authenticateJWT, priviCreditController.sumTotalViews);
router.post('/like', authenticateJWT, priviCreditController.like);

router.post('/initiatePriviCredit', authenticateJWT, priviCreditController.initiatePriviCredit);
router.post('/depositFunds', authenticateJWT, priviCreditController.depositFunds);
router.post('/borrowFunds', authenticateJWT, priviCreditController.borrowFunds);
router.post('/followCredit', authenticateJWT, priviCreditController.followCredit);
router.post('/unfollowCredit', authenticateJWT, priviCreditController.unfollowCredit);
router.post('/checkCreditInfo', authenticateJWT, priviCreditController.checkCreditInfo);
router.post(
  '/changeCreditPoolPhoto',
  authenticateJWT,
  upload4.single('image'),
  priviCreditController.changeCreditPoolPhoto
);
router.post('/editPriviCredit', authenticateJWT, priviCreditController.editPriviCredit);

router.post('/wall/createPost', authenticateJWT, priviCreditWallController.postCreate);
router.post('/wall/deletePost', authenticateJWT, priviCreditWallController.postDelete);
router.get('/wall/getCreditPosts/:priviCreditId', authenticateJWT, priviCreditWallController.getCreditPost);
router.get('/wall/getCreditPost/:postId', authenticateJWT, priviCreditWallController.getCreditPostById);
router.post('/wall/changePostPhoto', authenticateJWT, upload3.single('image'), priviCreditWallController.changePostPhoto);
router.post('/wall/changePostDescriptionPhotos/:creditWallPostId', authenticateJWT, upload2.array('image'), priviCreditWallController.changePostDescriptionPhotos);
router.get('/wall/getPostPhoto/:creditWallPostId', priviCreditWallController.getCreditWallPostPhotoById);
router.get('/wall/getDescriptionPostPhoto/:creditWallPostId/:photoId', priviCreditWallController.getCreditWallPostDescriptionPhotoById);
router.post('/wall/makeResponse', authenticateJWT, priviCreditWallController.makeResponseCreditWallPost);
router.post('/wall/likePost', authenticateJWT, priviCreditWallController.likePost);
router.post('/wall/dislikePost', authenticateJWT, priviCreditWallController.dislikePost);
router.post('/wall/pinPost', authenticateJWT, priviCreditWallController.pinPost);
router.post('/wall/addVideo/:creditWallPostId', authenticateJWT, upload22.array('video'), priviCreditWallController.addVideoPost);
router.post('/wall/getVideo/:creditWallPostId/:videoId', authenticateJWT, priviCreditWallController.getVideoPost);

//CREDIT SLUG
router.get('/checkSlugExists/:urlSlug/:id/:type', userController.checkSlugExists);
router.get('/getIdFromSlug/:urlSlug/:type', userController.getIdFromSlug);
router.get('/getSlugFromId/:urlId/:type', userController.getSlugFromId);

module.exports = router;
