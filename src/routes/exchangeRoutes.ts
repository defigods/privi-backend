
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const exchangeController = require('../controllers/exchangeController');

router.post('/createExchange', authenticateJWT, exchangeController.createExchange);
router.post('/placeBuyingOffer', exchangeController.placeBuyingOffer);
router.post('/placeSellingOffer', authenticateJWT, exchangeController.placeSellingOffer);
router.post('/buyFromOffer', authenticateJWT, exchangeController.buyFromOffer);
router.post('/sellFromOffer', authenticateJWT, exchangeController.sellFromOffer);
router.post('/cancelBuyingOffer', authenticateJWT, exchangeController.cancelBuyingOffer);
router.post('/cancelSellingOffer', authenticateJWT, exchangeController.cancelSellingOffer);

router.get('/getPriceHistory/:exchangeId', exchangeController.getPriceHistory);
router.get('/getBuyingOffers/:exchangeId', exchangeController.getBuyingOffers);

module.exports = router;
