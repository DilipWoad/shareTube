import mongoose, { isValidObjectId, mongo } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async(req,res)=>{
    const {videoId}= req.params;
    const {page=1,limit=10} = req.query;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid Video ID")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video does not exists")
    }

    //video exist now find the comments in the videos
    const VideoComments = await Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        }
    ])

    await Comment.aggregatePaginate(VideoComments,{
        page,
        limit
    }).then((result)=>{
        return res
        .status(201)
        .json(
            new ApiResponse(200,result,"Comment fetched Successfully")
        )
    }).catch((error)=>{
        console.log("CommentController :: VideoComment :: ",error);
        throw new ApiError(500,"Something went wrong while fetching the comments")
    })

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content} = req.body;
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"InValid video ID")
    }

    //check video in db
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video does not exists")
    }

    if(!content || content.trim()===""){
        throw new ApiError(400,"Comment Content can't be empty")
    }

    //create a comment
    const comment = await Comment.create({
        content,
        video:videoId,
        owner:req.user._id
    })

    if(!comment){
        throw new ApiError(503,"Something went wrong while Creating a comment")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,comment,"Comment created successfully")
    )
})

//check if videoId is needed to check if the comment is in the given video
const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const{Newcontent}=req.body;
    // const{commentId,videoId}=req.params;
    const{commentId}=req.params;

    // if(!isValidObjectId(commentId) || !isValidObjectId(videoId)){
    //     throw new ApiError(400,"Invalid comment or video ID")
    // }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment ID")
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(400,"Comment does not exists")
    }

    //check if the owner
    if(comment.owner?.toString() !== req.user._id?.toString()){
        throw new ApiError(400,"You dont have permission to edit comment")
    }

    // if(!comment.video.includes(videoId)){
    //     throw new ApiError(403,"Comment does not present in the given video Id")
    // }

    if(!Newcontent || Newcontent.trim()===""){
        throw new ApiError(403,"Comment content can't be Empty");
    }
    //now update the comment
    try {
        const newComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set:{
                    content:Newcontent
                }
            },
            {
                new:true
            }
        )
    
        if(!newComment){
            throw new ApiError(500,"Somrthing went wrong while editing the comment")
        }
        
        return res
        .status(201)
        .json(
            new ApiResponse(200,newComment,"Comment edited successfully")
        )
    } catch (error) {
        console.log("CommentController :: updateComment :: ",error);
        throw new ApiError(500,"Somrthing went wrong while editing the comment");
    }
    
})
//check if videoId is needed to check if the comment is in the given video
const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const{commentId}=req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment id");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(400,"Comment does not exists")
    }

    //owner
    if(comment.owner?.toString()!== req.user._id?.toString()){
        throw new ApiError(400,"You don't have permission to delete the comment")
    }

    //now delete
    const deletedComment = await Comment.deleteOne({_id:commentId});

    if(!deletedComment){
        throw new ApiError(500,"Something went wrong while deleteing the comment")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,deletedComment,"Comment deleted successfully")
    )

})
export {getVideoComments, addComment, updateComment ,deleteComment}