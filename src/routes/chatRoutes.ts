import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";
import multer from "multer";

let express = require('express');
let router = express.Router();

let chatController = require('../controllers/chatController');

let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/chat/' + req.params.discordChatId + '/' + req.params.discordRoomId)
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png')
  }
});

let upload = multer({
  storage: storage
});


router.post('/getChats', authenticateJWT, chatController.getChats);
router.post('/getUsers', authenticateJWT, chatController.getUsers);
router.post('/getFollowings/:userId', authenticateJWT, chatController.getFollowings);
router.post('/getRoom', authenticateJWT, chatController.getChatRoom);
router.post('/getRoomById', authenticateJWT, chatController.getChatRoomById);
router.post('/getMessages', authenticateJWT, chatController.getMessages);
router.post('/messagesNotSeen', authenticateJWT, chatController.getMessagesNotSeen);
router.post('/lastView', authenticateJWT, chatController.lastView);
router.post('/newChat', authenticateJWT, chatController.createChat);

router.post('/discord/getChat', authenticateJWT, chatController.discordGetChat);
router.post('/discord/createChat', authenticateJWT, chatController.discordCreateChat);
router.post('/discord/createRoom', authenticateJWT, chatController.discordCreateRoom);
router.post('/discord/addUserToRoom', authenticateJWT, chatController.discordAddUserToRoom);
router.post('/discord/getMessages', authenticateJWT, chatController.discordGetMessages);
router.post('/discord/getReplies', authenticateJWT, chatController.discordGetReplies);
router.post('/discord/lastView', authenticateJWT, chatController.discordLastView);
router.post('/discord/provideAccess', authenticateJWT, chatController.discordModifyAccess);
router.post('/discord/removeAccess', authenticateJWT, chatController.discordRemoveAccess);
router.post('/discord/getPossibleUsers', authenticateJWT, chatController.discordGetPossibleUsers);
router.post('/discord/likeMessage', authenticateJWT, chatController.discordLikeMessage);
router.post('/discord/dislikeMessage', authenticateJWT, chatController.discordDislikeMessage);
router.post('/discord/reply/likeMessage', authenticateJWT, chatController.discordReplyLikeMessage);
router.post('/discord/reply/dislikeMessage', authenticateJWT, chatController.discordReplyDislikeMessage);

router.post('/discord/addMessagePhoto/:discordChatId/:discordRoomId/:fromUserId', authenticateJWT, upload.single('image'), chatController.discordUploadPhotoMessage);
router.get('/discord/getMessagePhoto/:discordChatId/:discordRoomId/:discordMessageId', chatController.discordGetPhotoMessage);

module.exports = router;