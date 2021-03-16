import { Router } from 'express';
import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";
import multer from "multer";

const mediaController = require('../controllers/mediaController');

const router: Router = Router();

let storage1 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId + '.png');
  },
});
let upload1 = multer({
  storage: storage1,
});

let storage2 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media/')
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId + '.mp3')
  }
});

let upload2 = multer({
  storage: storage2
});

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media/')
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId + '.mp4')
  }
});

let upload3 = multer({
  storage: storage3
});

let storage4 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media/blog-' + req.params.mediaId)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4')
  }
});

let upload4 = multer({
  storage: storage3
});

router.get('/', mediaController.getEthMedia);

router.get('/:id', mediaController.getEthMediaItem);

router.get('/getDigitalArt/:mediaId', mediaController.getMediaPhoto);
router.get('/getAudio/:mediaId', mediaController.getMediaAudio);
router.get('/getVideo/:mediaId', mediaController.getMediaVideo);
router.get('/getBlog/:mediaPod/:mediaId/:pagination', mediaController.getMediaBlog);

router.post('/uploadDigitalArt/:mediaPod/:mediaId', authenticateJWT, upload1.single('image'), mediaController.changeMediaPhoto);
router.post('/uploadAudio/:mediaPod/:mediaId', authenticateJWT, upload2.single('audio'), mediaController.changeMediaAudio);
router.post('/uploadVideo/:mediaPod/:mediaId', authenticateJWT, upload3.single('video'), mediaController.changeMediaVideo);
router.post('/uploadBlog/:mediaPod/:mediaId', authenticateJWT, mediaController.changeMediaBlog);
router.post('/uploadBlog/video/:mediaPod/:mediaId', authenticateJWT, upload4.single('video'), mediaController.changeMediaBlogVideo);

router.post('/editMedia/:mediaPod/:mediaId', authenticateJWT, mediaController.editMedia);
router.post('/removeCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.removeCollab);
router.post('/refuseCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.refuseCollab);
router.post('/acceptCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.acceptCollab);
router.post('/signTransactionAcceptCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.signTransactionAcceptCollab);

module.exports = router;
