import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';

const mediaController = require('../controllers/mediaController');
const playlistController = require('../controllers/playlistController');

const router: Router = Router();

let storage1 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId.replace(/\s/g, '') + '.png');
  },
});
let upload1 = multer({
  storage: storage1,
});

let storage2 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId.replace(/\s/g, '') + '.mp3');
  },
});

let upload2 = multer({
  storage: storage2,
});

let storage3 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId.replace(/\s/g, '') + '.mp4');
  },
});

let upload3 = multer({
  storage: storage3,
});

let storage4 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/media/blog-' + req.params.mediaId);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4');
  },
});

let upload4 = multer({
  storage: storage3,
});

let storage5 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaMainPhoto');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId.replace(/\s/g, '') + '.png');
  },
});
let upload5 = multer({
  storage: storage5,
});

let storage6 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaPlaylists');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png');
  },
});
let upload6 = multer({
  storage: storage6,
});


router.get('/:id', mediaController.getEthMediaItem);

router.get('/getMedia/:mediaId', authenticateJWT, mediaController.getMedia);
router.get('/getAudio/:mediaId', mediaController.getMediaAudio);
router.get('/getVideo/:mediaId', mediaController.getMediaVideo);
router.get('/getDigitalArt/:mediaId', mediaController.getMediaPhoto);
router.get('/getBlog/:mediaPod/:mediaId/:pagination', mediaController.getMediaBlog);
router.get('/getMediaMainPhoto/:mediaId', mediaController.getMediaMainPhoto);
router.get('/:pagination/:lastId', mediaController.getEthMedia);

router.get('/getPlaylists', authenticateJWT, playlistController.getPlaylists);
router.get('/getMyPlaylist/:userId', authenticateJWT, playlistController.getMyPlaylists);
router.get('/getPlaylist/:playListId', authenticateJWT, playlistController.getPlaylist);

router.post('/uploadDigitalArt/:mediaPod/:mediaId', authenticateJWT, upload1.single('image'), mediaController.changeMediaPhoto);
router.post('/uploadAudio/:mediaPod/:mediaId', authenticateJWT, upload2.single('audio'), mediaController.changeMediaAudio);
router.post('/uploadVideo/:mediaPod/:mediaId', authenticateJWT, upload3.single('video'), mediaController.changeMediaVideo);
router.post('/uploadBlog/:mediaPod/:mediaId', authenticateJWT, mediaController.changeMediaBlog);
router.post('/uploadBlog/video/:mediaPod/:mediaId', authenticateJWT, upload4.single('video'), mediaController.changeMediaBlogVideo);

router.post('/editMedia/:mediaPod/:mediaId', authenticateJWT, mediaController.editMedia);
router.post('/changeMediaImage/:mediaPod/:mediaId', authenticateJWT, upload5.single('image'), mediaController.changeMediaMainPhoto);

router.post('/removeCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.removeCollab);
router.post('/refuseCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.refuseCollab);
router.post('/acceptCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.acceptCollab);
router.post('/signTransactionAcceptCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.signTransactionAcceptCollab);

router.post('/getMedias/:pagination/:lastId', authenticateJWT, mediaController.getMedias);
router.post('/likeMedia/:mediaId', authenticateJWT, mediaController.likeMedia);
router.post('/removeLikeMedia/:mediaId', authenticateJWT, mediaController.removeLikeMedia);

router.post('/shareMedia/:mediaId', authenticateJWT, mediaController.shareMedia);

router.post('/createPlaylist', authenticateJWT, playlistController.createPlaylist);
router.post('/changePlaylistPhoto', authenticateJWT, upload6.single('image'), playlistController.changePlaylistPhoto);
router.post('/sharePlayList/:playListId', authenticateJWT, playlistController.sharePlayList);
router.post('/addToMyPlaylists', authenticateJWT, playlistController.addToMyPlaylists);
router.post('/removeFromMyPlaylists', authenticateJWT, playlistController.removeFromMyPlaylists);

router.post('/marketingMediaCommunity/addOffer', authenticateJWT, mediaController.addOffer);
router.post('/marketingMediaCommunity/changeOffer', authenticateJWT, mediaController.changeOffer);
router.post('/marketingMediaCommunity/signTransactionAcceptOffer', authenticateJWT, mediaController.signTransactionAcceptOffer);


module.exports = router;