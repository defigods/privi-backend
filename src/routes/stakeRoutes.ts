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

router.get("/getStakedAmounts", stakeController.getStakedAmounts);
router.get(
  "/getStakingAmount/:userId",
  authenticateJWT,
  stakeController.getStakingAmount
);
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
