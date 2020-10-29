import express from 'express';
const router = express.Router();

const walletController = require('../controllers/walletController');

router.post('/send', walletController.send);
router.post('/withdraw', walletController.withdraw);
router.post('/swap', walletController.swap);

router.get('/getTokensRate', walletController.getTokensRate);
router.get('/getTotalBalance', walletController.getTotalBalance);
router.get('/getTokenBalances', walletController.getTokenBalances);
router.get('/getTransfers', walletController.getTransfers);
router.get('/getTotalWithdraw', walletController.getTotalWithdraw);
router.get('/getTotalSwap', walletController.getTotalSwap);

module.exports = router;
