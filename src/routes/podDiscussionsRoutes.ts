import { Router } from 'express';
import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
import fs from 'fs'

const podDiscussionController = require('../controllers/podDiscussionsController');

let express = require('express');
let router = express.Router();

let storage = (extension) => multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
      const {podId, topicId} = req.params;
      const path = 'uploads/podDiscussions/' + podId + '/' + topicId;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      cb(null, path)
    },
    filename: function (req: any, file: any, cb: any) {
      console.log(file);
      cb(null, file.originalname + extension);
    }
  });
  
  let upload = multer({
    storage: storage('.png')
  });
  
  let upload2 = multer({
    storage: storage('.mp3')
  });
  
  let upload3 = multer({
    storage: storage('.mp4')
  });

router.post('/newChat', authenticateJWT, podDiscussionController.createChat);
router.get('/getDiscussions/:podId', authenticateJWT, podDiscussionController.getDiscussions);
router.get('/getMessages/:podId/:topicId', authenticateJWT, podDiscussionController.getMessages);

router.post('/addMessagePhoto/:podId/:topicId', authenticateJWT, upload.single('image'), podDiscussionController.fileName);
router.post('/addMessageAudio/:podId/:topicId', authenticateJWT, upload2.single('audio'), podDiscussionController.fileName);
router.post('/addMessageVideo/:podId/:topicId', authenticateJWT, upload3.single('video'), podDiscussionController.fileName);

router.get('/getMessagePhoto/:podId/:topicId/:fileName', podDiscussionController.getFile('image'));
router.get('/getMessageAudio/:podId/:topicId/:fileName', podDiscussionController.getFile('audio'));
router.get('/getMessageVideo/:podId/:topicId/:fileName', podDiscussionController.getFile('video'));

module.exports = router;