
import express from 'express';
const router = express.Router();
const connectController = require('../controllers/connectController');

router.get('/getERC20Balance', connectController.getERC20Balance);
router.post('/swapERC20', connectController.swapERC20);
router.post('/withdrawERC20', connectController.withdrawERC20);
//router.post('/transferEthWithdraw', connectController.transferEthWithdraw);
//router.post('/balanceToken', connectController.balanceToken);
//router.post('/transferTokenWithdraw', connectController.transferTokenWithdraw);


module.exports = router;
