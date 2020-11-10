import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviScanController = require('../controllers/priviScanController');

router.get('/getTransactions', authenticateJWT, priviScanController.getTransactions);

module.exports = router;
