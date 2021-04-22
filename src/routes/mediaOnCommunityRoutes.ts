import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const mediaOnCommunityController = require('../controllers/mediaOnCommunityController');

router.get('/get/:id', authenticateJWT, mediaOnCommunityController.getMediaOnCommunity);

router.post('/create', authenticateJWT, mediaOnCommunityController.createMediaOnCommunity);
router.post('/accept/:id', authenticateJWT, mediaOnCommunityController.acceptMediaOnCommunity);
router.post('/decline/:id', authenticateJWT, mediaOnCommunityController.declineMediaOnCommunity);
router.post('/newOffer/:id', authenticateJWT, mediaOnCommunityController.newOfferMediaOnCommunity);
router.post('/stopSelling/:id', authenticateJWT, mediaOnCommunityController.stopSellingMediaOnCommunity);


module.exports = router;
