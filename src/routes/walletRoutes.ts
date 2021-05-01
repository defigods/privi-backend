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

// called from Postman
router.post('/burn', walletController.burn);
router.post('/mint', walletController.mint);
router.post('/registerTokens', walletController.registerTokens);
router.post('/updateTokensCollection', walletController.updateTokensCollection);
router.post('/registerUserEthAccount', walletController.registerUserEthAccount);
router.post('/giveTokensExistingUsers', walletController.giveTokensExistingUsers);
router.post('/saveCollectionDataInJSON', walletController.saveCollectionDataInJSON);

// POSTS
router.post('/getUserTokenBalance', authenticateJWT, walletController.getUserTokenBalance);
router.post('/transfer', authenticateJWT, walletController.transfer);
router.post('/createStreaming', authenticateJWT, walletController.createStreaming);
router.post('/giveTip', authenticateJWT, walletController.giveTip);
router.post('/removeUserRegisteredEthAccounts', authenticateJWT, walletController.removeUserRegisteredEthAccounts);
router.post('/toggleUserRegisteredEthAccounts', authenticateJWT, walletController.toggleUserRegisteredEthAccounts);
router.post('/registerPriviWallet', authenticateJWT, walletController.registerPriviWallet);
router.post('/registerWaxWallet', authenticateJWT, walletController.registerWaxWallet);

// GETS
// crypto rates
router.get('/getCryptosRateAsList', walletController.getCryptosRateAsList);
router.get('/getCryptosRateAsMap', walletController.getCryptosRateAsMap);
router.get('/getTokensRateChange', walletController.getTokensRateChange); // tokens changing rate respect last day

router.get('/getEmailToUidMap', authenticateJWT, walletController.getEmailToUidMap);
router.get('/getEmailToAddressMap', authenticateJWT, walletController.getEmailToAddressMap);
router.get('/getUidToAddressMap', authenticateJWT, walletController.getUidToAddressMap);

// user balance and txns
router.get('/getBalancesOfTokenHolders', walletController.getBalancesOfTokenHolders);
router.get('/getUserOwnedTokens', walletController.getUserOwnedTokens);
router.get('/getTokenBalances_v2/:address', authenticateJWT, walletController.getTokenBalances_v2);
router.get('/getAllTokenBalances/:address', authenticateJWT, walletController.getAllTokenBalances); // all token balances of the user with extra data (Type, ...)
router.get('/getAllTokensWithBuyingPrice', authenticateJWT, walletController.getAllTokensWithBuyingPrice); // for wallet buy tokens modal
router.get('/getTransactions', authenticateJWT, walletController.getTransactions);
router.get('/getUserTokenTypeBalanceHistory', authenticateJWT, walletController.getUserTokenTypeBalanceHistory);
router.get('/getUserTokenListByType', authenticateJWT, walletController.getUserTokenListByType);
router.get('/getUserRegisteredEthAccounts', authenticateJWT, walletController.getUserRegisteredEthAccounts);
router.get('/getRegisteredTokensByType', authenticateJWT, walletController.getRegisteredTokensByType); // get all registered tokens {$tokenType:[token1, token2...]}

//token images
router.get('/getTokenPhoto/:tokenSymbol', walletController.getTokenPhotoById);
router.post('/changeTokenPhoto', authenticateJWT, upload.single('image'), walletController.changeTokenPhoto);

module.exports = router;
