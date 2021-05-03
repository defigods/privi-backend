
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const auctionController = require('../controllers/auctionController');

router.post('/createAuction', authenticateJWT, auctionController.createAuction);
router.post('/placeBid', authenticateJWT, auctionController.placeBid);
router.post('/cancelAuction', authenticateJWT, auctionController.cancelAuction);
router.post('/withdrawAuction', authenticateJWT, auctionController.withdrawAuction);

router.get('/getAuctionTransactions/:mediaSymbol', auctionController.getAuctionTransactions);
router.get('/getBidHistory/:mediaSymbol', auctionController.getBidHistory);

module.exports = router;
