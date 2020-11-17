
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const connectController = require('../controllers/connectController');

router.get('/getERC20Balance', authenticateJWT, connectController.getERC20Balance);
router.post('/swap', authenticateJWT, connectController.swap);
router.post('/withdraw', authenticateJWT, connectController.withdraw);

module.exports = router;
