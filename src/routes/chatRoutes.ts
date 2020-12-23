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

module.exports = router;