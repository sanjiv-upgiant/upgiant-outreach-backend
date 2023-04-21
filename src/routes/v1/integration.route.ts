

import { auth } from '../../modules/auth';
import { addIntegrationController } from '../../modules/integrations';
import { Router } from 'express';

const router = Router();

router.post("/add-integration", auth(), addIntegrationController)

export default router;
