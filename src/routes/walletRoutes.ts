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
router.get('/getTotalBalance_v2', authenticateJWT, walletController.getTotalBalance_v2);
router.get('/getTokenBalances', authenticateJWT, walletController.getTokenBalances);    // rateOfChange token balances
router.get('/getTokenBalances_v2', authenticateJWT, walletController.getTokenBalances_v2);
router.get('/getAllTokenBalances', authenticateJWT, walletController.getAllTokenBalances);  // all token balances
router.get('/getAllTokensWithBuyingPrice', walletController.getAllTokensWithBuyingPrice);  // all token balances
router.get('/getBalanceHisotryInTokenTypes', authenticateJWT, walletController.getBalanceHisotryInTokenTypes);
router.get('/getTransfers', authenticateJWT, walletController.getTransfers);
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);
router.get('/getTotalIncome', authenticateJWT, walletController.getTotalIncome);
router.get('/getTotalExpense', authenticateJWT, walletController.getTotalExpense);

router.get('/getEmailToUidMap', authenticateJWT, walletController.getEmailToUidMap);

router.get('/getBalancesOfAddress', authenticateJWT, walletController.getBalancesOfAddress);


router.post('/registerTokens', walletController.registerTokens);
router.post('/updateTokens', walletController.updateTokens);

module.exports = router;