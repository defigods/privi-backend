
import express from 'express';
const router = express.Router();
const connectController = require('../controllers/connectController');

router.get('/getERC20Balance', connectController.getERC20Balance);
//router.post('/transferEthWithdraw', connectController.transferEthWithdraw);
//router.post('/balanceToken', connectController.balanceToken);
//router.post('/transferTokenWithdraw', connectController.transferTokenWithdraw);
//router.post('/send', connectController.send);
//router.post('/swap', connectController.swap);

module.exports = router;
