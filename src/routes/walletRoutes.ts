import express from 'express';
const router = express.Router();

const walletController = require('../controllers/walletController');

router.post('/getUserTokenBalance', authenticateJWT,walletController.getUserTokenBalance);
router.post('/transfer', authenticateJWT, walletController.transfer);
router.post('/withdraw', authenticateJWT, walletController.withdraw);
router.post('/deposit', authenticateJWT, walletController.deposit);

router.post('/getTokensRate', walletController.getTokensRate);
router.get('/getTokensRate', walletController.getTokensRate);
router.get('/getTotalBalance', walletController.getTotalBalance);
router.get('/getTotalBalancePC', walletController.getTotalBalancePC);
router.get('/getTokenBalances', walletController.getTokenBalances);
router.get('/getTransfers', walletController.getTransfers);
router.get('/getTransactions', walletController.getTransactions);
router.get('/getTotalIncome', walletController.getTotalIncome);
router.get('/getTotalExpense', walletController.getTotalExpense);

module.exports = router;
