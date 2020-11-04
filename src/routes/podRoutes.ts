import express from 'express';
const router = express.Router();

const podController = require('../controllers/podController');

router.get('/getMyPods/:userId', podController.getMyPods);
router.get('/getTrendingPods/:userId', podController.getTrendingPods);
router.get('/getOtherPods/:userId', podController.getOtherPods);

router.post('/initiatePod', podController.initiatePOD);
router.post('/deletePod', podController.deletePOD);
router.post('/investPod', podController.investPOD);
router.post('/swapPod', podController.swapPod);

router.post('/followPod', podController.followPod);
router.post('/unFollowPod', podController.unFollowPod);

module.exports = router;
