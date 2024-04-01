import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

export const subscriptionRouter = Router();
subscriptionRouter.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

subscriptionRouter
    // pass logined userID // get user subscribers
    .route("/c/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription);

    // pass logined userID // get user subscribing
    subscriptionRouter.route("/u/:subscriberId").get(getSubscribedChannels);