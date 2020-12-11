import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviCreditController = require('../controllers/priviCreditController');

router.get('/getPriviCredits', authenticateJWT, priviCreditController.getPriviCredits);
router.get('/getPriviCredit/:creditId', authenticateJWT, priviCreditController.getPriviCredit);
router.get('/getPriviTransactions/:creditId', authenticateJWT, priviCreditController.getPriviTransactions);


router.post('/initiatePriviCredit', authenticateJWT, priviCreditController.initiatePriviCredit);
router.post('/depositFunds', authenticateJWT, priviCreditController.depositFunds);
router.post('/borrowFunds', authenticateJWT, priviCreditController.borrowFunds);
router.post('/followCredit', authenticateJWT, priviCreditController.followCredit);
router.post('/unfollowCredit', authenticateJWT, priviCreditController.unfollowCredit);


module.exports = router;
