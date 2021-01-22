import express from "express";
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const socialTokenController = require('../controllers/socialTokenController');

router.post('/createSocialToken', authenticateJWT, socialTokenController.createSocialToken);
router.post('/sellSocialToken', authenticateJWT, socialTokenController.sellSocialToken);
router.post('/buySocialToken', authenticateJWT, socialTokenController.buySocialToken);

router.post('/getBuyTokenAmount', authenticateJWT, socialTokenController.getBuyTokenAmount);
router.post('/getSellTokenAmount', authenticateJWT, socialTokenController.getSellTokenAmount);

router.get('/getSocialPool/:poolId', authenticateJWT, socialTokenController.getSocialPool);

module.exports = router
