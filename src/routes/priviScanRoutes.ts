import express from 'express';
const router = express.Router();

const priviScanController = require('../controllers/priviScanController');

router.get('/getTransactions', priviScanController.getTransactions);

module.exports = router;
