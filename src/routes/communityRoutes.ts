import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const communityController = require('../controllers/communityController');
const blogController = require('../controllers/blogController');
const projectController = require('../controllers/communityProjectController');
const communityWallController = require('../controllers/communityWallController');
const userController = require('../controllers/userController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/badges');
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
    cb(null, 'uploads/blogPost/' + 'photos-' + req.params.blogPostId);
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
    cb(null, 'uploads/blogPost');
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
    cb(null, 'uploads/communityWallPost/' + 'photos-' + req.params.communityWallPostId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});

let upload4 = multer({
  storage: storage4,
});

let storage5 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/communityWallPost');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload5 = multer({
  storage: storage5,
});

let storage6 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/community');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload6 = multer({
  storage: storage6,
});

let storage7 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/communityProject');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload7 = multer({
  storage: storage7,
});

let storage8 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/communityDiscussion/' + 'photos-' + req.params.discussionId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload8 = multer({
  storage: storage8,
});

let storage9 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/communityDiscussion');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload9 = multer({
  storage: storage9,
});
/*let storage4 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/ad')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload4 = multer({
    storage: storage4
});


let storage5 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/ad/' + 'photos-' + req.params.blogPostId)
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload5 = multer({
    storage: storage5
});*/

/*router.post('/votation/create', authenticateJWT, communityController.createVotation);
router.post('/votation/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);*/

//badges
router.post('/badges/getBadges/:communityAddress', authenticateJWT, communityController.getBadges);
// router.post('/badges/create', authenticateJWT, communityController.createBadge);
router.post('/badges/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);
router.get('/badges/getPhoto/:badgeId', communityController.getBadgePhotoById);
router.post('/transfer', authenticateJWT, communityController.transfer);

// communities
router.get('/getCommunities/:pagination/:lastId', authenticateJWT, communityController.getCommunities);
router.get('/getCommunity/:communityAddress', communityController.getCommunity);
router.post('/getCommunityCounters', authenticateJWT, communityController.getCommunityCounters);
router.get('/getTrendingCommunities', authenticateJWT, communityController.getTrendingCommunities);
router.get('/getMembersData', authenticateJWT, communityController.getMembersData);
router.get('/getUserPaymentData', authenticateJWT, communityController.getUserPaymentData);
router.get('/getCommunityTransactions', authenticateJWT, communityController.getCommunityTransactions);
router.get('/getPhoto/:communityId', communityController.getCommunityPhotoById);
router.post('/changeCommunityPhoto', authenticateJWT, upload6.single('image'), communityController.changeCommunityPhoto);
router.post('/editCommunity', authenticateJWT, communityController.editCommunity);
router.post('/editRules', authenticateJWT, communityController.editRules);
router.post('/editLevels', authenticateJWT, communityController.editLevels);

router.post('/follow', authenticateJWT, communityController.follow);
router.post('/unfollow', authenticateJWT, communityController.unfollow);
router.post('/join', authenticateJWT, communityController.join);
router.post('/leave', authenticateJWT, communityController.leave);
router.post('/sumTotalViews', authenticateJWT, communityController.sumTotalViews);
router.post('/like', authenticateJWT, communityController.like);

router.post('/createCommunity', authenticateJWT, communityController.createCommunity);
router.post('/createCommunityToken', authenticateJWT, communityController.createCommunityToken);
router.post('/setVestingConditions', authenticateJWT, communityController.setVestingConditions);
router.post('/setComunityBirdgeRegistered', authenticateJWT, communityController.setComunityBirdgeRegistered);
router.post('/sellCommunityToken', authenticateJWT, communityController.sellCommunityToken);
router.post('/buyCommunityToken', authenticateJWT, communityController.buyCommunityToken);
router.post('/stakeCommunityFunds', authenticateJWT, communityController.stakeCommunityFunds);
router.post('/checkCommunityInfo', authenticateJWT, communityController.checkCommunityInfo);
router.post('/saveCommunity', authenticateJWT, communityController.saveCommunity);
router.post('/addOffer', authenticateJWT, communityController.addOffer);
router.post('/changeOffer', authenticateJWT, communityController.changeOffer);

router.post('/allocateFunds', authenticateJWT, communityController.allocateFunds);
router.get('/getMaxAllocatingFund', authenticateJWT, communityController.getMaxAllocatingFund);
router.get('/getCommunityAllocations', authenticateJWT, communityController.getCommunityAllocations);

router.post('/getBuyTokenAmount', authenticateJWT, communityController.getBuyTokenAmount);
router.post('/getSellTokenAmount', authenticateJWT, communityController.getSellTokenAmount);

router.post('/projects/getProjects/:communityId', authenticateJWT, projectController.getProjects);
router.post('/projects/createProject', authenticateJWT, projectController.createProject);
router.post('/projects/changeProjectPhoto', authenticateJWT, upload7.single('image'), projectController.changeProjectPhoto);
router.get('/projects/getPhoto/:projectId', projectController.getProjectPhotoById);

router.post('/blog/createPost', authenticateJWT, blogController.blogCreate);
router.post('/blog/deletePost', authenticateJWT, blogController.blogDelete);
router.get('/blog/getBlogPosts/:communityId', authenticateJWT, blogController.getBlogPost);
router.get('/blog/getBlogPost/:postId', authenticateJWT, blogController.getBlogPostById);
router.post('/blog/changePostPhoto', authenticateJWT, upload3.single('image'), blogController.changePostPhoto);
router.post('/blog/changePostDescriptionPhotos/:blogPostId', authenticateJWT, upload2.array('image'), blogController.changePostDescriptionPhotos);
router.get('/blog/getPostPhoto/:blogPostId', blogController.getBlogPostPhotoById);
router.get('/blog/getDescriptionPostPhoto/:blogPostId/:photoId', blogController.getBlogPostDescriptionPhotoById);
router.post('/blog/makeResponse', authenticateJWT, blogController.makeResponseBlogPost);
router.post('/blog/likePost', authenticateJWT, blogController.likePost);
router.post('/blog/dislikePost', authenticateJWT, blogController.dislikePost);

router.post('/discussions/createPost', authenticateJWT, blogController.discussionsCreate);
router.post('/discussions/deletePost', authenticateJWT, blogController.discussionsDelete);
router.get('/discussions/getDiscussions/:communityId', authenticateJWT, blogController.getDiscussionsPost);
router.get('/discussions/getDiscussion/:discussionId', authenticateJWT, blogController.getDiscussionsPostById);
router.post('/discussions/changePostPhoto', authenticateJWT, upload9.single('image'), blogController.changeDiscussionsPhoto);
router.post('/discussions/changePostDescriptionPhotos/:discussionId', authenticateJWT, upload8.array('image'), blogController.changeDiscussionsDescriptionPhotos);
router.get('/discussions/getPostPhoto/:discussionId', blogController.getDiscussionsPhotoById);
router.get('/discussions/getDescriptionPostPhoto/:discussionId/:photoId', blogController.getDiscussionsDescriptionPhotoById);
router.post('/discussions/makeResponse', authenticateJWT, blogController.makeResponseDiscussions);
router.post('/discussions/likePost', authenticateJWT, blogController.likePostDiscussions);
router.post('/discussions/dislikePost', authenticateJWT, blogController.dislikePostDiscussions);

router.post('/wall/createPost', authenticateJWT, communityWallController.postCreate);
router.post('/wall/deletePost', authenticateJWT, communityWallController.postDelete);
router.get('/wall/getCommunityPosts/:communityId', authenticateJWT, communityWallController.getCommunityPost);
router.get('/wall/getCommunityPost/:postId', authenticateJWT, communityWallController.getCommunityPostById);
router.post('/wall/changePostPhoto', authenticateJWT, upload5.single('image'), communityWallController.changePostPhoto);
router.post('/wall/changePostDescriptionPhotos/:communityWallPostId', authenticateJWT, upload4.array('image'), communityWallController.changePostDescriptionPhotos);
router.get('/wall/getPostPhoto/:communityWallPostId', communityWallController.getCommunityWallPostPhotoById);
router.get('/wall/getDescriptionPostPhoto/:communityWallPostId/:photoId', communityWallController.getCommunityWallPostDescriptionPhotoById);
router.post('/wall/makeResponse', authenticateJWT, communityWallController.makeResponseCommunityWallPost);
router.post('/wall/likePost', authenticateJWT, communityWallController.likePost);
router.post('/wall/dislikePost', authenticateJWT, communityWallController.dislikePost);
router.post('/wall/pinPost', authenticateJWT, communityWallController.pinPost);

router.post('/acceptRoleInvitation', authenticateJWT, communityController.acceptRoleInvitation);
router.post('/declineRoleInvitation', authenticateJWT, communityController.declineRoleInvitation);
router.post('/roleInvitation', authenticateJWT, communityController.roleInvitation);
router.post('/removeRoleUser', authenticateJWT, communityController.removeRoleUser);

router.post('/events/createEvent', authenticateJWT, communityController.addEvent);

//COMMUNITY SLUG
router.get('/checkSlugExists/:urlSlug/:id/:type', userController.checkSlugExists);
router.get('/getIdFromSlug/:urlSlug/:type', userController.getIdFromSlug);
router.get('/getSlugFromId/:urlId/:type', userController.getSlugFromId);

/*router.post('/ad/create', authenticateJWT, blogController.adCreate);
router.post('/ad/changePhoto', authenticateJWT, upload4.single('image'), blogController.changeAdPhoto);
router.post('/ad/changeDescriptionPhotos/:adId', authenticateJWT, upload5.array('image'), blogController.changeAdDescriptionPhotos);
router.get('/ad/getPhoto/:adId', blogController.getAdPostPhotoById);
router.get('/ad/getDescriptionPhoto/:adId/:photoId', blogController.getAdPostDescriptionPhotoById);*/

module.exports = router;
