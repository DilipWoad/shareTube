import mongoose, { isValidObjectId, plugin } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async(req,res)=>{
    const {name,description} = req.body;

    if(!name || name.trim()==="" || !description || description.trim()===""){
        throw new ApiError(400,"Name and description of the playlist is required")
    }

    //create document
    const playlist = await Playlist.create({
        name,
        description,
        owner:req.user._id
    })

    if(!playlist){
        throw new ApiError(500,"Something went wrong while creating the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(201,playlist,"Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    //find in user database does this userId exists
    const user = await User.findById(userId);
    if(!user){
        throw new ApiError(400,"User does not exists")
    }

    //find the user playList match in PlayList owner with the given id
    const playlist = await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(user._id)
            }
        },//matched now get all the videos in the playlist
        {
            $lookup:{
                from:"videos", //video schema
                localField:"video", //current feild in playlist
                foreignField:"_id", //video schema _id which will be same to video feild in playlist
                as:"videosInPlaylist"  //left outer join in the playlist table 
            }
        },//now add the videosInPlaylist the first pos array obj which has the videos of the playlist
        {
            $addFields:{
                videoPlaylist:{
                    $first:"$videosInPlaylist"//it take the first pos obj which has the result from lookup
                }
            }
        }
    ])

    if(!playlist){
        throw new ApiError(500,"Somthing went wrong while fetching users playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,playlist,"Users playlist fetched succcessfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist Id")
    }

    try {
        //find the playist with the given id
        const playlist = await Playlist.findById({
            _id:playlistId
        })
    
        if(!playlist){
            throw new ApiError(400,"Playlist does not exists")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(201,playlist,"Playlist fetched successfully")
        )
    } catch (error) {
        console.log("PlaylistController ::getPlaylistById :: ",error)
        throw new ApiError(500,"Somthing went wrong while fething the playlist")
    }
    
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid playlist or video Id")
    }

    //find the playlist obj in database
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400,"Playlist does not exists")
    }

    //check if you are the owner of the playlist or not
    if(playlist.owner?.toString() !== req.user._id?.toString()){
        throw new ApiError(400,"You have permission to add video to the playlist")
    }
    //find the video obj in database
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video does not exists");
    }

    //check if video already exist in playlist
    if(playlist.video.includes(videoId)){
        throw new ApiError(400,"Video already exist in the playlist")
    }
    
    //now update the playlist

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                video:videoId
            }
        },
        {
            new:true
        }
    )

    if(!addVideoToPlaylist){
        throw new ApiError(500,"Somthing went wring while adding video to the playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,addVideoToPlaylist,"Video added to the playlist Successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid playlist or video Id");
    }

    //find the playlist in database
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400,"Playlist does not exists")
    }
    //check you are the owner
    if(playlist.owner?.toString() !== req.user._id?.toString()){
        throw new ApiError(400,"Ypu dont have permission to remove the video from playlist")
    }

    //check if video exist
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video does not exists")
    }
    //check if video is present in the playlist obj->video property

    let videoRemovedFromPlaylist;
    if(!playlist.video.includes(videoId)){
        throw new ApiError(400,"Video is not present in the Playlist")
    }else{
        //if present in the playlist remove it
        videoRemovedFromPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pop:{
                    video:videoId
                }
            },
            {
                new :true
            }
        )

        if(!videoRemovedFromPlaylist){
            throw new ApiError(500,"Somthing went wrong while removing video from playlist")
        }
    }

    return res
    .status(200)
    .json(
        new ApiResponse(201,videoRemovedFromPlaylist,"Video remved from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist Id")
    }

    //check in db
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400,"Playlist does not exists")
    }

    //if exists check if you are the owner of that playlist
    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"You dont have permission to delete the playlist")
    }

    //if owner then delete the playlist
    const deletedPlaylist = await Playlist.deleteOne(
       { _id:playlistId}
    )

    if(!deletedPlaylist){
        throw new ApiError(500,"Something went wrong while deleting the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(201,deletedPlaylist,"Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist Id")
    }

    if(!name || name.trim()==="" || !description || description.trim()===""){
        throw new ApiError(400,"Name and descripiton cant be empty")
    }

    //find in db
    try {
        const playlist = await Playlist.findById(playlistId);
    
        if(!playlist){
            throw new ApiError(400,"Playlist does not exists")
        }
    
        //update the details
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set:{
                    name,
                    description
                }
            },
            {
                new:true
            }
        )
        if(!updatedPlaylist){
            throw new ApiError(500,"Something went wrong while updating the playlist")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(201,updatedPlaylist,"Playlist updated Successfully")
        )
    } catch (error) {
       console.log("PlaylistController :: updatePlaylist :: ",error);
       throw new ApiError(503,"Something went wrong while updating the playlist")
    }
})
export {createPlaylist,getUserPlaylists,getPlaylistById,addVideoToPlaylist,removeVideoFromPlaylist,deletePlaylist,updatePlaylist}