import express from 'express';
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

const router = express.Router();
const votingController = require('../controllers/votingController');

router.post('/voting/create', authenticateJWT, votingController.createVotation);
router.post('/voting/vote', authenticateJWT, votingController.makeVote);

module.exports = router;