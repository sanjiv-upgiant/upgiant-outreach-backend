
import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import { Router } from 'express';

const router = Router();

router.post("/create", auth(), createCampaignController)

export default router;
