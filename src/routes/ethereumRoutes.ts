
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const connectController = require('../controllers/connectController');

router.get('/getERC20Balance', authenticateJWT, connectController.getERC20Balance);
router.post('/swapERC20', authenticateJWT, connectController.swapERC20);
router.post('/withdrawERC20', authenticateJWT, connectController.withdrawERC20);
//router.post('/transferEthWithdraw', authenticateJWT, connectController.transferEthWithdraw);
//router.post('/balanceToken', authenticateJWT, connectController.balanceToken);
//router.post('/transferTokenWithdraw', authenticateJWT, connectController.transferTokenWithdraw);


module.exports = router;
