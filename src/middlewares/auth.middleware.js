import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req,res,next)=>{
                            // from web                       from mobile
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )
        if(!user){
            throw new ApiError(401,"Invalid access Token")
        }
    
        //create a new obj 'user' in the req and give the above user obj
        //this can be use in any place as we have add ".user"
        //in the "req" if any one wants the accessTpken it can simple 
        //call req.user
    
        req.user = user;
        //move forward to next functiion
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invaid access token")
    }
})