
import express from 'express';
const router = express.Router();

const connectController = require('../controllers/connectController');

//router.post('/send', connectController.send);
router.post('/transferEthWithdraw', connectController.transferEthWithdraw);
//router.post('/swap', connectController.swap);
router.post('/transferTokenWithdraw', connectController.transferTokenWithdraw);
router.post('/balanceToken', connectController.balanceToken);

module.exports = router;
