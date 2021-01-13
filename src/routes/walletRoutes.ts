import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const walletController = require('../controllers/walletController');

router.post('/getUserTokenBalance', authenticateJWT, walletController.getUserTokenBalance);
router.post('/transfer', authenticateJWT, walletController.transfer);


// called from Postman
router.post('/burn', walletController.burn);
router.post('/mint', walletController.mint);
router.post('/registerTokens', walletController.registerTokens);
router.post('/updateTokens', walletController.updateTokens);

router.get('/getCryptosRateAsList', authenticateJWT, walletController.getCryptosRateAsList);
router.get('/getCryptosRateAsMap', authenticateJWT, walletController.getCryptosRateAsMap);

router.get('/getEmailToUidMap', authenticateJWT, walletController.getEmailToUidMap);
router.get('/getEmailToAddressMap', authenticateJWT, walletController.getEmailToAddressMap);

router.get('/getTokensRateChange', authenticateJWT, walletController.getTokensRateChange);  // tokens rate change respect last day
router.get('/getTotalBalance', authenticateJWT, walletController.getTotalBalance);  // sum of balance in some token
// router.get('/getTokensRate', authenticateJWT, walletController.getTokensRate);
router.get('/getTotalBalance', authenticateJWT, walletController.getTotalBalance);
router.get('/getTotalBalance_v2', authenticateJWT, walletController.getTotalBalance_v2);
router.get('/getTokenBalances', authenticateJWT, walletController.getTokenBalances);    // rateOfChange token balances
router.get('/getTokenBalances_v2', authenticateJWT, walletController.getTokenBalances_v2);
router.get('/getAllTokenBalances/:address', walletController.getAllTokenBalances);  // all token balances of the user
router.get('/getAllTokensWithBuyingPrice', walletController.getAllTokensWithBuyingPrice);
router.get('/getBalanceHistoryInTokenTypes', authenticateJWT, walletController.getBalanceHistoryInTokenTypes);  // for evoluction graphs
router.get('/getTransfers', authenticateJWT, walletController.getTransfers);
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);


router.get('/getBalancesOfAddress', authenticateJWT, walletController.getBalancesOfAddress);



module.exports = router;