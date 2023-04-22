

import { auth } from '../../modules/auth';
import { addIntegrationController } from '../../modules/integrations';
import { Router } from 'express';

const router = Router();

router.post("/add", auth(), addIntegrationController)

export default router;
