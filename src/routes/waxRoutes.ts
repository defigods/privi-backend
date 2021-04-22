import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const waxController = require('../controllers/waxController');

router.post('/send', authenticateJWT, waxController.send);


module.exports = router;
