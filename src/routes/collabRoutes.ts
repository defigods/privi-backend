
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const collabController = require('../controllers/collabController');

router.post('/createCollab', authenticateJWT, collabController.createCollab);
router.post('/upvote', authenticateJWT, collabController.upvote);

router.get('/getCollabs', authenticateJWT, collabController.getCollabs);


module.exports = router;
