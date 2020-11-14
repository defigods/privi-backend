import express from 'express';
import multer from 'multer';
import path from 'path';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
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

router.get('/getBasicInfo/:userId', authenticateJWT, userController.getBasicInfo);

// MY WALL - GETS
router.get('/wall/getFollowPodsInfo/:userId', authenticateJWT, userController.getFollowPodsInfo);
router.get('/wall/getFollowUserInfo/:userId', authenticateJWT, userController.getFollowingUserInfo);
router.get('/wall/getFollowMyInfo/:userId', authenticateJWT, userController.getOwnInfo);

// CONNECTIONS - GETS
router.get('/connections/getFollowers/:userId', authenticateJWT, userController.getFollowers);
router.get('/connections/getFollowings/:userId', authenticateJWT, userController.getFollowing);

// INVESTMENTS - GETS
router.get('/investments/getMyPods/:userId', authenticateJWT, userController.getMyPods);
router.get('/investments/getPodsInvestment/:userId', authenticateJWT, userController.getPodsInvestments);
router.get('/investments/getPodsFollowed/:userId', authenticateJWT, userController.getPodsFollowed);
router.get('/investments/getReceivables/:userId', authenticateJWT, userController.getReceivables);
router.get('/investments/getLiabilities/:userId', authenticateJWT, userController.getLiabilities);
router.get('/investments/getSocialTokens/:userId', authenticateJWT, userController.getSocialTokens);

// POST
/*router.post('/addToWaitlist', authenticateJWT, userController.addToWaitlist);
*/

// CONNECTIONS - POST
router.post('/connections/followUser', authenticateJWT, userController.followUser);
router.post('/connections/unFollowUser', authenticateJWT, userController.unFollowUser);

router.post('/editUser', authenticateJWT, userController.editUser);
router.post('/changeProfilePhoto', authenticateJWT, upload.single('image'), userController.changeUserProfilePhoto);
router.get('/getPhoto/:userId', userController.getPhotoById);

router.post('/addToWaitlist', authenticateJWT, userControllerJS.addToWaitlist);
router.post('/register', authenticateJWT, userControllerJS.register);

router.get('/getPrivacy', authenticateJWT, userControllerJS.getPrivacy);
router.post('/setPrivacy', authenticateJWT, userControllerJS.setPrivacy);

router.post('/getUserList', authenticateJWT, userController.getUserList);


//router.post('/getBasicInfo', authenticateJWT, userController.getBasicInfo);

module.exports = router;
