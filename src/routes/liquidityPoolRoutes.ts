import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const poolController = require('../controllers/liquidityPoolController');

router.post('/createLiquidityPool', poolController.createLiquidityPool);
router.post('/depositLiquidity', authenticateJWT, poolController.depositLiquidity);
router.post('/swapCrytoTokens', authenticateJWT, poolController.swapCrytoTokens);
router.post('/protectLiquidityPool', authenticateJWT, poolController.protectLiquidityPool);

router.get('/getLiquidityPools', authenticateJWT, poolController.getLiquidityPools);

module.exports = router;
