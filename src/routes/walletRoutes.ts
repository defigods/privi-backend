import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const walletController = require('../controllers/walletController');

router.post('/getUserTokenBalance', authenticateJWT, walletController.getUserTokenBalance);
router.post('/transfer', authenticateJWT, walletController.transfer);
router.post('/burn', authenticateJWT, walletController.burn);
router.post('/mint', authenticateJWT, walletController.mint);

router.get('/getTokensRate', authenticateJWT, walletController.getTokensRate);
router.get('/getTotalBalance', authenticateJWT, walletController.getTotalBalance);
router.get('/getTokenBalances', authenticateJWT, walletController.getTokenBalances);
router.get('/getAllTokenBalances', authenticateJWT, walletController.getAllTokenBalances);
router.get('/getBalanceHisotryInTokenTypes', authenticateJWT, walletController.getBalanceHisotryInTokenTypes);
router.get('/getTransfers', authenticateJWT, walletController.getTransfers);
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);
router.get('/getTotalIncome', authenticateJWT, walletController.getTotalIncome);
router.get('/getTotalExpense', authenticateJWT, walletController.getTotalExpense);

router.get('/getEmailToUidMap', authenticateJWT, walletController.getEmailToUidMap);


router.post('/registerTokens', walletController.registerTokens);
router.post('/updateTokens', walletController.updateTokens);

module.exports = router;