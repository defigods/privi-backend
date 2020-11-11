import express from 'express';
import multer from "multer";
const router = express.Router();

const podController = require('../controllers/podController');


// let upload = multer({ dest: 'uploads' });
// Multer Settings for file upload
let storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/pods')
    },
    filename: function (req: any, file: any, cb: any) {
        console.log(file);
        cb(null, file.originalname + '.png')
    }
});
let upload = multer({
    storage: storage
});

router.post('/changePodPhoto', upload.single('image'), podController.changePodPhoto);
router.get('/FT/getPhoto/:podId', podController.getPhotoById);

router.get('/NFT/getPod/:podId', podController.getNFTPod);
router.get('/FT/getPod/:podId', podController.getFTPod);

router.get('/NFT/getMyPods/:userId', podController.getMyPodsNFT);
router.get('/FT/getMyPods/:userId', podController.getMyPodsFT);
router.get('/NFT/getTrendingPods/:userId', podController.getTrendingPodsNFT);
router.get('/FT/getTrendingPods/:userId', podController.getTrendingPodsFT);
router.get('/NFT/getOtherPods/:userId', podController.getOtherPodsNFT);
router.get('/FT/getOtherPods/:userId', podController.getOtherPodsFT);

router.get('/NFT/getAllPodsInfo/:userId', podController.getAllNFTPodsInfo);
router.get('/FT/getAllPodsInfo/:userId', podController.getAllFTPodsInfo);

router.post('/initiatePod', podController.initiatePOD);
router.post('/deletePod', podController.deletePOD);
router.post('/investPod', podController.investPOD);
router.post('/swapPod', podController.swapPod);

router.post('/followPod', podController.followPod);
router.post('/unFollowPod', podController.unFollowPod);

module.exports = router;
