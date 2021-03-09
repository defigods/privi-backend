import express from "express";
const router = express.Router();

import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
const streamingController = require("../controllers/streamingController");

// called from postman
router.post("/initiateMediaLiveStreaming", authenticateJWT, streamingController.initiateMediaLiveStreaming)
router.post("/exitMediaLiveStreaming", authenticateJWT, streamingController.exitMediaLiveStreaming)
router.post("/createVideoStreaming", authenticateJWT, streamingController.createVideoStreaming)

router.post("/initiateStreaming", authenticateJWT, streamingController.initiateStreaming)
router.post("/endVideoStreaming", authenticateJWT, streamingController.endVideoStreaming)
router.post("/scheduleVideoStreaming", authenticateJWT, streamingController.scheduleVideoStreaming)
router.get("/listStreaming", authenticateJWT, streamingController.listStreaming)


module.exports = router;
