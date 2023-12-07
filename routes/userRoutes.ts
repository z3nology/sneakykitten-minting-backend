import express from 'express';
import {  mintArtController, claimNftsRewardController, getClaimAmount, getCurrentIndex, getAdminWalletInfo, claimTreasuryVault} from '../controllers/userController';

const router = express.Router();

router.post('/mintart', mintArtController);
router.post('/claimReward', claimNftsRewardController);
router.get('/claimAmount', getClaimAmount);
router.get('/currentIndex', getCurrentIndex);
router.get('/allowWallet', getAdminWalletInfo);
router.post('/claimTreasuryVault', claimTreasuryVault);

export default router;
