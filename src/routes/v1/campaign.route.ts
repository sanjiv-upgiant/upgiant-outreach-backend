import { Router } from 'express';

import { createCampaignValidation } from '../../modules/campaign/campaign.validatation';
import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import { validate } from '../../modules/validate';
import { deleteUserCampaignController, getSingleCampaignUrlsController, getUserCampaignsController, getUserSingleCampaignController } from '../../modules/campaign/campaign.controller';

const router = Router();

router.post("/create", auth(), validate(createCampaignValidation), createCampaignController)
router.get("/", auth(), getUserCampaignsController)
router.get("/:id", auth(), getUserSingleCampaignController)
router.delete("/:id", auth(), deleteUserCampaignController)
router.get("/:id/urls", auth(), getSingleCampaignUrlsController)

export default router;
