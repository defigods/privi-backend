import express from 'express';
const router = express.Router();

import { authenticateJWT} from '../middlewares/jwtAuthMiddleware';
const streamingController = require('../controllers/streamingController');

// called from postman
router.post('/initiateMediaLiveStreaming', authenticateJWT, streamingController.initiateMediaLiveStreaming);
router.post('/exitMediaLiveStreaming', authenticateJWT, streamingController.exitMediaLiveStreaming);

router.post('/initiateStreaming', authenticateJWT, streamingController.initiateStreaming);
router.post('/createStreaming', authenticateJWT, streamingController.createStreaming);
router.post('/scheduleStreaming', authenticateJWT, streamingController.scheduleStreaming);
router.post('/endStreaming', authenticateJWT, streamingController.endStreaming);
router.get('/listStreaming', authenticateJWT, streamingController.listStreaming);
router.get('/getRecording', authenticateJWT, streamingController.getRecording);

router.get('/generateProtectKey',authenticateJWT,streamingController.generateProtectKey);
router.get('/validateProtectKey',authenticateJWT,streamingController.validateProtectKey);

module.exports = router;
