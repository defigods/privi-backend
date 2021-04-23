import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const mediaOnCommunityController = require('../controllers/mediaOnCommunityController');

router.get('/get/:id', authenticateJWT, mediaOnCommunityController.getMediaOnCommunity);

router.post('/create/:userId', authenticateJWT, mediaOnCommunityController.createMediaOnCommunity);
router.post('/accept/:id/:userId', authenticateJWT, mediaOnCommunityController.acceptMediaOnCommunity);
router.post('/decline/:id/:userId', authenticateJWT, mediaOnCommunityController.declineMediaOnCommunity);
router.post('/newOffer/:id/:userId', authenticateJWT, mediaOnCommunityController.newOfferMediaOnCommunity);
router.post('/stopSelling/:id/:userId', authenticateJWT, mediaOnCommunityController.stopSellingMediaOnCommunity);


module.exports = router;
