
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const connectController = require('../controllers/connectController');

router.get('/getERC20Balance', authenticateJWT, connectController.getERC20Balance);
//router.post('/transferEthWithdraw', authenticateJWT, connectController.transferEthWithdraw);
//router.post('/balanceToken', authenticateJWT, connectController.balanceToken);
//router.post('/transferTokenWithdraw', authenticateJWT, connectController.transferTokenWithdraw);
//router.post('/send', authenticateJWT, connectController.send);
//router.post('/swap', authenticateJWT, connectController.swap);

module.exports = router;
