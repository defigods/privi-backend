import { authenticateJWT } from "../middlewares/jwtAuthMiddleware";
import multer from "multer";
import fs from 'fs'

let express = require('express');
let router = express.Router();

let chatController = require('../controllers/chatController');

// CHAT 1-to-1
let storage11 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const path = 'uploads/chat/one-to-one/' + req.params.room;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.png')
  }
});

let upload11 = multer({
  storage: storage11
});

let storage12 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const path = 'uploads/chat/one-to-one/' + req.params.room;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp3')
  }
});

let upload12 = multer({
  storage: storage12
});

let storage13 = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const path = 'uploads/chat/one-to-one/' + req.params.room;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4')
  }
});

let upload13 = multer({
  storage: storage13
});

// DISCORD
let storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const path = 'uploads/chat/' + req.params.discordChatId + '/' + req.params.discordRoomId;
    fs.mkdirSync(path, { recursive: true })
    cb(null, path)
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
    const path = 'uploads/chat/' + req.params.discordChatId + '/' + req.params.discordRoomId;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
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
    const path = 'uploads/chat/' + req.params.discordChatId + '/' + req.params.discordRoomId;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req: any, file: any, cb: any) {
    console.log(file);
    cb(null, file.originalname + '.mp4')
  }
});

let upload3 = multer({
  storage: storage3
});


router.get('/:userId/numberMessages', chatController.getNumberOfMessages);
router.post('/getChats', authenticateJWT, chatController.getChats);
router.post('/getChatsPvP', authenticateJWT, chatController.getChatsPvP);
router.post('/getUsers', chatController.getUsers); // NOTE: It's used on public landing page hence authentication is removed
router.post('/getFollowings/:userId', authenticateJWT, chatController.getFollowings);
router.post('/getRoom', authenticateJWT, chatController.getChatRoom);
router.post('/getRoomById', authenticateJWT, chatController.getChatRoomById);
router.post('/getMessages', authenticateJWT, chatController.getMessages);
router.post('/messagesNotSeen', authenticateJWT, chatController.getMessagesNotSeen);
router.post('/lastView', authenticateJWT, chatController.lastView);
router.post('/newChat', authenticateJWT, chatController.createChat);

router.post('/addMessagePhoto/:room/:from/:to', authenticateJWT, upload11.single('image'), chatController.chatUploadPhotoMessage);
router.post('/addMessageAudio/:room/:from/:to', authenticateJWT, upload12.single('audio'), chatController.chatUploadAudioMessage);
router.post('/addMessageVideo/:room/:from/:to', authenticateJWT, upload13.single('video'), chatController.chatUploadVideoMessage);
router.get('/getMessagePhoto/:room/:from/:messageId', chatController.chatGetPhotoMessage);
router.get('/getMessageAudio/:room/:from/:messageId', chatController.chatGetAudioMessage);
router.get('/getMessageVideo/:room/:from/:messageId', chatController.chatGetVideoMessage);

router.post('/getAllArtists', chatController.getAllArtists);

router.post('/discord/getChat', authenticateJWT, chatController.discordGetChat);
router.post('/discord/getChatInfoMedia', authenticateJWT, chatController.discordGetChatInfoMedia);
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
router.post('/discord/addMessageAudio/:discordChatId/:discordRoomId/:fromUserId', authenticateJWT, upload2.single('audio'), chatController.discordUploadAudioMessage);
router.post('/discord/addMessageVideo/:discordChatId/:discordRoomId/:fromUserId', authenticateJWT, upload3.single('video'), chatController.discordUploadVideoMessage);
router.get('/discord/getMessagePhoto/:discordChatId/:discordRoomId/:discordMessageId', chatController.discordGetPhotoMessage);
router.get('/discord/getMessageAudio/:discordChatId/:discordRoomId/:discordMessageId', chatController.discordGetAudioMessage);
router.get('/discord/getMessageVideo/:discordChatId/:discordRoomId/:discordMessageId', chatController.discordGetVideoMessage);

router.post('/WIP/getChats', authenticateJWT, chatController.getChatsWIP);
router.post('/WIP/newChat', authenticateJWT, chatController.createChatWIP);

module.exports = router;
