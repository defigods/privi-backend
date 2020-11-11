import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const lendingController = require('../controllers/lendingController');

router.post('/getUserLoans', authenticateJWT, lendingController.getUserLoans);
router.post('/borrowFunds', authenticateJWT, lendingController.borrowFunds);
router.post('/depositCollateral', authenticateJWT, lendingController.depositCollateral);
router.post('/withdrawCollateral', authenticateJWT, lendingController.withdrawCollateral);
router.post('/repayFunds', authenticateJWT, lendingController.repayFunds);
router.post('/getTokenReserves', authenticateJWT, lendingController.getTokenReserves);
router.post('/getCCRlevels', authenticateJWT, lendingController.getCCRlevels);

module.exports = router;
