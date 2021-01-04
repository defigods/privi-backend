import express from 'express';
import multer from 'multer';
import path from 'path';
const router = express.Router();


import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const blogController = require('../controllers/blogController');

/*
let storage3 = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        const directoryPath = path.join('uploads', 'blog');

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
*/

router.post('/', authenticateJWT, blogController.blogCreate);


module.exports = router;
