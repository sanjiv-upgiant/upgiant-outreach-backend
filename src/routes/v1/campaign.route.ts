import { Router } from 'express';

import { auth } from '../../modules/auth';
import { createCampaignController } from '../../modules/campaign';
import {
  deleteLeadFromCampaignController,
  deleteUserCampaignController,
  editCampaignController,
  editUserCampaignUrlController,
  emailTemplateController,
  exportCampaignUrlsController,
  getEmailTemplatesController,
  getSingleCampaignUrlsController,
  getUserCampaignsController,
  getUserSingleCampaignController,
  uploadCampaignFileController,
} from '../../modules/campaign/campaign.controller';
import {
  createCampaignValidation,
  deleteLeadFromCampaignValidation,
  editCampaignUrlValidation,
  getEmailFromEmailTemplateValidation,
  getEmailTemplatesFromObjectiveValidation,
} from '../../modules/campaign/campaign.validatation';
import { validate } from '../../modules/validate';

const router = Router();

router.post('/create', auth(), validate(createCampaignValidation), createCampaignController);
router.post('/get-email-template', auth(), validate(getEmailFromEmailTemplateValidation), emailTemplateController);
router.post(
  '/get-templates-from-category',
  auth(),
  validate(getEmailTemplatesFromObjectiveValidation),
  getEmailTemplatesController
);
router.post('/edit-campaign-url', auth(), validate(editCampaignUrlValidation), editUserCampaignUrlController);
router.post('/upload', auth(), uploadCampaignFileController);
router.post('/delete-lead', auth(), validate(deleteLeadFromCampaignValidation), deleteLeadFromCampaignController);
router.get('/', auth(), getUserCampaignsController);
router.delete('/:id', auth(), deleteUserCampaignController);
router.get('/:id/urls', auth(), getSingleCampaignUrlsController);
router.get('/:id', auth(), getUserSingleCampaignController);
router.put('/:id/', auth(), editCampaignController);
router.post('/export/', auth(), exportCampaignUrlsController);

export default router;
