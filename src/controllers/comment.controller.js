import mongoose from "mongoose";
import {Comment} from "../models/comment.models.js";
import {Video} from "../models/video.models.js";
import {Like} from "../models/like.models.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

//TODO: get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;
    const video = await Video.findById(videoId);

    if (!video) {
        // throw new ApiError(404, "Video not found");
        res.status(404).json({ error: "Video not found", success:"false" });
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
})

// TODO: add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        // throw new ApiError(400, "Content is required");
        res.status(400).json({ error: "Content is required", success:"false" });
    }

    const video = await Video.findById(videoId);

    if (!video) {
        // throw new ApiError(404, "Video not found");
        res.status(404).json({ error: "Video not found", success:"false" });
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    });

    if (!comment) {
        // throw new ApiError(500, "Failed to add comment please try again");
        res.status(500).json({ error: "Failed to add comment please try again", success:"false" });
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// TODO: update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        // throw new ApiError(400, "content is required");
        res.status(400).json({ error: "content is required", success:"false" });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        // throw new ApiError(404, "Comment not found");
        res.status(404).json({ error: "Comment not found", success:"false" });
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        // throw new ApiError(400, "only comment owner can edit their comment");
        res.status(400).json({ error: "only comment owner can edit their comment", success:"false" });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content
            }
        },
        { new: true }
    );

    if (!updatedComment) {
        // throw new ApiError(500, "Failed to edit comment please try again");
        res.status(500).json({ error: "Failed to edit comment please try again", success:"false" });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment edited successfully")
        );
})

// TODO: delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        // throw new ApiError(404, "Comment not found");
        res.status(404).json({ error: "Comment not found", success:"false" });
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        // throw new ApiError(400, "only comment owner can delete their comment");
        res.status(400).json({ error: "only comment owner can delete their comment", success:"false" });
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { commentId }, "Comment deleted successfully")
        );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
