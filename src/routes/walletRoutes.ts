import express from 'express';
const router = express.Router();

const walletController = require('../controllers/walletController');

router.post('/send', walletController.send);
router.post('/withdraw', walletController.withdraw);
router.post('/swap', walletController.swap);

module.exports = router;