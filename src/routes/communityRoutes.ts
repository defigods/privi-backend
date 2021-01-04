import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
const communityController = require('../controllers/communityController');
const blogController = require('../controllers/blogController');

let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/badges')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});


let storage2 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/blog-post/' + req.params.blogPostId)
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload2 = multer({
    storage: storage2
});

router.post('/votation/create', authenticateJWT, communityController.createVotation);
router.post('/votation/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);

router.post('/badges/getBadges', authenticateJWT, communityController.getBadges);
router.post('/badges/create', authenticateJWT, communityController.createBadge);
router.post('/badges/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);

// communities
router.get('/getCommunities', authenticateJWT, communityController.getCommunities);
router.get('/getCommunity/:communityAddress', authenticateJWT, communityController.getCommunity);

router.post('/follow', authenticateJWT, communityController.follow);
router.post('/unfollow', authenticateJWT, communityController.unfollow);
router.post('/join', authenticateJWT, communityController.join);
router.post('/leave', authenticateJWT, communityController.leave);

router.post('/createCommunity', authenticateJWT, communityController.createCommunity);
router.post('/sellCommunityToken', authenticateJWT, communityController.sellCommunityToken);
router.post('/buyCommunityToken', authenticateJWT, communityController.buyCommunityToken);
router.post('/stakeCommunityFunds', authenticateJWT, communityController.stakeCommunityFunds);

router.post('/getBuyTokenAmount', authenticateJWT, communityController.getBuyTokenAmount);
router.post('/getSellTokenAmount', authenticateJWT, communityController.getSellTokenAmount);

router.post('/blog/createPost', authenticateJWT, blogController.blogCreate);
router.post('/blog/changePostPhoto', authenticateJWT, upload.single('image'), blogController.changePostPhoto);
router.post('/blog/changePostDescriptionPhotos/:blogPostId', authenticateJWT, upload2.array('image'), blogController.changePostDescriptionPhotos);



module.exports = router;
