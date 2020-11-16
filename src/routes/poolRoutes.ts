import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const poolController = require('../controllers/poolController');

router.post('/createLiquidityPool', authenticateJWT, poolController.createLiquidityPool);
router.post('/depositLiquidity', authenticateJWT, poolController.depositLiquidity);
router.post('/withdrawLiquidity', authenticateJWT, poolController.withdrawLiquidity);

module.exports = router;
