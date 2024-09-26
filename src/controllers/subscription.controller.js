import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId){
        throw new ApiError(400,"Invalid channel id")
    }

    //fnd the channel in the user databse
    //as Channel is at the end A User only
    const channels = await User.findById(channelId)

    if(!channels){
        throw new ApiError(400,"Channel does node exists")
    }

    //if channel exists then check if subscribe or not
    let unsubscribe;
    let subscribe;

    //so the current logged-in user is subscribe to given channel id
    //check in the Subscription schema
    const isSubscibedToChannel = await Subscription.findOne(
        {   //does this document present in the Subscription model
            subscriber:req.user._id, //current logged-in user
            channel:channelId
        }
    )

    // if is subscribed to channel then show the user unsubscibe option
    if(isSubscibedToChannel){
        //show unsubscribe option
        unsubscribe = await Subscription.findByIdAndDelete(
            {
                subscriber:req.user._id
            }
        )

        if(!unsubscribe){
            throw new ApiError(503,"Something went wrong while unsubscribing")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(201,unsubscribe,"Unsubscribe channel successfully")
        )
    }else{
        //show subscribing option
        subscribe = await Subscription.create(
            {
                subscribe:req.user._id,
                channel : channelId
            }
        )

        if(!subscribe){
            throw new ApiError(503,"Something went wrong while subscribing")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(201,subscribe,"Subscribe channel successfully")
        )
    }
})

//controller to return subscriber list of a channel
const getUserChannelSubscribers=asyncHandler(async(req,res)=>{
    const{channelId} = req.params;

    //check if valid or not
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Given channel Id is inValid")
    }

    //if valid then use aggregate pipline to
    //match in the subscription model and lookup it to user

    const subscribe = await Subscription.aggregate([
        {
            //first match the channel id
            $match:{
                channel : new mongoose.Types.ObjectId(channelId.trim())
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribers" //a new field named "subscribers" will be attched to the Subscription model
            }
        },
        //dont use unwind as it will have entire documents of the Subscription schema
        {
            $project:{
                subscribers:{
                    username:1,
                    avatar:1,
                    fullName:1
                }

            }
        }
    ])

    if(!subscribe){
        throw new ApiError(400,"Something went wrong will fetching subscriber list")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,subscribe,"Subscriber list fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid Subscriber Id")
    }

    const subscribedTo = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribeToChannels"
            }
        },
        {
            $project:{
                subscribeToChannels:{
                    username:1,
                    avatar:1
                }
            }
        }
    ])

    if(!subscribedTo){
        throw new ApiError(401,"Something went wrong while fetching user subscibed channels")
    }

    return res.status(201)
    .json(
        new ApiResponse(200,subscribedTo,"Channels subscrided list fetched successfully")
    )
})

export{getUserChannelSubscribers,getSubscribedChannels,toggleSubscription}