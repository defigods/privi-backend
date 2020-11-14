import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviCreditController = require('../controllers/priviCreditController');

router.post('/initiateCredit', authenticateJWT, priviCreditController.initiateCredit);
router.post('/modifyParameters', authenticateJWT, priviCreditController.modifyParameters);
router.post('/withdrawFunds', authenticateJWT, priviCreditController.withdrawFunds);
router.post('/borrowFunds', authenticateJWT, priviCreditController.borrowFunds);
router.post('/depositFunds', authenticateJWT, priviCreditController.depositFunds);
router.post('/getPriviCredits', authenticateJWT, priviCreditController.getPriviCredits);

module.exports = router;
