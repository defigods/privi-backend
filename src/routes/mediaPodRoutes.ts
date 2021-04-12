import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const mediaPodController = require('../controllers/mediaPodController');
const userController = require('../controllers/userController');

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
router.post('/buyPodTokens', authenticateJWT, mediaPodController.buyPodTokens);
router.post('/sellPodTokens', authenticateJWT, mediaPodController.sellPodTokens);

router.post('/changeMediaPodPhoto', authenticateJWT, upload.single('image'), mediaPodController.changeMediaPodPhoto);

// GETS
router.get('/getMyMediaPods/:userId', authenticateJWT, mediaPodController.getMyMediaPods);
router.get('/getTrendingMediaPods', authenticateJWT, mediaPodController.getTrendingMediaPods);
router.get('/getOtherMediaPods/:userId', authenticateJWT, mediaPodController.getOtherMediaPods);
router.get('/getMediaPods/:pagination/:lastId', authenticateJWT, mediaPodController.getMediaPods);
router.get('/getMediaPod/:mediaPodId', authenticateJWT, mediaPodController.getMediaPod);
router.get('/getPhoto/:podId', mediaPodController.getPhotoById);
router.get('/getBuyingPodFundingTokenAmount', authenticateJWT, mediaPodController.getBuyingPodFundingTokenAmount);
router.get('/getSellingPodFundingTokenAmount', authenticateJWT, mediaPodController.getSellingPodFundingTokenAmount);
router.get('/getPriceHistory', authenticateJWT, mediaPodController.getPriceHistory);
router.get('/getSupplyHistory', authenticateJWT, mediaPodController.getSupplyHistory);
router.get('/getMediaPodTransactions', authenticateJWT, mediaPodController.getMediaPodTransactions);

//POD SLUG
router.get('/checkSlugExists/:urlSlug/:id/:type', userController.checkSlugExists);
router.get('/getIdFromSlug/:urlSlug/:type', userController.getIdFromSlug);
router.get('/getSlugFromId/:urlId/:type', userController.getSlugFromId);

module.exports = router;
