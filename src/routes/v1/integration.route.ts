

import { validate } from './../../modules/validate';
import { auth } from '../../modules/auth';
import { addIntegrationController, getIntegrationsController } from '../../modules/integrations';
import { Router } from 'express';
import { integrationValidation } from './../../modules/integrations/integration.validation';
import { deleteIntegrationController, getCampaignsFromIntegrationController } from './../../modules/integrations/integration.controller';

const router = Router();

router.post("/create", auth(), validate(integrationValidation.body), addIntegrationController)
router.get("/get-campaigns/:id", auth(), getCampaignsFromIntegrationController)
router.get("/", auth(), getIntegrationsController)
router.delete("/:id", auth(), deleteIntegrationController)

export default router;
