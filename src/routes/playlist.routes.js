import { Router } from 'express';
import {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
} from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {upload} from '../middlewares/multer.middleware.js';

export const playlistRouter = Router();

playlistRouter.use(verifyJWT, upload.none()); // Apply verifyJWT middleware to all routes in this file

playlistRouter.route("/").post(createPlaylist)

playlistRouter
    .route("/p/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

playlistRouter.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
playlistRouter.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

playlistRouter.route("/user/:userId").get(getUserPlaylists);