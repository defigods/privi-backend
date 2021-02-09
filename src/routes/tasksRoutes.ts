import express from "express";
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";
const router = express.Router();

const tasksController = require("../controllers/tasksController");

router.get("/getTasks/:userId", authenticateJWT, tasksController.getTasks);

router.post("/updateTask", authenticateJWT, tasksController.updateTaskExternally)
module.exports = router;
