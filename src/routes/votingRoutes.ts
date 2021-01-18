import express from 'express';
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const votingController = require('../controllers/votingController');

router.post('/create', authenticateJWT, votingController.createVoting);
router.post('/vote', authenticateJWT, votingController.makeVote);
router.get('/get', authenticateJWT, votingController.getVotationInfo);

module.exports = router;