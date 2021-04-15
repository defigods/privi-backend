import express from 'express';

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';

const router = express.Router();

const connectController = require('../controllers/connectWaxController');

router.post('/send', /* authenticateJWT, */connectController.handleAction);

module.exports = router;
