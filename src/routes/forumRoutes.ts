import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const forumController = require('../controllers/forumController');

router.post('/', authenticateJWT, forumController.postCreate);
router.get('/:linkId/:postType', forumController.postListByLink);
router.get('/:postId', authenticateJWT, forumController.postView);

router.post('/comment/', authenticateJWT, forumController.commentCreate);

module.exports = router;
