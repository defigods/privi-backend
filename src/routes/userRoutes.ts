import express from 'express';
const router = express.Router();

const userController = require('../controllers/userController');

router.get('/signIn', userController.signIn);

module.exports = router;
