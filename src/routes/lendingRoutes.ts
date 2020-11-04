import express from 'express';
const router = express.Router();

const lendingController = require('../controllers/lendingController');

router.post('/borrowFunds', lendingController.borrowFunds);
router.post('/depositCollateral', lendingController.depositCollateral);
router.post('/withdrawCollateral', lendingController.withdrawCollateral);
router.post('/repayFunds', lendingController.repayFunds);
router.post('/getTokenReserves', lendingController.getTokenReserves);

module.exports = router;