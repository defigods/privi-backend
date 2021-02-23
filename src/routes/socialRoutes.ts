import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';
const socialController = require('../controllers/socialController');

// Multer Settings for file upload
let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/socialTokens');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload = multer({
  storage: storage,
});

router.post('/createSocialToken', authenticateJWT, socialController.createSocialToken);
router.post(
  '/changeSocialTokenPhoto',
  authenticateJWT,
  upload.single('image'),
  socialController.changeSocialTokenPhoto
);
router.get('/getPhoto/:socialId', socialController.getPhotoById);
router.post('/editSocialToken', authenticateJWT, socialController.editSocialToken);

router.post('/sumTotalViews', authenticateJWT, socialController.sumTotalViews);
router.post('/like', authenticateJWT, socialController.like);
router.get('/getSocialTokens', authenticateJWT, socialController.getSocialTokens);
router.get('/getTokenInfo/:tokenSymbol', socialController.getTokenInfo);

module.exports = router;
