import express from 'express';
const router = express.Router();

const userController = require('../controllers/userController');

router.get('/signIn', userController.signIn);
router.post('/addToWaitlist', userController.addToWaitlist);
router.post('/register', userController.register);
router.get('/getPrivacy', userController.getPrivacy);
router.post('/setPrivacy', userController.setPrivacy);

module.exports = router;
