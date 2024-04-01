import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from '../middlewares/multer.middleware.js';

export const commentRouter = Router();

commentRouter.use(verifyJWT, upload.none()); // Apply verifyJWT middleware to all routes in this file

commentRouter.route("/v/:videoId").get(getVideoComments).post(addComment);
commentRouter.route("/c/:commentId").delete(deleteComment).patch(updateComment);