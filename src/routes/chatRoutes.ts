import {authenticateJWT} from "../middlewares/jwtAuthMiddleware";

let express = require('express');
let router = express.Router();

let chatController = require('../controllers/chatController');

router.post('/getChats', authenticateJWT, chatController.getChats);
router.post('/getUsers', authenticateJWT, chatController.getUsers);
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


module.exports = router;