
import { createCampaignValidation } from '../../modules/campaign/campaign.validatation';
import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import { validate } from '../../modules/validate';
import { Router } from 'express';

const router = Router();

router.post("/create", auth(), validate(createCampaignValidation), createCampaignController)

export default router;
