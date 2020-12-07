import express from 'express';
import multer from "multer";
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviDataController = require('../controllers/priviDataController');

router.get('/getInfo/:userId', authenticateJWT, priviDataController.getInfo);
router.get('/getCampaigns/:userId', authenticateJWT, priviDataController.getCampaigns);

router.post('/createCampaign', authenticateJWT, priviDataController.createCampaign);

module.exports = router;