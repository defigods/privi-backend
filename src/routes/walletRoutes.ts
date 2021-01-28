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

router.get('/getBalanceData', authenticateJWT, walletController.getBalanceData);
router.get('/getTokensRateChange', authenticateJWT, walletController.getTokensRateChange);  // tokens rate change respect last day
router.get('/getTotalBalance_v2', authenticateJWT, walletController.getTotalBalance_v2);
router.get('/getTokenBalances_v2/:address', authenticateJWT, walletController.getTokenBalances_v2);
router.get('/getAllTokenBalances/:address', walletController.getAllTokenBalances);  // all token balances of the user with extra data (Type, ...)
router.get('/getAllTokensWithBuyingPrice', walletController.getAllTokensWithBuyingPrice);
router.get('/getBalanceHistoryInTokenTypes', authenticateJWT, walletController.getBalanceHistoryInTokenTypes);  // for evoluction graphs
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);


router.get('/getBalancesOfAddress', authenticateJWT, walletController.getBalancesOfAddress);
router.get('/getBalancesByType', authenticateJWT, walletController.getBalancesByType);



module.exports = router;