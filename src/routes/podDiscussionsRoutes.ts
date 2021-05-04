import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';

const podDiscussionController = require('../controllers/podDiscussionsController');

let express = require('express');
let router = express.Router();

router.post('/newChat', authenticateJWT, podDiscussionController.createChat);
router.get('/getDiscussions/:podId', authenticateJWT, podDiscussionController.getDiscussions);
router.get('/getMessages/:podId/:topicId', authenticateJWT, podDiscussionController.getMessages);

module.exports = router;