import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const forumController = require('../controllers/forumController');

/*
ForumCategory
id
name
description

1 Improvement Proposals
2 Governance Discussions
3 Site Feedback
4 Uncategorized



ForumPost
id
categoryId
subject
content
createdBy
createdAt
updatedAt
lastComment
countComments

ForumComment
id
forumPostId
content
createdBy
createdAt
updatedAt


apis

forum_home
post view
post create
comment create
category list

*/


router.get('/category', forumController.categoryList); // /forum/category

router.post('/comment/:postId', authenticateJWT, forumController.commentCreate);

router.post('/', authenticateJWT, forumController.postCreate);
router.get('/', forumController.postList);
router.get('/:postId', forumController.postView);

module.exports = router;
