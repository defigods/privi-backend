import express from 'express';
import multer from 'multer';
import path from 'path';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const fractionaliseMediaController = require('../controllers/fractionaliseMedia');

// POSTS
router.post('/fractionalise', authenticateJWT, fractionaliseMediaController.fractionalise);
router.post('/newBuyOrder', authenticateJWT, fractionaliseMediaController.newBuyOrder);
router.post('/newSellOrder', authenticateJWT, fractionaliseMediaController.newSellOrder);
router.post('/deleteBuyOrder', authenticateJWT, fractionaliseMediaController.deleteBuyOrder);
router.post('/deleteSellOrder', authenticateJWT, fractionaliseMediaController.deleteSellOrder);
router.post('/buyFraction', authenticateJWT, fractionaliseMediaController.buyFraction);
router.post('/sellFraction', authenticateJWT, fractionaliseMediaController.sellFraction);

// GETS


module.exports = router;