import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from 'multer';

import * as mediaController from '../controllers/mediaController';
import * as playlistController from '../controllers/playlistController';

const router: Router = Router();

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/mediaMainPhoto');
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, req.params.mediaId.replace(/\s/g, '') + '.png');
  },
});
let upload = multer({
  storage: storage,
});

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
// router.get('/getEthMedia/:id', mediaController.getEthMediaItem);

router.get('/getUserMedias', authenticateJWT, mediaController.getUserMedias);
router.get('/getUserMediaStreaming', authenticateJWT, mediaController.getUserMediaStreaming);
router.get('/getMedia/:mediaId/:tag', mediaController.getMedia);
router.get('/getAudio/:mediaId', mediaController.getMediaAudio);
router.get('/getVideo/:mediaId', mediaController.getMediaVideo);
router.post('/mediaViewed/:mediaId', mediaController.registerMediaView);
router.get('/getDigitalArt/:mediaId', mediaController.getMediaPhoto);
router.get('/getBlog/:mediaPod/:mediaId/:pagination', mediaController.getMediaBlog);
router.get('/getMediaMainPhoto/:mediaId', mediaController.getMediaMainPhoto);
// router.get('/getEthMedia/:pagination/:lastId', mediaController.getEthMedia);

router.get('/getPlaylists', playlistController.getPlaylists);
router.get('/getMyPlaylists/:userId', authenticateJWT, playlistController.getMyPlaylists);
router.get('/getPlaylist/:playListId', playlistController.getPlaylist);
router.post('/likePlaylist/:playlistId', authenticateJWT, playlistController.likePlaylist);
router.post('/removeLikePlaylist/:playlistId', authenticateJWT, playlistController.removeLikePlaylist);



router.get(
  '/marketingMediaCommunity/getMediaChats/:mediaId/:userId',
  authenticateJWT,
  mediaController.getChatsMediaMarketing
);
router.get(
  '/marketingMediaCommunity/createMediaChats/:mediaId/:communityId/:userId',
  authenticateJWT,
  mediaController.createChatMediaMarketing
);
router.get(
  '/marketingMediaCommunity/getMessages/:mediaId/:communityId/:userId',
  authenticateJWT,
  mediaController.getMessagesMediaMarketing
);

router.get(
  '/marketingMediaCommunity/getCommunityChats/:communityId/:userId',
  authenticateJWT,
  mediaController.getChatsCommunityMarketing
);

router.get(
  '/marketingMediaCommunity/getMediaOffers/:podAddress/:mediaId',
  authenticateJWT,
  mediaController.getMediaMarketing
);
router.get(
  '/marketingMediaCommunity/getCommunityOffers/:communityId',
  authenticateJWT,
  mediaController.getCommunityMarketing
);

router.post(
  '/uploadDigitalArt/:mediaPod/:mediaId',
  authenticateJWT,
  upload1.single('image'),
  mediaController.changeMediaPhoto
);
router.post(
  '/uploadAudio/:mediaPod/:mediaId',
  authenticateJWT,
  upload2.single('audio'),
  mediaController.changeMediaAudio
);
router.post(
  '/uploadVideo/:mediaPod/:mediaId',
  authenticateJWT,
  upload3.single('video'),
  mediaController.changeMediaVideo
);
router.post('/uploadBlog/:mediaPod/:mediaId', authenticateJWT, mediaController.changeMediaBlog);
router.post(
  '/uploadBlog/video/:mediaPod/:mediaId',
  authenticateJWT,
  upload4.single('video'),
  mediaController.changeMediaBlogVideo
);

router.post('/editMedia/:mediaPod/:mediaId', authenticateJWT, mediaController.editMedia);
router.post(
  '/changeMediaImage/:mediaPod/:mediaId',
  authenticateJWT,
  upload5.single('image'),
  mediaController.changeMediaMainPhoto
);

router.post('/removeCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.removeCollab);
router.post('/refuseCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.refuseCollab);
router.post('/acceptCollab/:mediaPod/:mediaId', authenticateJWT, mediaController.acceptCollab);
router.post(
  '/signTransactionAcceptCollab/:mediaPod/:mediaId',
  authenticateJWT,
  mediaController.signTransactionAcceptCollab
);

router.post('/getMedias', mediaController.getMedias); // NOTE: It's used on public landing page hence authentication is removed
router.get('/getMarketplaceMedias', mediaController.getMarketplaceMedias);
router.post('/getNFTMedias',mediaController.getNFTMedias);
router.post('/fractionalizeMedia/:mediaId', authenticateJWT, mediaController.fractionalizeMedia); // duplicated?
router.post('/likeMedia/:mediaId', authenticateJWT, mediaController.likeMedia);
router.post('/removeLikeMedia/:mediaId', authenticateJWT, mediaController.removeLikeMedia);
router.post('/bookmarkMedia/:mediaId', authenticateJWT, mediaController.bookmarkMedia);
router.post('/removeBookmarkMedia/:mediaId', authenticateJWT, mediaController.removeBookmarkMedia);
router.post('/rateMedia', authenticateJWT, mediaController.rateMedia);

router.post('/shareMedia/:mediaId', authenticateJWT, mediaController.shareMedia);
router.post('/shareMediaToSocial/:mediaId', authenticateJWT, mediaController.shareMediaToSocial);

router.post('/createPlaylist', authenticateJWT, playlistController.createPlaylist);
router.post('/changePlaylistPhoto', authenticateJWT, upload6.single('image'), playlistController.changePlaylistPhoto);
router.post('/sharePlayList/:playListId', authenticateJWT, playlistController.sharePlayList);
router.post('/addToMyPlaylists', authenticateJWT, playlistController.addToMyPlaylists);
router.post('/removeFromMyPlaylists', authenticateJWT, playlistController.removeFromMyPlaylists);

router.post('/marketingMediaCommunity/addOffer', authenticateJWT, mediaController.addOffer);
router.post('/marketingMediaCommunity/changeOffer', authenticateJWT, mediaController.changeOffer);
router.post(
  '/marketingMediaCommunity/signTransactionAcceptOffer',
  authenticateJWT,
  mediaController.signTransactionAcceptOffer
);

router.post('/marketingMediaCommunity/chats/lastView', authenticateJWT, mediaController.lastViewMediaMarketing);

router.post('/createMedia', authenticateJWT, mediaController.createMedia);
router.post('/buyMediaNFT', authenticateJWT, mediaController.buyMediaNFT);
router.post('/openNFT', authenticateJWT, mediaController.openNFT);
router.post('/closeNFT', authenticateJWT, mediaController.closeNFT);

router.post('/notifications/exportToEthereum', authenticateJWT, mediaController.notificationsExportToEthereum);

// QUICK MEDIA UPLOAD MEDIA
router.post(
  '/quick/uploadDigitalArt/:mediaId',
  authenticateJWT,
  upload1.single('image'),
  mediaController.changeQuickMediaDigitalArt
);
router.post(
  '/quick/uploadAudio/:mediaId',
  authenticateJWT,
  upload2.single('audio'),
  mediaController.changeQuickMediaAudio
);
router.post(
  '/quick/uploadVideo/:mediaId',
  authenticateJWT,
  upload3.single('video'),
  mediaController.changeQuickMediaVideo
);
router.post('/quick/uploadBlog/:mediaId', authenticateJWT, mediaController.changeQuickMediaBlog);
router.post(
  '/quick/uploadBlog/video/:mediaId',
  authenticateJWT,
  upload4.single('video'),
  mediaController.changeQuickMediaBlogVideo
);
router.post(
  '/quick/changeMainPhoto/:mediaId',
  authenticateJWT,
  upload.single('image'),
  mediaController.changeQuickMediaPhoto
);

// FRACTIONALISE Post
router.post('/fractionalise', authenticateJWT, mediaController.fractionalise);
router.post('/newBuyOrder', authenticateJWT, mediaController.newBuyOrder);
router.post('/newSellOrder', authenticateJWT, mediaController.newSellOrder);
router.post('/deleteBuyOrder', authenticateJWT, mediaController.deleteBuyOrder);
router.post('/deleteSellOrder', authenticateJWT, mediaController.deleteSellOrder);
router.post('/buyFraction', authenticateJWT, mediaController.buyFraction);
router.post('/sellFraction', authenticateJWT, mediaController.sellFraction);

// FRACTIONALISE Get
router.get('/getFractionalisedMediaOffers/:mediaId', authenticateJWT, mediaController.getFractionalisedMediaOffers);
router.get(
  '/getFractionalisedMediaTransactions/:mediaId',
  authenticateJWT,
  mediaController.getFractionalisedMediaTransactions
);
router.get(
  '/getFractionalisedMediaPriceHistory/:mediaId',
  authenticateJWT,
  mediaController.getFractionalisedMediaPriceHistory
);
router.get(
  '/getFractionalisedMediaSharedOwnershipHistory/:mediaId',
  authenticateJWT,
  mediaController.getFractionalisedMediaSharedOwnershipHistory
);

module.exports = router;
