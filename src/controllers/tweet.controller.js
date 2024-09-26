import { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createTweet = asyncHandler(async(req,res)=>{
    const {content} = req.body;
    //check if it is owner or not 
    //as tweet is made by owner
    if(!content || content?.trim()===""){
        throw new ApiError(400,"Tweet Content can't be empty")
    }

    const tweet = await Tweet.create({
        content,
        owner:req.user._id
    })

    if(!tweet){
        throw new ApiError(400,"Something went wrong while createing tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(201,tweet,"Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async(req,res)=>{
    const {userId} = req.params;
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Not a valid userId")
    }
    
    //find the user in database
    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(400,"User not found");
    }

    //now match it in the Tweet
    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner:user._id
            }
        }
    ])

    if(!tweets){
        throw new ApiError(500,"Something went wrong while fetching the tweets")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,tweets,"Tweets fetched successfully of given user")
    )
})

const updateTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params;
    const {newContent} = req.body;

    if(!tweetId){
        throw new ApiError(400,"Given tweetId is inValid");
    }
    //find the tweet from the given tweetId in the database
    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(400,"tweet does not exist in the database");
    }
    //use tweet.owner to verify the user
    //check if its the owner
    if(req.user?._id.toString()!== tweet.owner?.toString()){
        throw new ApiError(400,"You have permission to update the tweet")
    };

    if(!newContent || newContent?.trim()===""){
        throw new ApiError(400,"Tweet feild can't be empty")
    };

    //update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweet._id,
        {
            $set:{
                content:newContent
            }
        },
        {
            new:true
        }
    );

    if(!updatedTweet){
        throw new ApiError(500,"Something went wrong while updating the tweet");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,updatedTweet,"Tweet Updated successfully")
    )
})

const deleteTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Given TweetId is inValid")
    }

    //check if its the owner
    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(400,"Tweet does not exists in the database")
    }

    //check for owner
    if(tweet.owner?.toString()!== req.user?._id.toString()){
        throw new ApiError(400,"You don't have permission to Delete the tweet")
    }
    
    //find in the database
    const deletedTweet = await Tweet.deleteOne({_id:tweetId})
    //this reture true if deleted and false if not deleted

    if(!deletedTweet){
        throw new ApiError(500,"Something went wrong while deleting the tweet")
    }
    return res
    .status(201)
    .json(
        new ApiResponse(200,deletedTweet,"Tweet deleted successfully")
    )
})

export{createTweet,getUserTweets,updateTweet,deleteTweet}