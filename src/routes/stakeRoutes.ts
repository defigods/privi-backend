import express from "express";
const router = express.Router();

import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
const stakeController = require("../controllers/stakeController");

router.post("/stakeToken", authenticateJWT, stakeController.stakeToken);
router.post("/unstakeToken", authenticateJWT, stakeController.unstakeToken);
router.post(
  "/verifyProfileStaking",
  authenticateJWT,
  stakeController.verifyProfileStaking
);
router.post(
  "/verifyPodStaking",
  authenticateJWT,
  stakeController.verifyPodStaking
);

router.get("/getUserStakedInfo", authenticateJWT, stakeController.getUserStakedInfo);

router.get(
  "/getTotalMembers/:token",
  authenticateJWT,
  stakeController.getTotalMembers
);
router.get(
  "/getReturnHistory/:token",
  authenticateJWT,
  stakeController.getReturnHistory
);
router.get(
  "/getStakedHistory/:token",
  authenticateJWT,
  stakeController.getStakedHistory
);

module.exports = router;
