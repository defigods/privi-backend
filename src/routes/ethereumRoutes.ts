
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const connectController = require('../controllers/connectController');

// router.get('/getERC20Balance', authenticateJWT, connectController.getERC20Balance);
router.get('/getRecentSwaps', authenticateJWT, connectController.getRecentSwaps);
router.get('/getBridgeRegisteredToken', authenticateJWT, connectController.getBridgeRegisteredToken);
router.post('/send', authenticateJWT, connectController.send);
router.post('/registerNewERC20TokenOnSwapManager', authenticateJWT, connectController.registerNewERC20TokenOnSwapManager);


module.exports = router;
