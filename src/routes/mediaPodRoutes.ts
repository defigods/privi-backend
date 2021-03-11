import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
const mediaPodController = require('../controllers/mediaPodController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaPod');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload = multer({
  storage: storage
});

// POSTS
router.post('/initiatePod', authenticateJWT, mediaPodController.initiatePod);
router.post('/registerMedia', authenticateJWT, mediaPodController.registerMedia);
router.post('/uploadMedia', authenticateJWT, mediaPodController.uploadMedia);
router.post('/buyMediaToken', authenticateJWT, mediaPodController.buyMediaToken);
router.post('/investPod', authenticateJWT, mediaPodController.investPod);

router.post('/changeMediaPodPhoto', authenticateJWT, upload.single('image'), mediaPodController.changeMediaPodPhoto);

// GETS
router.get('/getMyMediaPods/:userId', authenticateJWT, mediaPodController.getMyMediaPods);
router.get('/getTrendingMediaPods', authenticateJWT, mediaPodController.getTrendingMediaPods);
router.get('/getOtherMediaPods/:userId', authenticateJWT, mediaPodController.getOtherMediaPods);
router.get('/getAllMediaPodsInfo/:pagination/:lastId', authenticateJWT, mediaPodController.getAllMediaPodsInfo);
router.get('/getMediaPod/:mediaPodId', authenticateJWT, mediaPodController.getMediaPod);


module.exports = router;