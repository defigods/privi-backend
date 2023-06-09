import express from "express";
import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const userLevelsController = require("../controllers/userLevelsController");

router.get(
  "/getInfo/:userId",
  authenticateJWT,
  userLevelsController.getLevelsInfo
);

module.exports = router;
