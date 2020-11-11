import express from 'express';
import multer from 'multer';
import path from 'path';
const router = express.Router();

const userController = require('../controllers/userController');
const userControllerJS = require('../controllers/userControllerJS');

// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/users')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});

// AUTHENTICATION
router.post('/forgot_password', userController.forgotPassword);
router.post('/signIn', userController.signIn);
router.post('/signUp', userController.signUp);
//router.get('/:userId', userController.signIn);

router.get('/getBasicInfo/:userId', userController.getBasicInfo);

// MY WALL - GETS
router.get('/wall/getFollowPodsInfo/:userId', userController.getFollowPodsInfo);
router.get('/wall/getFollowUserInfo/:userId', userController.getFollowingUserInfo);
router.get('/wall/getFollowMyInfo/:userId', userController.getOwnInfo);

// CONNECTIONS - GETS
router.get('/connections/getFollowers/:userId', userController.getFollowers);
router.get('/connections/getFollowings/:userId', userController.getFollowing);

// INVESTMENTS - GETS
router.get('/investments/getMyPods/:userId', userController.getMyPods);
router.get('/investments/getPodsInvestment/:userId', userController.getPodsInvestments);
router.get('/investments/getPodsFollowed/:userId', userController.getPodsFollowed);
router.get('/investments/getReceivables/:userId', userController.getReceivables);
router.get('/investments/getLiabilities/:userId', userController.getLiabilities);
router.get('/investments/getSocialTokens/:userId', userController.getSocialTokens);

// POST
/*router.post('/addToWaitlist', userController.addToWaitlist);
router.post('/register', userController.register);*/

// CONNECTIONS - POST
router.post('/connections/followUser', userController.followUser);
router.post('/connections/unFollowUser', userController.unFollowUser);

router.post('/editUser', userController.editUser);
router.post('/changeProfilePhoto', upload.single('image'), userController.changeUserProfilePhoto);
router.get('/getPhoto/:userId', userController.getPhotoById);

router.post('/addToWaitlist', userControllerJS.addToWaitlist);
router.post('/register', userControllerJS.register);

router.get('/getPrivacy', userControllerJS.getPrivacy);
router.post('/setPrivacy', userControllerJS.setPrivacy);


//router.post('/getBasicInfo', userController.getBasicInfo);

module.exports = router;
