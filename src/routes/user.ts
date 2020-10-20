import express from 'express';
const router = express.Router();
const user = require('../controllers/user');

router.get('/signIn', user.signIn);

module.exports = router;
