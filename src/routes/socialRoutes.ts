import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const socialController = require('../controllers/socialController');

router.post('/createSocialToken', authenticateJWT, socialController.createSocialToken);

router.get('/getSocialTokens', authenticateJWT, socialController.getSocialTokens);

module.exports = router;