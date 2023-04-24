import express, { Router } from 'express';
import authRoute from './auth.route';
import campaignRoute from './campaign.route';
import integrationRoute from './integration.route';
import { parseSerpResponse } from './../../app/serp/serpapi';

console.log(parseSerpResponse);

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

defaultIRoute.forEach((route) => {
  router.use(route.path, route.route);
});


export default router;
