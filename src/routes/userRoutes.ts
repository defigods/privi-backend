import express from 'express';
const router = express.Router();

const userController = require('../controllers/userController');

router.get('/signIn', userController.signIn);
router.post('/addToWaitlist', userController.addToWaitlist);
router.post('/register', userController.register);

module.exports = router;
