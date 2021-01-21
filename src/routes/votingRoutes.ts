import express from 'express';
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";
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


router.post('/vote', authenticateJWT, votingController.makeVote);
router.get('/get', authenticateJWT, votingController.getVotationInfo);

module.exports = router;