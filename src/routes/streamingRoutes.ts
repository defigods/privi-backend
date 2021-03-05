import express from "express";
const router = express.Router();

import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
const streamingController = require("../controllers/streamingController");

// called from postman
router.post("/initiateStreaming", authenticateJWT, streamingController.initiateStreaming)
router.post("/createVideoStreaming", authenticateJWT, streamingController.createVideoStreaming)
router.post("/endVideoStreaming", authenticateJWT, streamingController.endVideoStreaming)


module.exports = router;
