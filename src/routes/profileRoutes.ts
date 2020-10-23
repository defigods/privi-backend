import express from 'express';
const router = express.Router();

const profileController = require('../controllers/profileController');

router.get('/getBasicInfo', profileController.getBasicInfo);
router.post('/changeProfilePhoto', profileController.changeProfilePhoto);
router.get('/getFollowPodsInfo', profileController.getFollowPodsInfo);
router.get('/getFollowingUserInfo', profileController.getFollowingUserInfo);
router.get('/getOwnInfo', profileController.getOwnInfo);


module.exports = router;