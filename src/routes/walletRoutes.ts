import express from 'express';
const router = express.Router();

const walletController = require('../controllers/walletController');

router.post('/send', walletController.send);
router.post('/withdraw', walletController.withdraw);
router.post('/swap', walletController.swap);

router.post('/getTokensRate', walletController.getTokensRate);
router.post('/getTotalBalance', walletController.getTotalBalance);
router.post('/getTotalBalancePC', walletController.getTotalBalancePC);
router.post('/getTokenBalances', walletController.getTokenBalances);
router.post('/getTransfers', walletController.getTransfers);
router.post('/getTransactions', walletController.getTransactions);
router.post('/getTotalIncome', walletController.getTotalIncome);
router.post('/getTotalExpense', walletController.getTotalExpense);

module.exports = router;
