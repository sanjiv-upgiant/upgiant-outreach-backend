import { Router } from 'express';

import { createCampaignValidation } from '../../modules/campaign/campaign.validatation';
import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import { validate } from '../../modules/validate';
import { deleteUserCampaignController, uploadCampaignFileController, editCampaignController, emailTemplateController, getSingleCampaignUrlsController, getUserCampaignsController, getUserSingleCampaignController } from '../../modules/campaign/campaign.controller';
import { createEmailTemplateValidation } from '../../modules/campaign/campaign.validatation';

const router = Router();

router.post("/create", auth(), validate(createCampaignValidation), createCampaignController)
router.post("/get-email-template", auth(), validate(createEmailTemplateValidation), emailTemplateController)
router.post("/upload", auth(), uploadCampaignFileController)
router.get("/", auth(), getUserCampaignsController)
router.delete("/:id", auth(), deleteUserCampaignController)
router.get("/:id/urls", auth(), getSingleCampaignUrlsController)
router.get("/:id", auth(), getUserSingleCampaignController)
router.put("/:id/", auth(), editCampaignController)

export default router;
