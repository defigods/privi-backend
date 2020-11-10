import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const stakeController = require('../controllers/stakeContoller');

router.post('/stakeToken', authenticateJWT, stakeController.stakeToken);
router.post('/unstakeToken', authenticateJWT, stakeController.unstakeToken);
router.post('/getStakeReward', authenticateJWT, stakeController.getStakeReward);

module.exports = router;
