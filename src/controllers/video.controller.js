import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary.js";
import {Video} from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";

const publishAvideo = asyncHandler(async(req,res)=>{
    //we will take video and thumbnail from multer that 
    const {title,description} = req.body; //we will take title and description from body

    if(!title|| title?.trim()===""){
        throw new ApiError(400,"Title can't be empty")
    }

    if(!description || description?.trim()===""){
        throw new ApiError(400,"description can't be empty")
    }


    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(400,"Video file does not exists")
    }

    //upload in the cloudinary
    const videoFile = await uploadToCloudinary(videoLocalPath);
    const thumbnail= await uploadToCloudinary(thumbnailLocalPath)

    // console.log(videoFile)
    // console.log(thumbnail)
    if(!videoFile){
        throw new ApiError(500,"Something went wrong while uploading the video file to cloudinry")
    }

    //now video is uploaded in cloudinary ->cloudiary will give a respone whih has url
    //now create a video respone in Video schema in mongodB

    const video = await Video.create({
        videoFile:{
            public_id:videoFile?.public_id,
            url:videoFile?.url
        },
        thumbnail:{
            public_id:thumbnail?.public_id,
            url:thumbnail?.url || ""
        },
        title,
        description,
        owner:req.user._id,
        duration:videoFile?.duration
    })

    if(!video){
        throw new ApiError(500,"Something went wrong while storing the video in database")
    }
    //now stored in the database
    // send response

    return res
    .status(200)
    .json(
        new ApiResponse(200,video,"Video uploaded sucessfully")
    )
})


const updateVideo =asyncHandler(async(req,res)=>{
    //for update a video
    //1) get video id from url i.e params
    //2) get title,descriptions from body
    //3) get thumbnail from .file.path by multer
    //4) check if video ID prsent in the database
    //5) if present set the new video url
    //6) set the thumbnail
    //7) set title,descriotion

    const {videoId} = req.params; //put the same name in route
    const {title,description} = req.body;
    const newThumbnail = req.file?.path;

    if(!isValidObjectId(videoId)){
        throw new ApiError(200,"Given video Id is Invalid")
    }
     
    const videoInDatabase = await Video.findOne(
        {
            _id:videoId
        }
    )

    if(!videoInDatabase){
        throw new ApiError(200,"Video does not exists")
    }

    //check if its the owner or not
    if(videoInDatabase?.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"You don't have permission to do this action")
    }
    //check the given fields
    if (
        [title, description,newThumbnail].some(
          (eachField) => eachField?.trim() === ""
        )
      ) {
        throw new ApiError(400, "title,description and thumbanail fields are required");
    }

    //if thumbnail given delete previous thumbnail 
        await deleteFromCloudinary(videoInDatabase.thumbnail?.public_id,'image') //videoInDatabase is the obj in which all tile,descr,videofile etc prsent
        //now deleted 
        //now upload the new Thumnail

        const thumbnailUploadOnCloudinary = await uploadToCloudinary(newThumbnail);

        if(!thumbnailUploadOnCloudinary){
            throw new ApiError(400,"Something went wrong while uploading thumbnail")
        }
        
    const updatedVideoDetails = await Video.findByIdAndUpdate(
        videoId,
        {
            title,
            description,
            thumbnail:{
                public_id:thumbnailUploadOnCloudinary.public_id,
                url:thumbnailUploadOnCloudinary?.url || ""
            }
        },
        {
            new:true
        }
    )

    if(!updatedVideoDetails){
        throw new ApiError(500,"Something went wrong while updating the video details")
    }
    
    return res.status(201).json( new ApiResponse(201,updatedVideoDetails,"Video details updated successfully"))
})

const getVideoById = asyncHandler(async(req,res)=>{
    //get the videoID from url i.e params
    const {videoId} = req.params;

    //now check if videoId is empty or not
    if(!videoId || videoId.trim()===""){
        throw new ApiError(400,"No VideoID detected")
    }

    //now check in the Video schema
    const video = await Video.findById(
        {
            _id:videoId
        }
    );

    if(!video){
        throw new ApiError(400,"Video does not exists");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201,video,"Video fetch succesfully")
    )
})

const deleteVideo = asyncHandler(async(req,res)=>{
    const {videoId}=req.params;

    // if(!videoId || !videoId.trim()===""){
    //     throw new ApiError(400,"Video ID is empty or no video found for given Id")
    // }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"given Video Id is inValid")
    }

    const video = await Video.findById(
        videoId
    )
    
    if(!video){
        throw new ApiError(400,"Video does not exist in the database")
    }

    //check if it's the owner
    if(video.owner.toString()!==req.user._id.toString()){
        throw new ApiError(400,"You don't have permission to delete the video")
    }

    const {videoFile,thumbnail} = video
    await deleteFromCloudinary(videoFile.public_id,'video');
    if(!thumbnail.public_id || thumbnail.public_id.trim()==="" || thumbnail.public_id===""){

    }else{
        await deleteFromCloudinary(thumbnail.public_id,'image');
    }
    
    await Video.findByIdAndDelete({
        _id:videoId
    })

    return res
    .status(201)
    .json(
        new ApiResponse(200,{},"Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Given video Id is inValid")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(400,"Video does not exist")
    }

    //check for owner
    if(video.owner.toString()!== req.user._id.toString()){
        throw new ApiError(400,"You don't have permission to do given action")
    }

    //switch the toggle
    video.isPublished = !video.isPublished;

    //save the changes without validating the whole schema as we are changeing only one field
    await video.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(201,video,"Video toggled Successfully")
    )
})

const getAllVideos = asyncHandler(async(req,res)=>{
    const {page=1, limit=10, query, sortBy, sortType=1, userId} = req.query
    //userId is for if searching a particular user
    //check if that user exist or not
    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(400,"User does not exists")
    }

    //now use aggregation pipeline to match to owner
    //then base on the search query find title and descripiton similar to it
    //sort them by the created time
    //show the given video according to limit

    const getAllVideosAggregate = await Video.aggregate(
        [
            {
                $match:{
                    videoOwner: new mongoose.Types.ObjectId(userId),
                    $or:[
                        {title:{$regex:query,$options:'i'}},
                        {description:{$regex:query,$options:'i'}}
                    ]
                }
            },
            //sort them
            {
                $sort:{
                    [sortBy]:sortType           //sortType =1 means it will sort it in asecding order
                }
            },
            //limit
            {
                $limit:parseInt(limit)
            },
            //paginate
            {
                $skip: (page-1)*limit
            }
        ]
    )

    //now aggregate the page
    Video.aggregatePaginate(getAllVideosAggregate,{page,limit})
    .then((result)=>{
        return res
        .status(201)
        .json(
            new ApiResponse(200,result,"Fetched Video sucessfully")
        )
    })
    .catch((error)=>{
        console.log("Something went wrong while Fetching all the videos ",error)
        throw error
    })
})

export{publishAvideo,updateVideo,getVideoById,deleteVideo,togglePublishStatus,getAllVideos}