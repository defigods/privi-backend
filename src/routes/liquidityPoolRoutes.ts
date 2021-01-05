import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const poolController = require('../controllers/liquidityPoolController');

router.post('/createLiquidityPool', authenticateJWT, poolController.createLiquidityPool);
router.post('/depositLiquidity', authenticateJWT, poolController.depositLiquidity);
router.post('/swapCrytoTokens', authenticateJWT, poolController.swapCrytoTokens);
router.post('/protectLiquidityPool', authenticateJWT, poolController.protectLiquidityPool);


module.exports = router;
