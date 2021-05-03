import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';

const podDiscussionController = require('../controllers/podDiscussionsController');

let express = require('express');
let router = express.Router();

router.post('/newChat', authenticateJWT, podDiscussionController.createChat);

module.exports = router;