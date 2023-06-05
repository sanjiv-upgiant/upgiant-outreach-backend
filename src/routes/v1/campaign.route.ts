import { Router } from 'express';

import { createCampaignValidation, getEmailTemplatesFromObjectiveValidation } from '../../modules/campaign/campaign.validatation';
import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import { validate } from '../../modules/validate';
import { deleteUserCampaignController, uploadCampaignFileController, editCampaignController, emailTemplateController, getSingleCampaignUrlsController, getUserCampaignsController, getUserSingleCampaignController, getEmailTemplatesController } from '../../modules/campaign/campaign.controller';
import { getEmailFromEmailTemplateValidation } from '../../modules/campaign/campaign.validatation';

const router = Router();

router.post("/create", auth(), validate(createCampaignValidation), createCampaignController)
router.post("/get-email-template", auth(), validate(getEmailFromEmailTemplateValidation), emailTemplateController)
router.post("/get-templates-from-category", auth(), validate(getEmailTemplatesFromObjectiveValidation), getEmailTemplatesController)
router.post("/upload", auth(), uploadCampaignFileController)
router.get("/", auth(), getUserCampaignsController)
router.delete("/:id", auth(), deleteUserCampaignController)
router.get("/:id/urls", auth(), getSingleCampaignUrlsController)
router.get("/:id", auth(), getUserSingleCampaignController)
router.put("/:id/", auth(), editCampaignController)

export default router;
