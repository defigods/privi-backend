import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const streamingController = require('../controllers/streamingController');

// called from postman
router.post('/initiateMediaLiveStreaming', authenticateJWT, streamingController.initiateMediaLiveStreaming);
router.post('/enterMediaLiveStreaming', authenticateJWT, streamingController.enterMediaLiveStreaming);
router.post('/enterMediaStreaming', authenticateJWT, streamingController.enterMediaStreaming);
router.post('/exitMediaLiveStreaming', authenticateJWT, streamingController.exitMediaLiveStreaming);
router.post('/initiateMediaStreaming', authenticateJWT, streamingController.enterMediaStreaming);
router.post('/exitMediaStreaming', authenticateJWT, streamingController.exitMediaStreaming);

router.post('/joinStreaming', authenticateJWT, streamingController.joinStreaming);
router.post('/initiateStreaming', authenticateJWT, streamingController.initiateStreaming);
router.post('/createStreaming', authenticateJWT, streamingController.createStreaming);
router.post('/getStreaming', authenticateJWT, streamingController.getStreaming);
router.post('/endStreaming', authenticateJWT, streamingController.endStreaming);
router.post('/addComment', authenticateJWT, streamingController.addComment)
router.get('/listStreaming', authenticateJWT, streamingController.listStreaming);
router.get('/getRecording', authenticateJWT, streamingController.getRecording);

//  meeting tokens (control)

module.exports = router;
