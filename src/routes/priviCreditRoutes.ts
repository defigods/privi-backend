import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviCreditController = require('../controllers/priviCreditController');

router.get('/getPriviCredits', authenticateJWT, priviCreditController.getPriviCredits);


router.post('/initiatePriviCredit', authenticateJWT, priviCreditController.initiatePriviCredit);
router.post('/depositFunds', authenticateJWT, priviCreditController.depositFunds);
router.post('/borrowFunds', authenticateJWT, priviCreditController.borrowFunds);
router.post('/getPriviCredits', authenticateJWT, priviCreditController.getPriviCredits);


module.exports = router;
