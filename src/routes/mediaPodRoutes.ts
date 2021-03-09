import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const meidaPodController = require('../controllers/mediaPodController');


// POSTS
router.post('/initiatePod', authenticateJWT, meidaPodController.initiatePod);
router.post('/registerMedia', authenticateJWT, meidaPodController.registerMedia);
router.post('/uploadMedia', authenticateJWT, meidaPodController.uploadMedia);
router.post('/buyMediaToken', authenticateJWT, meidaPodController.buyMediaToken);
router.post('/investPod', authenticateJWT, meidaPodController.investPod);

// GETS



module.exports = router;