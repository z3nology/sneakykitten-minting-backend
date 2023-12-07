import express from 'express';
import {  mintArtController, claimNftsRewardController, getClaimAmount, getCurrentIndex} from '../controllers/userController';

const router = express.Router();

router.post('/mintart', mintArtController);
router.post('/claimReward', claimNftsRewardController);
router.get('/claimAmount', getClaimAmount);
router.get('/currentIndex', getCurrentIndex);

export default router;
