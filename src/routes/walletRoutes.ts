import express from 'express';
const router = express.Router();

const walletController = require('../controllers/walletController');

router.post('/send', walletController.send);
router.post('/withdraw', walletController.withdraw);
router.post('/swap', walletController.swap);

router.get('/getTokensRate', walletController.getTokensRate);
router.get('/getTotalBalance', walletController.getTotalBalance);
router.get('/getTotalBalancePC', walletController.getTotalBalancePC);
router.get('/getTokenBalances', walletController.getTokenBalances);
router.get('/getTransfers', walletController.getTransfers);
router.get('/getTransactions', walletController.getTransactions);
router.get('/getTotalIncome', walletController.getTotalIncome);
router.get('/getTotalExpense', walletController.getTotalExpense);

module.exports = router;
