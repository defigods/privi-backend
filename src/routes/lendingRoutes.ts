import express from 'express';
const router = express.Router();

const lendingController = require('../controllers/lendingController');

router.post('/initiateCredit', lendingController.initiateCredit);

module.exports = router;