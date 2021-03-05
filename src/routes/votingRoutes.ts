import express from 'express';
import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
import multer from "multer";

const router = express.Router();
const votingController = require('../controllers/votingController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/votation')
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png')
  }
});
let upload = multer({
  storage: storage
});

router.post('/create', authenticateJWT, votingController.createVoting);
router.post('/changeVotingPhoto', authenticateJWT, upload.single('image'), votingController.changeVotingPhoto);
router.get('/getPhoto/:votingId', votingController.getPhotoById);
router.get('/getDaoProposal/:proposalId', votingController.getDaoProposalById);


router.post('/vote', authenticateJWT, votingController.makeVote);
router.get('/get', authenticateJWT, votingController.getVotationInfo);
router.get('/getUserVotation', authenticateJWT, votingController.getUserVotation);
router.get('/getVotationState', authenticateJWT, votingController.getVotationState);

// growth
router.post('/postVote', votingController.postVote);
router.get('/getPredictions', authenticateJWT, votingController.getPredictions);
router.post('/votePrediction', authenticateJWT, votingController.votePrediction);

module.exports = router;