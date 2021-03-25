
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const collabController = require('../controllers/collabController');

router.post('/createCollab', authenticateJWT, collabController.createCollab);
router.post('/upvote', authenticateJWT, collabController.upvote);
router.post('/react', authenticateJWT, collabController.react);

router.get('/getCollabs', authenticateJWT, collabController.getCollabs);
router.get('/getTwitterUsers', collabController.getTwitterUsers);


module.exports = router;
