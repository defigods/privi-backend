import express from "express";
const router = express.Router();

const tasksController = require("../controllers/tasksController");

router.get("/getTasks/:userId", tasksController.getTasks);

module.exports = router;
