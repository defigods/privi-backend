import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const mediaOnCommunityController = require('../controllers/mediaOnCommunityController');

router.get('/get/:id', authenticateJWT, mediaOnCommunityController.getMediaOnCommunity);
router.get('/accept/:id/:userId', authenticateJWT, mediaOnCommunityController.acceptMediaOnCommunity);
router.get('/decline/:id/:userId', authenticateJWT, mediaOnCommunityController.declineMediaOnCommunity);

router.get('/getByCommunity/:id', authenticateJWT, mediaOnCommunityController.getMediaWithCommunityId);
router.post('/getFromMediaArray', authenticateJWT, mediaOnCommunityController.getMediaOnCommunityFromMediaArray);
router.post('/create/:userId', authenticateJWT, mediaOnCommunityController.createMediaOnCommunity);
router.post('/newOffer/:id/:userId', authenticateJWT, mediaOnCommunityController.newOfferMediaOnCommunity);
router.post('/stopSelling/:id/:userId', authenticateJWT, mediaOnCommunityController.stopSellingMediaOnCommunity);


module.exports = router;
