import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviCreditController = require('../controllers/priviCreditController');

router.post('/getPRIVICreditInfo', authenticateJWT, priviCreditController.getPRIVICreditInfo);
router.post('/getPRIVICreditState', authenticateJWT, priviCreditController.getPRIVICreditState);
router.post('/getUserLendings', authenticateJWT, priviCreditController.getUserLendings);
router.post('/getUserBorrowings', authenticateJWT, priviCreditController.getUserBorrowings);
router.post('/getCreditBorrowers', authenticateJWT, priviCreditController.getCreditBorrowers);
router.post('/getCreditLenders', authenticateJWT, priviCreditController.getCreditLenders);
router.post('/initiatePriviCredit', authenticateJWT, priviCreditController.initiatePriviCredit);
router.post('/depositFunds', authenticateJWT, priviCreditController.depositFunds);
router.post('/borrowFunds', authenticateJWT, priviCreditController.borrowFunds);
router.post('/getPriviCredits', authenticateJWT, priviCreditController.getPriviCredits);


module.exports = router;
