import { Router } from 'express';
import { healthcheck } from "../controllers/healthcheck.controller.js"

export const healthRouter = Router();

healthRouter.route('/').get(healthcheck);