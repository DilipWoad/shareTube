import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const toggleVideoLike = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Given videoId is inValid")
    }

    //check in Like schema where videoid matchs video
    //if someone has like the video it will be at the Like schema ->video section
    try {
        const isVideoLiked = await Like.findById({
            video:videoId
        })
    
        let unlike;
        let like;
        
        if(isVideoLiked){ //if the video is liked
            //give the option to unlike it 
            unlike = await Like.deleteOne({
                video:videoId
            })
    
            if(!unlike){ //if deleteone gives false 
                throw new ApiError(500,"Something went wrong while Unliking the video")
            }
    
            return res
            .status(201)
            .json(
                new ApiResponse(200,unlike,"Video unlike successfully") //unlike return true if deleteOne
            )
        }else{
            //if unlike
            //give option to like
            like = await Like.create({
                video:videoId,
                //and also update likeBy
                likeBy : req.user._id
            })
    
            if(!like){
                throw new ApiError(500,"Something went wrong while liking the video")
            }
    
            return res.status(201).json(new ApiResponse(200,like,"Video Liked successfully"))
        }
    } catch (error) {
        console.log("ToggleVideoLike :: ",error)
        throw new ApiError(500,"Something went wrong while updating like/unlike",error)
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if(!isValidObjectId(commentId)){
        throw new ApiResponse(400,"Invalid comment Id")
    }

    //find in Like schema the comment id
    try {
        const isLikedToComment = await Like.findById({
            comment:commentId
        })

        let likeComment;
        let unlikeComment;

        if(isLikedToComment){
            //give option for unlike the comment
            unlikeComment=await Like.deleteOne({
                comment:commentId
            })

            if(!unlikeComment){
                throw new ApiError(500,"Something went wrong while unliking comment")
            }

            return res
            .status(200)
            .json(
                new ApiResponse(201,unlikeComment,"Comment unliked successfully")
            )
        }else{
            //give option to like comment
            likeComment = await Like.create(

                {
                    comment:commentId,
                    likeBy:req.user._id
                }
            )
            if(!likeComment){
                throw new ApiError(500,"Something went wrong while iking comment")
            }

            return res
            .status(200)
            .json(
                new ApiResponse(201,likeComment,"Comment liked successfully")
            )
        }
    } catch (error) {
        console.log("ToggleCommentLike :: ",error)
        throw new ApiError(500,"Something went wrong while updating comment like/unlike",error)
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid Tweet Id")
    }

    try {
        const isTweetLiked =await Like.findById({
            tweet:tweetId
        })
    
        let likeTweet;
        let unlikeTweet;
    
        if(isTweetLiked){
            //give option to unlike
            unlikeTweet= await Like.deleteOne({
                tweet:tweetId
            })

            if(!unlikeTweet){
                throw new ApiError(500,"Somthing went wrong while unliking the tweet")
            }

            return res
            .status(200)
            .json(
                new ApiResponse(201,unlikeTweet,"Tweet unliked successfully")
            )
        }else{
            //give option to like
            //means create a new documment
            likeTweet= await Like.findByIdAndUpdate({
                tweet:tweetId,
                likeBy:req.user._id
            })

            if(!likeTweet){
                throw new ApiError(500,"Somthing went wrong while liking the tweet")
            }

            return res
            .status(200)
            .json(
                new ApiResponse(201,likeTweet,"Tweet liked successfully")
            )
        }
    } catch (error) {
        console.log("ToggleTweetLike :: ",error)
        throw new ApiError(500,"Something went wrong while updating tweet like/unlike",error)
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "This user id is not valid")
    }

    // find user in database 
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const likes = await Like.aggregate([
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "videoOwner",
                            foreignField: "_id",
                            as: "videoOwner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            videoOwner:{
                                $arrayElemAt: ["$videoOwner" , 0]
                            }
                        }
                    }
                ]
            }
        },

    ])

    if(!likes){
        throw new ApiError(503,"Something went wrong while fetching liked Videos")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,likes,"Liked videos fetched successfully")
    )
})
export {toggleVideoLike,toggleCommentLike,toggleTweetLike,getLikedVideos}