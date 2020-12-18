import express from 'express';
import multer from 'multer';
import path from 'path';
const router = express.Router();


import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const forumController = require('../controllers/forumController');

let storage3 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        const directoryPath = path.join('uploads', 'forum');

        // console.log(directoryPath);
        // const {resolve} = require("path");
        // console.log(resolve(directoryPath));

        cb(null, directoryPath)
    },
    filename: function (req: any, file: any, cb: any) {
        // console.log(file);
        cb(null, Date.now() + "_" + file.originalname)
    }
});
let upload3 = multer({
    storage: storage3
});

router.post('/', upload3.any(), authenticateJWT, forumController.postCreate); // does multer overwrite our jwt?

router.post('/posts/', forumController.postListByLink);

router.get('/:postId', authenticateJWT, forumController.postView);

router.get('/image/:postId/:imageFile', forumController.postImageView);
router.get('/document/:postId/:documentFile', forumController.postDocumentView);

router.post('/comment/', authenticateJWT, forumController.commentCreate);



module.exports = router;
