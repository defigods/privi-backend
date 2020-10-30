import express from 'express';
const router = express.Router();

const profileController = require('../controllers/profileController');

router.post('/getBasicInfo', profileController.getBasicInfo);
router.post('/changeProfilePhoto', profileController.changeProfilePhoto);
router.post('/getFollowPodsInfo', profileController.getFollowPodsInfo);
router.post('/getFollowingUserInfo', profileController.getFollowingUserInfo);
router.post('/getOwnInfo', profileController.getOwnInfo);


module.exports = router;