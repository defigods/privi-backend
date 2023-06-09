
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const collabController = require('../controllers/collabController');

router.post('/createCollab', authenticateJWT, collabController.createCollab);
router.post('/upvote', authenticateJWT, collabController.upvote);
router.post('/react', authenticateJWT, collabController.react);
router.post('/like', authenticateJWT, collabController.like);

router.get('/getTrendingCollabs', authenticateJWT, collabController.getTrendingCollabs);
router.get('/getAllCollabs', authenticateJWT, collabController.getAllCollabs);
router.get('/getTwitterUsers', collabController.getTwitterUsers);


module.exports = router;
