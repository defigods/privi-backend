import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const streamingController = require('../controllers/streamingController');

// called from postman
router.post('/initiateMediaLiveStreaming', authenticateJWT, streamingController.initiateMediaLiveStreaming);
router.post('/exitMediaLiveStreaming', authenticateJWT, streamingController.exitMediaLiveStreaming);
router.post('/initiateMediaStreaming', authenticateJWT, streamingController.enterMediaStreaming);
router.post('/exitMediaStreaming', authenticateJWT, streamingController.exitMediaStreaming);

router.post('/initiateStreaming', authenticateJWT, streamingController.initiateStreaming);
router.post('/createStreaming', authenticateJWT, streamingController.createStreaming);
router.post('/editStreaming', authenticateJWT, streamingController.editStreaming);
router.post('/getStreaming', authenticateJWT, streamingController.getStreaming);
router.post('/scheduleStreaming', authenticateJWT, streamingController.scheduleStreaming);
router.post('/endStreaming', authenticateJWT, streamingController.endStreaming);
router.post('/addComment', authenticateJWT, streamingController.addComment)
router.get('/listStreaming', authenticateJWT, streamingController.listStreaming);
router.get('/getRecording', authenticateJWT, streamingController.getRecording);

router.get('/generateProtectKey', authenticateJWT, streamingController.generateProtectKey);
router.get('/validateProtectKey', authenticateJWT, streamingController.validateProtectKey);
router.get('/validateMeetingToken', authenticateJWT, streamingController.validateMeetingToken);
router.get('/generateMeetingToken', authenticateJWT, streamingController.generateMeetingToken);
router.get('/getMeetingToken', authenticateJWT, streamingController.getMeetingToken);

//  meeting tokens (control)

module.exports = router;
