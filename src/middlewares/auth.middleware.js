import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import  {ApiError}  from '../utils/ApiError.js';
import { User } from '../models/user.models.js';

export const verifyJWT = asyncHandler(async(req, res, next)=>{
    try {
        // take accessToken from cookies
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if(!accessToken){
            throw new ApiError(401, "Unauthorized request")
        };

        // check the token is match or not
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        // console.log("decodedToken", decodedToken);

        // here _id is get/match from the userModel
        const authUser = await User.findById(decodedToken?._id).select('-password -refreshToken');
        if(!authUser){
            throw new ApiError(401, "Invalid access token")
        };
        req.user = authUser;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    };
});