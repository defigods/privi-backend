import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';

const mediaOnCommunityController = require('../controllers/mediaOnCommunityController');
const mediaOnCommunityChatController = require('../controllers/mediaOnCommunityChatController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaOnCommunity/' + req.params.room)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png')
  }
});

let upload = multer({
  storage: storage
});

let storage2 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaOnCommunity/' + req.params.room)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp3')
  }
});

let upload2 = multer({
  storage: storage2
});

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaOnCommunity/' + req.params.room)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4')
  }
});

let upload3 = multer({
  storage: storage3
});


router.get('/get/:id', authenticateJWT, mediaOnCommunityController.getMediaOnCommunity);
router.get('/accept/:id/:userId', authenticateJWT, mediaOnCommunityController.acceptMediaOnCommunity);
router.get('/decline/:id/:userId', authenticateJWT, mediaOnCommunityController.declineMediaOnCommunity);

router.get('/getByCommunity/:id', authenticateJWT, mediaOnCommunityController.getMediaWithCommunityId);
router.post('/getFromMediaArray', authenticateJWT, mediaOnCommunityController.getMediaOnCommunityFromMediaArray);
router.post('/create/:userId', authenticateJWT, mediaOnCommunityController.createMediaOnCommunity);
router.post('/newOffer/:id/:userId', authenticateJWT, mediaOnCommunityController.newOfferMediaOnCommunity);
router.post('/stopSelling/:id/:userId', authenticateJWT, mediaOnCommunityController.stopSellingMediaOnCommunity);


router.post('/chat/getChat', authenticateJWT, mediaOnCommunityChatController.getChat);
router.post('/chat/createChat', authenticateJWT, mediaOnCommunityChatController.createChat);
router.post('/chat/addUserToChat', authenticateJWT, mediaOnCommunityChatController.addUserToRoom);
router.post('/chat/removeUserToChat', authenticateJWT, mediaOnCommunityChatController.removeUserToRoom);
router.post('/chat/getMessages', authenticateJWT, mediaOnCommunityChatController.getMessages);
router.post('/chat/lastView', authenticateJWT, mediaOnCommunityChatController.lastView);

router.post('/addMessagePhoto/:room/:from/:to', authenticateJWT, upload.single('image'), mediaOnCommunityChatController.uploadPhotoMessage);
router.post('/addMessageAudio/:room/:from/:to', authenticateJWT, upload2.single('audio'), mediaOnCommunityChatController.uploadAudioMessage);
router.post('/addMessageVideo/:room/:from/:to', authenticateJWT, upload3.single('video'), mediaOnCommunityChatController.uploadVideoMessage);
router.get('/getMessagePhoto/:room/:from/:messageId', mediaOnCommunityChatController.getPhotoMessage);
router.get('/getMessageAudio/:room/:from/:messageId', mediaOnCommunityChatController.getAudioMessage);
router.get('/getMessageVideo/:room/:from/:messageId', mediaOnCommunityChatController.getVideoMessage);

module.exports = router;
