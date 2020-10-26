import express from 'express';
const router = express.Router();

const priviCreditController = require('../controllers/priviCreditController');

router.post('/initiateCredit', priviCreditController.initiateCredit);
router.post('/modifyParameters', priviCreditController.modifyParameters);
router.post('/withdrawFunds ', priviCreditController.withdrawFunds);
router.post('/borrowFunds ', priviCreditController.borrowFunds);
router.post('/depositFunds ', priviCreditController.depositFunds);

module.exports = router;
