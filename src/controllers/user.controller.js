import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({
      validateBeforeSave: false,
    });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //we get the user data from frontend ->can be json,from url,etc
  //check if any data is empty aur it is requird and not given
  //also check for is user already exists
  //get file -> avatar and coverImage
  //check if file is given or not
  //get the file and store it in the cloudinary
  //cloudinary gives url of file
  //check is url is store in cloudinary
  // create user obj - create entry in database
  //remove password data and refresh token from response from db
  //now we will send all the data like email,username,url to frontend dev
  //now send the response

  //1) get the information from frontend and get files from multer as a middleware
  const { email, username, password, fullName } = req.body;
  // console.log("email : ",email)

  //2) validate if any fields are empty
  if (
    [email, username, password, fullName].some(
      (eachField) => eachField?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3) Check if the user is present in the Database
  const userExists = await User.findOne({
    //check username or email is existed,if existed throw error
    $or: [{ username }, { email }],
  });
  if (userExists) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //4) request the file uploaded by the multer as multer gives a body like function which
  //contains all the file -> it is {".files"}
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImgLocalPath = req.files?.coverImage[0]?.path;
  let coverImgLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImgLocalPath = req.files.coverImage[0].path;
  } else {
    coverImgLocalPath = "";
  } // IMPORTANT!!!

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //5) Now upload the file in the cloudinary,if coverImgLocalPath is not present
  //just give a " " in the cloudinary
  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImgLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6) Create an object and send it to database
  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  //7) check in the "User" database and check if the above "user" has been entered in database
  //if obj stored in db it has an "_id" given my monogoDb
  //Now we can remove the password and refreshToken for sending the response to the frontend

  const dataForFrontend = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //8) Final check if data is present to send the requsting Frontend
  if (!dataForFrontend) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, dataForFrontend, "User Register Sucessfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req from body -> get email,username and password
  //check if required feilds are not empty
  //check is username or email already exist
  //validate password
  //check password and check it with bycrypt methods
  //if all good generate access and refresh token
  //also set it in the cookies

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(400, "User does not exists");
  }

  if (!password) {
    throw new ApiError(400, "password is required");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    //By this options in cookie,cookies can be only be access and modified by the server
    httpsOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          //user obj contain : {{},"",""} this is send to frontend
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //to logout the user you need current user accessToken
  //get accessToken from the cookies
  //cookies can be taken from
  //cookies from mobile is taken from header
  //header sends Authorization: bearer <accessToken>

  //now the middleware has given us an obj which contain JWT obj->like id,accessToken
  //we can use req.user
  //Now we can get the accessToken from it

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  //to make sure only server can read and update cookies
  const options = {
    secure: true,
    httpOnly: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {
          //user obj contain : {{},"",""} this is send to frontend
        },
        "User logout Successfully"
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingToken) {
    throw new ApiError(400, "unauthorized request");
  }

  //get the decoded token check jwt web to sample
  try {
    const decodedToken = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or Invalid");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //verify oldPassword with password in the database
  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, "OldPassword or newPassword can't be empty");
  }

  const user = await User.findById(req.user?._id);
  const corretPassword = await user.isPasswordCorrect(oldPassword);

  if (!corretPassword) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  //now save the database
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User password changed sucessfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //this is the new avatar given by user

  if (!avatarLocalPath) {
    //if not given the file
    throw new ApiError(400, "Avatar file does not exist");
  }

  //if get the file upload to cloudinary
  const avatar = await uploadToCloudinary(avatarLocalPath);
  //now to check avatar is uploaded to cloudinary the respone by cloudinary conatains a url obj

  if (!avatar.url) {
    throw new ApiError(500, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //get the coverImg
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image does not exists");
  }

  //upload to cloudinary
  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params

  if(!username?.trim()){
      throw new ApiError(400,"username is missing")
  }

  const channel = await User.aggregate(
    [
      {
        $match:{
          username:username?.toLowerCase()
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",
          as:"subscribers"
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedTo"
        }
      },
      {
        $addFields:{
          subscriberCount:{
            $size:"$subscribers"
          },
          channelSubscribedToCount:{
            $size:"$subscribedTo"
          },
          isSubscribed:{
            $cond:{
              if:{$in:[req.user?._id,"$subscribers.subscriber"]},
              then:true,
              else:false
            }
          }
        }
      },
      {
        $project:{
          fullName:1,
          username:1,
          subscriberCount:1,
          channelSubscribedToCount:1,
          isSubscribed:1,
          avatar:1,
          coverImage:1,
          email:1
        }
      }
    ]
  )

  if(!channel?.length){
    throw new ApiError(404,"Channel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200,channel[0],"User Channel fetched Successfully")
  )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate(
    [
      {
        $match:{
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup:{
          from:"videos",//from which table u have to join the document to the user
          localField:"watchHistory",//this is the field in which we have to store videos
          foreignField:"_id", //the field we want to store in watchHistory
          as:"watchHistory",
          pipeline:[
            {
              $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                  {
                    $project:{
                      fullName:1,
                      username:1,
                      avatar:1
                    }
                  }
                ]
              }
            },
            {
              $addFields:{
                //create a new filed and *store the first index of the
                //output of above pipeline
                owner:{
                  $first: "$owner" //[0] of owner in* the videos model
                  //as in 0 index we have send the needed info like 
                  //username,avatar,fullname that what have project in the above pipeline
                  //so the index 1 will have all the user fileds but we dont want it
                  //to make frontend life easy
                }
              }
            }
          ]
        }
      }
    ]
  )

  return res
  .status(200)
  .json(
    new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully")
  )
  //
})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  getCurrentUser,
  changeCurrentPassword,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
//