import express from 'express';
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const votingController = require('../controllers/votingController');

router.post('/create', authenticateJWT, votingController.createVoting);
router.post('/vote', authenticateJWT, votingController.makeVote);
router.get('/get', authenticateJWT, votingController.getVotationInfo);
router.get('/getUserVotation', authenticateJWT, votingController.getUserVotation);
router.get('/getVotationState', authenticateJWT, votingController.getVotationState);

module.exports = router;