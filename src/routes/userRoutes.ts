import express from 'express';
import multer from 'multer';
// import path from 'path';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const userController = require('../controllers/userController');
const userWallController = require('../controllers/userWallController');
const mediaController = require('../controllers/mediaController');

// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/users');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload = multer({
  storage: storage,
});

let storage2 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/badges');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload2 = multer({
  storage: storage2,
});
let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/wallPost');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload3 = multer({
  storage: storage3,
});

let storage4 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/userWallPost/' + 'photos-' + req.params.userWallPostId);
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
    cb(null, 'uploads/userWallPost/' + 'videos-' + req.params.userWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4');
  },
});

let upload44 = multer({
  storage: storage44,
});

let storage5 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/userWallPost');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload5 = multer({
  storage: storage5,
});

// AUTHENTICATION
router.post('/forgot_password', userController.forgotPassword);
router.post('/signIn', userController.signIn);
router.post('/signInWithWallet', userController.signInWithWallet);
router.post('/signUp', userController.signUp);
router.post('/signUpWithWallet', userController.signUpWithWallet);

router.post('/attachAddress', authenticateJWT, userController.attachAddress);
// router.post('/createMnemonic', userController.createMnemonic);
//router.get('/:userId', userController.signIn);
router.get('/email_validation/:validation_slug', userController.emailValidation);
router.post('/resend_email_validation', userController.resendEmailValidation);

router.get('/getBasicInfo/:userId', userController.getBasicInfo);
router.get('/getLoginInfo/:userId', authenticateJWT, userController.getLoginInfo);
router.get('/getAllInfoProfile', userController.getAllInfoProfile);
router.post('/toggleHideItem', authenticateJWT, userController.toggleHideItem);

// MY WALL - GETS
router.get('/wall/getFollowPodsInfo/:userId', authenticateJWT, userController.getFollowPodsInfo);
router.get('/wall/getFollowUserInfo/:userId', authenticateJWT, userController.getFollowingUserInfo);
router.get('/wall/getFollowMyInfo/:userId', authenticateJWT, userController.getOwnInfo);
router.get('/wall/getNotifications/:userId', authenticateJWT, userController.getNotifications);
/*router.post('/wall/', authenticateJWT, userController.postToWall);
router.post('/wall/likePost', authenticateJWT, userController.likePost);
router.post('/wall/dislikePost', authenticateJWT, userController.dislikePost);
router.post('/wall/changePostPhoto', authenticateJWT, upload3.single('image'), userController.changePostPhoto);
router.get('/wall/getPostPhoto/:postId', userController.getPostPhotoById);*/

// CONNECTIONS - GETS
router.get('/connections/getFollowers/:userId/:ownUser', authenticateJWT, userController.getFollowers);
router.get('/connections/getFollowings/:userId/:ownUser', authenticateJWT, userController.getFollowing);

// INVESTMENTS - GETS
router.get('/investments/getMyPods/:userId', authenticateJWT, userController.getMyPods);
router.get('/investments/getPodsInvestment/:userId', authenticateJWT, userController.getPodsInvestments);
router.get('/investments/getPodsFollowed/:userId', authenticateJWT, userController.getPodsFollowed);
router.get('/investments/getReceivables/:userId', authenticateJWT, userController.getReceivables);
router.get('/investments/getLiabilities/:userId', authenticateJWT, userController.getLiabilities);
router.get('/investments/getSocialTokens/:userId', authenticateJWT, userController.getSocialTokens);

router.get('/governance/getIssuesAndProposals/:userId', authenticateJWT, userController.getIssuesAndProposals);

// POST
/*router.post('/addToWaitlist', authenticateJWT, userController.addToWaitlist);
 */

// CONNECTIONS - POST
router.post('/connections/followUser', authenticateJWT, userController.followUser);
router.post('/connections/acceptFollowUser', authenticateJWT, userController.acceptFollowUser);
router.post('/connections/declineFollowUser', authenticateJWT, userController.declineFollowUser);
router.post('/connections/unFollowUser', authenticateJWT, userController.unFollowUser);
router.post('/connections/superFollowerUser', authenticateJWT, userController.superFollowerUser);

router.post('/editUser', authenticateJWT, userController.editUser);
router.post('/changeProfilePhoto', authenticateJWT, upload.single('image'), userController.changeUserProfilePhoto);
router.get('/getPhoto/:userId', userController.getPhotoById);
router.post('/updateNewLevel', authenticateJWT, userController.updateNewLevel);
router.post('/updateNewBadge', authenticateJWT, userController.updateNewBadge);

router.post('/getUserList', authenticateJWT, userController.getUserList);

router.get('/pointsInfo', authenticateJWT, userController.getPointsInfo);
// BADGES
router.get('/badges/getAllBadges', authenticateJWT, userController.getAllBadges);
router.get('/badges/getBadgeData', authenticateJWT, userController.getBadgeData);
router.get('/badges/getBadges/:address', authenticateJWT, userController.getBadges);
router.post('/badges/create', authenticateJWT, userController.createBadge);
router.post('/badges/changeBadgePhoto', authenticateJWT, upload2.single('image'), userController.changeBadgePhoto);
router.get('/badges/getPhoto/:badgeId', userController.getBadgePhotoById);
router.get('/badges/getBadgeBySymbol/:badgeSymbol', authenticateJWT, userController.getBadgeBySymbol);

router.get('/getUserScores/:userId', authenticateJWT, userController.getUserScores);
router.get('/getStatistics/:userId', authenticateJWT, userController.getStatistics);

router.get('/checkIfUserExists/:userId', userController.checkIfUserExists);
router.post('/sumTotalViews', userController.sumTotalViews);

router.post('/governance/createIssue', userController.createIssue);
router.post('/governance/createProposal', userController.createProposal);
router.post('/governance/responseIssue', userController.responseIssue);
router.post('/governance/voteIssue', userController.voteIssue);
router.post('/governance/responseProposal', userController.responseProposal);

//ANON MODE
router.post('/changeAnonMode', userController.changeAnonMode);
router.post('/changeAnonAvatar', userController.changeAnonAvatar);

router.post('/wall/createPost', authenticateJWT, userWallController.postCreate);
router.post('/wall/deletePost', authenticateJWT, userWallController.postDelete);
router.get('/wall/getUserPosts/:userId', authenticateJWT, userWallController.getUserPosts);
router.get('/wall/getUserPost/:postId', authenticateJWT, userWallController.getUserPostById);
router.post('/wall/changePostPhoto', authenticateJWT, upload5.single('image'), userWallController.changePostPhoto);
router.post(
  '/wall/changePostDescriptionPhotos/:userWallPostId',
  authenticateJWT,
  upload4.array('image'),
  userWallController.changePostDescriptionPhotos
);
router.get('/wall/getPostPhoto/:userWallPostId', userWallController.getUserWallPostPhotoById);
router.get(
  '/wall/getDescriptionPostPhoto/:userWallPostId/:photoId',
  userWallController.getUserWallPostDescriptionPhotoById
);
router.post('/wall/makeResponse', authenticateJWT, userWallController.makeResponseUserWallPost);
router.post('/wall/likePost', authenticateJWT, userWallController.likePost);
router.post('/wall/dislikePost', authenticateJWT, userWallController.dislikePost);
router.post('/wall/pinPost', authenticateJWT, userWallController.pinPost);
router.post('/wall/onlyForSuperFollowers', authenticateJWT, userWallController.onlyForSuperFollowers);
router.post(
  '/wall/addVideo/:userWallPostId',
  authenticateJWT,
  upload44.single('video'),
  userWallController.addVideoPost
);
router.post('/wall/getVideo/:userWallPostId/:videoId', authenticateJWT, userWallController.getVideoPost);


router.get('/feed/getPosts/:userId', authenticateJWT, userWallController.getFeedPosts);

router.post('/searchUsers', authenticateJWT, userController.searchUsers);

router.post('/removeNotification', authenticateJWT, userController.removeNotification);
router.post('/inviteUserToPod', authenticateJWT, userController.inviteUserToPod);

router.get('/getSuggestedUsers/:userId', authenticateJWT, userController.getSuggestedUsers);

//UPDATE TUTORIALS SEEN
router.post('/updateTutorialsSeen', userController.updateTutorialsSeen);

//USER SLUG
router.get('/checkSlugExists/:urlSlug/:id/:type', userController.checkSlugExists);
router.get('/getIdFromSlug/:urlSlug/:type', userController.getIdFromSlug);
router.get('/getSlugFromId/:urlId/:type', userController.getSlugFromId);

router.get('/getFriends/:userId', userController.getFriends);

router.get('/getUserMediaInfo/:userId', mediaController.getUserMediaInfo);

//USER WALLET
router.post('/updateWalletAddress', authenticateJWT, userController.updateWalletAddress);

//USER MEDIA
router.get('/media/getMediaCurated/:userId', authenticateJWT, mediaController.getMediaCurated);
router.get('/media/getMediaLiked/:userId', authenticateJWT, mediaController.getMediaLiked);

module.exports = router;
