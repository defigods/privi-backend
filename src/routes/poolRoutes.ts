import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const poolController = require('../controllers/poolController');

router.post('/createLiquidityPool', authenticateJWT, poolController.createLiquidityPool);
router.post('/depositLiquidity', authenticateJWT, poolController.depositLiquidity);
router.post('/swapCrytoTokens', authenticateJWT, poolController.swapCrytoTokens);
router.post('/protectLiquidityPool', authenticateJWT, poolController.protectLiquidityPool);
router.post('/listLiquidityPool', authenticateJWT, poolController.listLiquidityPool);
router.post('/getLiquidityPoolInfo', authenticateJWT, poolController.getLiquidityPoolInfo);
router.post('/getLiquidityPoolState', authenticateJWT, poolController.getLiquidityPoolState);
router.post('/getLiquidityDeposits', authenticateJWT, poolController.getLiquidityDeposits);
router.post('/getLiquidityProviders', authenticateJWT, poolController.getLiquidityProviders);

module.exports = router;
