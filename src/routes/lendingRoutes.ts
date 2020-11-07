import express from 'express';
const router = express.Router();

const lendingController = require('../controllers/lendingController');

router.post('/getUserLoans', lendingController.getUserLoans);
router.post('/borrowFunds', lendingController.borrowFunds);
router.post('/depositCollateral', lendingController.depositCollateral);
router.post('/withdrawCollateral', lendingController.withdrawCollateral);
router.post('/repayFunds', lendingController.repayFunds);
router.post('/getTokenReserves', lendingController.getTokenReserves);
router.post('/getCCRlevels', lendingController.getCCRlevels);

module.exports = router;
