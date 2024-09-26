import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const healthcheck = asyncHandler(async(req,res)=>{
    const healthCheck = {
        uptime:process.uptime(),
        message:'OK',
        responseTime:process.hrtime(),
        timestamp:Date.now()
    };
    try {
        return res
        .status(200)
        .json(
            new ApiResponse(200,healthCheck,"Health is Good")
        )
    } catch (error) {
        console.log("HealthCheck :: ",error);
        healthCheck.message=error;
        throw new ApiError(503,"Getting error in health check")
    }
})

export {healthcheck};