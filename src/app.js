import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express();

//.use() is to call middleware 
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

//to handle request from json format
app.use(express.json({limit:"16kb"}))

//to handle request from URL like -> dilip+woad or dilip-woad or dilip%20woad this are in url
//so encode it we have tool in express
app.use(express.urlencoded({extended:true,limit:"16kb"}))

//to handle file request like static files pdf,doc etc
app.use(express.static("public"))

//to acesses cookies or store from the server it is the server which acess it and store or delete
app.use(cookieParser())


//                                                   ROUTING STARTS HERE

//Now we introduce Route Here
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';
import tweetRoutes from './routes/tweet.routes.js';
import healthcheckRoutes from './routes/healthcheck.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import likeRoutes from './routes/like.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import commentRoutes from './routes/comment.routes.js';
//now do routing with a middleware as user.controller
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/videos",videoRoutes);
app.use("/api/v1/tweets",tweetRoutes);
app.use("/api/v1/healthcheck",healthcheckRoutes);
app.use("/api/v1/subscription",subscriptionRoutes);
app.use("/api/v1/dashboard",dashboardRoutes);
app.use("/api/v1/likes",likeRoutes);
app.use("/api/v1/playlist",playlistRoutes);
app.use("/api/v1/comment",commentRoutes);
export {app};