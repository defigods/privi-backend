import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
const communityController = require('../controllers/communityController');

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

router.get('/getCommunities', authenticateJWT, communityController.getCommunities);
router.get('/getCommunity/:communityAddress', authenticateJWT, communityController.getCommunity);

router.post('/follow', authenticateJWT, communityController.follow);
router.post('/unfollow', authenticateJWT, communityController.unfollow);
router.post('/join', authenticateJWT, communityController.join);
router.post('/leave', authenticateJWT, communityController.leave);

router.post('/votation/create', authenticateJWT, communityController.createVotation);
router.post('/votation/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);

router.post('/badges/create', authenticateJWT, communityController.createBadge);
router.post('/badges/changeBadgePhoto', authenticateJWT, upload.single('image'), communityController.changeBadgePhoto);

router.post('/createCommunity', authenticateJWT, communityController.createCommunity);
router.post('/sellCommunityToken', authenticateJWT, communityController.sellCommunityToken);
router.post('/buyCommunityToken', authenticateJWT, communityController.buyCommunityToken);
router.post('/stakeCommunityFunds', authenticateJWT, communityController.stakeCommunityFunds);



module.exports = router;
