import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const insuranceController = require('../controllers/insuranceController');

// FT
router.post('/FT/initiateInsurancePool', authenticateJWT, insuranceController.initiateInsurancePool);
router.post('/FT/investInsurancePool', authenticateJWT, insuranceController.investInsurancePool);
router.post('/FT/subscribeInsurancePool', authenticateJWT, insuranceController.subscribeInsurancePool);
router.post('/FT/unsubscribeInsurancePool', authenticateJWT, insuranceController.unsubscribeInsurancePool);

router.get('/FT/getAllInsurancePools', authenticateJWT, insuranceController.unsubscribeInsurancePool);


// NFT


module.exports = router;
