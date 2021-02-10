import express from 'express';
const router = express.Router();
import multer from 'multer';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const walletController = require('../controllers/walletController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/tokens');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload = multer({
  storage: storage,
});

router.post('/getUserTokenBalance', authenticateJWT, walletController.getUserTokenBalance);
router.post('/transfer', authenticateJWT, walletController.transfer);

// called from Postman
router.post('/burn', walletController.burn);
router.post('/mint', walletController.mint);
router.post('/registerTokens', walletController.registerTokens);
router.post('/updateTokensCollection', walletController.updateTokensCollection);

router.get('/getCryptosRateAsList', authenticateJWT, walletController.getCryptosRateAsList);
router.get('/getCryptosRateAsMap', authenticateJWT, walletController.getCryptosRateAsMap);

router.get('/getEmailToUidMap', authenticateJWT, walletController.getEmailToUidMap);
router.get('/getEmailToAddressMap', authenticateJWT, walletController.getEmailToAddressMap);

router.get('/getBalanceData', authenticateJWT, walletController.getBalanceData);
router.get('/getTokensRateChange', authenticateJWT, walletController.getTokensRateChange); // tokens rate change respect last day
router.get('/getTotalBalance_v2', authenticateJWT, walletController.getTotalBalance_v2);
router.get('/getTokenBalances_v2/:address', authenticateJWT, walletController.getTokenBalances_v2);
router.get('/getAllTokenBalances/:address', authenticateJWT, walletController.getAllTokenBalances); // all token balances of the user with extra data (Type, ...)
router.get('/getAllTokensWithBuyingPrice', authenticateJWT, walletController.getAllTokensWithBuyingPrice);
router.get('/getBalanceHistoryInTokenTypes', authenticateJWT, walletController.getBalanceHistoryInTokenTypes); // for evoluction graphs
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);

router.get('/getBalancesByType', authenticateJWT, walletController.getBalancesByType);

//token images
router.get('/getTokenPhoto/:tokenSymbol', walletController.getTokenPhotoById);
router.post('/changeTokenPhoto', authenticateJWT, upload.single('image'), walletController.changeTokenPhoto);

module.exports = router;
