import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const communityController = require('../controllers/communityController');


router.post('/createCommunity', authenticateJWT, communityController.createCommunity);
router.post('/sellCommunityToken', authenticateJWT, communityController.sellCommunityToken);
router.post('/buyCommunityToken', authenticateJWT, communityController.buyCommunityToken);
router.post('/stakeCommunityFunds', authenticateJWT, communityController.stakeCommunityFunds);



module.exports = router;
