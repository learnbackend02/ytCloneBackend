import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from '../controllers/user.controller.js';
// multer to store media in local //
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";

export const userRoute = Router();

userRoute.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);
userRoute.route("/login").post(upload.none(), loginUser);

// secured routes
userRoute.route("/logout").post(verifyJWT, logoutUser);
userRoute.route("/refresh-token").post(refreshAccessToken);
userRoute.route("/change-password").post(verifyJWT, changeCurrentPassword);
userRoute.route("/current-user").get(verifyJWT, getCurrentUser);
userRoute.route("/update-user").patch(verifyJWT, updateAccountDetails);
userRoute.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
userRoute.route("/update-coverImg").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

userRoute.route("/c/:username").get(verifyJWT, getUserChannelProfile);
userRoute.route("/watch-history").get(verifyJWT, getWatchHistory);