import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
// Send media to cloudinary //
import {uploadOnCloudinary, deleteOnCloudinary} from '../utils/cloudinary.js';
// Models User //
import {User} from '../models/user.models.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// custom method for access and refresh token
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const userData = await User.findById(userId);
        // generating tokens for registered users
        const accessToken = userData.generateAccessToken();
        const refreshToken = userData.generateRefreshToken();
        // save tokens to db
        userData.refreshToken = refreshToken;
        await userData.save({validateBeforeSave: false});
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token."); 
    }
};

export const registerUser = asyncHandler(async(req, res)=>{
    // Steps register path
    // get user request
    // check all fields are filled
    // check if user already exists
    // check for avatar and cover image is required
    // upload media to cloudinary
    // create user object 
    // remove password and refresh token from response
    // final check is user created
    // return response
    const {username, email, fullName, password} = req.body;
    if ([username, email, fullName, password].some(field => { field?.trim() === ""})) {
        throw new ApiError(400, "All Fields are required")
    };
    if(!email?.trim().includes("@")){
        throw new ApiError(400, "Invalid email")
    };
    if(email !== email.toLowerCase()){
        throw new ApiError(400, "email must be in lowercase or remove spaces")
    };
    if((username || email).includes(" ")){
        throw new ApiError(400, "remove spaces")
    };
    if(password.length<8){
        throw new ApiError(400, "password must be above 8 digits")
    }

    const userExists = await User.findOne({
        // mongoDb operator
        $or: [{username}, {email}]
    })
    if(userExists){
        throw new ApiError(409, "User with username or email is already exists");
    };

    // console.log("req.files", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage.length>0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatarUploaded = await uploadOnCloudinary(avatarLocalPath);
    const coverImageUploaded = await uploadOnCloudinary(coverImageLocalPath);
    // console.log("avatarUploaded", avatarUploaded);
    if(!avatarUploaded){
        throw new ApiError(400, "Avatar file is required")
    }
    // here after media upload on cloudinary, it return url and public_id
    // use the public_id with db creation
    const newDBUser = await User.create({
        username,
        email,
        fullName,
        avatar: {
            public_id: avatarUploaded?.public_id,
            url: avatarUploaded.secure_url,
        },
        coverImage: {
            public_id: coverImageUploaded?.public_id || "",
            url : coverImageUploaded.secure_url || "",
        },
        password
    });
    const createdUser = await User.findById(newDBUser._id).select('-password -refreshToken');
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user.")
    };

    return res.status(201).json(new ApiResponse(200, createdUser, "User Registered Successfully"))
});

export const loginUser = asyncHandler(async(req, res)=>{
    // Login Todos
    // req.body
    // username or email
    // find the user
    // password check
    // acces and refresh token generate
    // send token to cookies
    const {email, username, password} = req.body;
    if(!(username || email)){
        throw new ApiError(400, "username and email is required");
    };
    const dbUser = await User.findOne({
        $or: [{ email }, { username }]
    });
    if(!dbUser){
        // throw new ApiError(404, "User doesnot exist.")
        res.status(400).json({ error: "User doesnot exist.", success:"false" });
        // const error = new ApiError(400, "User does not exist.");
        // const formattedError = ApiError.formatError(error.statusCode, error.message);
        // res.status(error.statusCode).json(formattedError);
    };
    const checkPassword = await dbUser.isPasswordCorrect(password);
    if(!checkPassword){
        throw new ApiError(401, "Invalid user credentials")
    };

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(dbUser._id);
    const loggedInUser = await User.findById(dbUser._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User Logged in Successfully"))
});

export const logoutUser = asyncHandler(async(req, res)=>{
    // Logout Todos
    // clear cookies
    // remove refreshToken from db
    await User.findByIdAndUpdate(
        // here req.user is get from the jwtVerify middleware
        req.user._id,
        {
            // clear the refresh token from db
            $unset: {
                refreshToken: 1,
            }
        },
        {
            new: true,
        }
        );
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    };
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out successfully"))
});

export const refreshAccessToken = asyncHandler(async(req, res)=>{
    // refreshAccessToken Todos
    // check cookies and db refreshToken
    // generate new access and refreshToken
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    };
    // use jwt to verify b/w db-refreshToken and cookies-refreshToken
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid refreshToken")
        };
        // check b/w cookies-refreshToken and db-refreshToken
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "RefreshToken is expired or used");
        };
        // generate token
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user?._id);
        const dbUser = await User.findById(user?._id).select('-password -refreshToken');
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None",
        }
        return res.status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, {user: dbUser, accessToken, refreshToken}, "RefreshToken Updated"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refreshToken")
    };
});

export const changeCurrentPassword = asyncHandler(async(req, res)=>{
    // changePassword Todos
    // get oldPassword, newPassword
    // check oldPassword
    // check newPassword, confirmPassword
    // return response
    const {oldPassword, newPassword, confirmPassword} = req.body;
    if(!(newPassword || newPassword || confirmPassword)){
        throw new ApiError(401, "Password is required");
    };
    if((newPassword || confirmPassword).length<8){
        throw new ApiError(401, "password must be 8 digits")
    };
    if(newPassword !== confirmPassword){
        throw new ApiError(401, "New password does not match")
    };
    const userData = await User.findById(req.user?._id);
    const isGetPasswordCorrect = await userData.isPasswordCorrect(oldPassword);
    if(!isGetPasswordCorrect){
        throw new ApiError(400, "old password does not match")
    };
    userData.password = newPassword;
    await userData.save({validateBeforeSave: false});
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
});

export const getCurrentUser = asyncHandler(async(req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        )
});

export const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {newUsername, newFullName} = req.body;
    if(!(newUsername || newFullName)){
        throw new ApiError(400, "All fields are required")
    };
    if((newUsername || newFullName).includes(" ")){
        throw new ApiError(401, "remove spaces")
    };
    // const exists = await User.findOne({username:newUsername})
    // if(exists){
    //     throw new ApiError(401, "This username is already taken")
    // };
    
    const userData = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                username : newUsername,
                fullName : newFullName,
            }
        },
        {
            new : true,
        }
    ).select('-password -refreshToken');
    return res.status(200).json(new ApiResponse(200, userData, "Account details update successfully"));
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    };
    const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    if (!avatarUpload) {
        throw new ApiError(400, "Error while uploading avatar")
    };
    // before change media store the pervious media //
    const dbAvatar = await User.findById(req.user?._id);
    const avatarToDelete = dbAvatar.avatar.public_id;
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    public_id: avatarUpload.public_id,
                    url: avatarUpload.secure_url,
                }
            }
        },
        {
            new: true,
        }).select('-password -refreshToken');
    // check old media is present and new media is present
    // then delete old media
    if (avatarToDelete && updatedUser.avatar.public_id) {
        await deleteOnCloudinary(avatarToDelete);
    };
    return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"))
});

export const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "CoverImage file is missing")
    };
    const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImageUpload){
        throw new ApiError(400, "Error while uploading coverImage")
    };
    // before change media store the pervious media //
    const dbCoverImage = await User.findById(req.user?._id);
    const coverImageToDelete = dbCoverImage.coverImage.public_id;
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: {
                    public_id: coverImageUpload.public_id,
                    url: coverImageUpload.secure_url,
                }
            }
        },
        {
            new: true,
        }).select('-password -refreshToken');
    // check old media is present and new media is present
    // then delete old media
    if (coverImageToDelete && updatedUser.coverImage.public_id) {
        await deleteOnCloudinary(coverImageToDelete);
    }
    return res.status(200).json(new ApiResponse(200, updatedUser, "CoverImage updated successfully"))
});

export const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400, "Username is missing in params/url")
    };
    if(username?.includes(" ")){
        throw new ApiError(400, "remove spaces in params/url")
    };
    const channel = await User.aggregate([
        {
            $match : {
                username: username
            }
        },
        {
            // find my channel in channels
            $lookup : {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            }
        },
        {
            // find channel whom i subscribedTo
            $lookup : {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            }    
        },
        {
            // combine two fields
            $addFields : {
                subscriberCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed : {
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                email:1,
                fullName:1,
                avatar:1,
                coverImage:1,
                subscriberCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
            }
        }
    ]);
    // console.log("channel", channel);
    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists.")
    };
    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
});

export const getWatchHistory = asyncHandler(async(req, res)=>{
    const user = await User.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline: [
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            username:1,
                                            fullName:1,
                                            avatar:1,
                                        }
                                    }
                                ],
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            },
        ]
    );
    // console.log(user)
    return res.status(200).json(new ApiResponse((200), user[0].watchHistory, "Watch history fetched successfully"))
});