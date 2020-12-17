
import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
import multer from "multer";
const communitiesController = require('../controllers/communitiesController');

let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/badges')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});

router.post('/badges/create', authenticateJWT, communitiesController.createBadge);
router.post('/badges/changeBadgePhoto', authenticateJWT, upload.single('image'), communitiesController.changeBadgePhoto);

module.exports = router;
