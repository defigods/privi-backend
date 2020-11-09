import express from 'express';
const router = express.Router();
const stakeController = require('../controllers/stakeContoller');

router.post('/stakeToken', stakeController.stakeToken);
router.post('/unstakeToken', stakeController.unstakeToken);
router.post('/getStakeReward', stakeController.getStakeReward);

module.exports = router;
