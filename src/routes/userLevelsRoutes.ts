import express from "express";
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const userLevelsController = require('../controllers/userLevelsController');

router.get('/getInfo', authenticateJWT, userLevelsController.getLevelsInfo);
router.post('/sumPoints', authenticateJWT, userLevelsController.sumPoints);
router.post('/checkLevel', authenticateJWT, userLevelsController.checkLevel);
router.post('/pointsWonToday', authenticateJWT, userLevelsController.pointsWonToday);
router.get('/getUserRank', authenticateJWT, userLevelsController.getUserRank);
router.get('/getNumberOfUsersPerLevel', authenticateJWT, userLevelsController.getNumberOfUsersPerLevel);

module.exports = router;