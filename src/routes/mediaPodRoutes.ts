import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const mediaPodController = require('../controllers/mediaPodController');


// POSTS
router.post('/initiatePod', authenticateJWT, mediaPodController.initiatePod);
router.post('/registerMedia', authenticateJWT, mediaPodController.registerMedia);
router.post('/uploadMedia', authenticateJWT, mediaPodController.uploadMedia);
router.post('/buyMediaToken', authenticateJWT, mediaPodController.buyMediaToken);
router.post('/investPod', authenticateJWT, mediaPodController.investPod);

// GETS
router.post('/getMediaPod/:mediaPodId', authenticateJWT, mediaPodController.getMediaPod);


module.exports = router;