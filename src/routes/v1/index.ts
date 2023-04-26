import express, { Router } from 'express';
import authRoute from './auth.route';
import campaignRoute from './campaign.route';
import integrationRoute from './integration.route';
import { serverAdapter } from './../../crawler/adapter';


const router = express.Router();

interface IRoute {
  path: string;
  route: Router;
}

const defaultIRoute: IRoute[] = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/campaign',
    route: campaignRoute,
  },
  {
    path: '/integration',
    route: integrationRoute,
  },
];

router.use('/admin/queues', serverAdapter.getRouter());

defaultIRoute.forEach((route) => {
  router.use(route.path, route.route);
});


export default router;
