import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getChannelStats = asyncHandler(async(req,res)=>{
    //get the channel stats like total views,total subscribe,total like etc

    //total subscriber
   try {
     const allSubscribers =await Subscription.aggregate([
         {
             $match:{
                 channel : new mongoose.Types.ObjectId(req.user._id)
             }
         },
         {
             $count:"subscribers"
         }
     ])
 
     const allVideos = await Video.aggregate([
         {
             $match:{
                 owner : new mongoose.Types.ObjectId(req.user._id)
             }
         },
         {
             $count:"Videos"
         }
     ])
 
     const allViews = await Video.aggregate([
         {
             $match:{
                 owner:new mongoose.Types.ObjectId(req.user._id)
             }
         },
         {
             $group:{
                 _id:null,
                 allVideoViews:{
                     $sum:"$views"
                 }
             }
         }
     ])
 
     const allLikes = await Like.aggregate([
         {
             $match:{
                 likeBy : new mongoose.Types.ObjectId(req.user._id)
             }
         },
         {
             $group:{
                 _id:null,
                 totalVideoLikes:{
                     $sum:{
                         $cond:[
                             {$ifNull : ["$video",false]},
                             1, //if not null give 1
                             0 //if null give 0 for sum
                         ]
                     }
                 },
                 totalTweetLikes:{
                     $sum:{
                         $cond:[
                             {$ifNull:["$tweet",false]},
                             1,
                             0
                         ]
                     }
                 },
                 totalCommentLikes:{
                     $sum:{
                         $cond:[
                             {$ifNull:["$comment",false]},
                             1,
                             0
                         ]
                     }
                 }
             }
         }
     ])
 
     const userStats={
         TotalSubscribers:allSubscribers[0].subscribers,
         totalVideos:allVideos[0].Video,
         totalViews:allViews[0].allVideoViews,
         totalVideosLikes:allLikes[0].totalVideoLikes,
         totalTweetsLikes:allLikes[0].totalTweetLikes,
         totalCommentsLikes:allLikes[0].totalCommentLikes
     }
 
     return res
     .status(201)
     .json(
         new ApiResponse(200,userStats,"User channel data fetched Successfully")
     )
   } catch (error) {
    console.log("UserDashboard :: ",error);
    return res
    .status(500)
    .json(
        new ApiResponse(503,{},"Something went wrong while fetching the user dashboard data")
    )
   }
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const usersAllVideos = await Video.find({
        owner:req.user._id
    })

    if(!usersAllVideos){
        throw new ApiError(500,"Something went wrong while fetching uers All videos")
    }


    return res
    .status(201)
    .json(
        new ApiResponse(200,usersAllVideos,"Users All Videos fetched Successfully")
    )
})

export {getChannelStats,getChannelVideos}