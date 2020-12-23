import express from 'express';
import multer from "multer";
const router = express.Router();

import { authenticateJWT } from '../middlewares/jwtAuthMiddleware';
const priviDataController = require('../controllers/priviDataController');

// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/campaigns')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});

router.get('/getInfo/:userId', authenticateJWT, priviDataController.getInfo);
router.get('/getCampaigns/:userId', authenticateJWT, priviDataController.getCampaigns);
router.get('/getMyPodsPoolsCreditsCommunities/:userId', authenticateJWT, priviDataController.getMyPodsPoolsCreditsCommunities);

router.post('/changeCampaignPhoto', authenticateJWT, upload.single('image'), priviDataController.changeCampaignPhoto);

router.post('/createCampaign', authenticateJWT, priviDataController.createCampaign);

module.exports = router;