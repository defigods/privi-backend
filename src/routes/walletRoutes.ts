import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const walletController = require('../controllers/walletController');

router.post('/send', authenticateJWT, walletController.send);
router.post('/withdraw', authenticateJWT, walletController.withdraw);
router.post('/swap', authenticateJWT, walletController.swap);

// router.post('/getTokensRate', authenticateJWT, walletController.getTokensRate);
router.get('/getTokensRate', authenticateJWT, walletController.getTokensRate);
router.get('/getTotalBalance', authenticateJWT, walletController.getTotalBalance);
router.get('/getTotalBalancePC', authenticateJWT, walletController.getTotalBalancePC);
router.get('/getTokenBalances', authenticateJWT, walletController.getTokenBalances);
router.get('/getTransfers', authenticateJWT, walletController.getTransfers);
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);
router.get('/getTotalIncome', authenticateJWT, walletController.getTotalIncome);
router.get('/getTotalExpense', authenticateJWT, walletController.getTotalExpense);

module.exports = router;
