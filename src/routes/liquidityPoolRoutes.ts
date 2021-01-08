import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const poolController = require('../controllers/liquidityPoolController');

// POST for Postman
router.post('/createLiquidityPool', poolController.createLiquidityPool);
router.post('/listLiquidityPool', poolController.listLiquidityPool);
router.post('/protectLiquidityPool', poolController.protectLiquidityPool);

// POSTS
router.post('/depositLiquidity', authenticateJWT, poolController.depositLiquidity);
router.post('/swapCryptoTokens', authenticateJWT, poolController.swapCryptoTokens);
router.post('/protectLiquidityPool', authenticateJWT, poolController.protectLiquidityPool);

// GETS
router.get('/getLiquidityPools', authenticateJWT, poolController.getLiquidityPools);
router.get('/getLiquidityPool/:poolToken', authenticateJWT, poolController.getLiquidityPool);
router.get('/getLiquidityHistory/:poolToken', authenticateJWT, poolController.getLiquidityHistory);
router.get('/getRewardHistory/:poolToken', authenticateJWT, poolController.getRewardHistory);

module.exports = router;
