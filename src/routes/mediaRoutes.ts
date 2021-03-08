import { Router } from 'express';
import { getEthMedia, getEthMediaItem } from '../controllers/mediaController';

const router: Router = Router();

router.get('/', getEthMedia);

router.get('/:id', getEthMediaItem);

module.exports = router;
