import express from 'express';
const router = express.Router();

const poolController = require('../controllers/poolController');

router.post('/createLiquidityPool', poolController.createLiquidityPool);
router.post('/depositLiquidity', poolController.depositLiquidity);
router.post('/withdrawLiquidity', poolController.withdrawLiquidity);

module.exports = router;
