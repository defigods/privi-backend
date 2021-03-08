import express from "express";
const router = express.Router();

import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
const streamingController = require("../controllers/streamingController");

// called from postman
router.post("/initiateStreaming", authenticateJWT, streamingController.initiateStreaming)
router.post("/initiateMediaLiveStreaming", authenticateJWT, streamingController.initiateMediaLiveStreaming)
router.post("/createVideoStreaming", authenticateJWT, streamingController.createVideoStreaming)
router.post("/scheduleVideoStreaming", authenticateJWT, streamingController.scheduleVideoStreaming)
router.post("/endVideoStreaming", authenticateJWT, streamingController.endVideoStreaming)
router.get("/listStreaming", authenticateJWT, streamingController.listStreaming)


module.exports = router;
