// require('dotenv').config()
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path:'./env'
});


//it returns a promise
connectDB()
.then(()=>{ //after connecting to database then we start our server
    const port = process.env.PORT || 3000;
    app.listen(port,()=>{
        console.log(`Server running at PORT : ${port}`)
    })
    app.on("error",()=>{
        console.log(`Server connection failed :: ${error}`)
        throw error
    })
}) 
.catch((error)=>{
    console.log(`Database connection failed :: connectDB promise :: ${error}`);
})






















// Another Method 
// ;(async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         //if app(i.e express didnt connect or any issue) then this will listen
//         app.on("error",()=>{
//             console.log(`Database connection :: index.js :: ${error}`)
//             throw error
//         })
//         //if all good then just listen the request
//         app.listen(process.env.PORT,()=>{
//             console.log(`Server listening at ${process.env.PORT}`)
//         })
//     } catch (error) {
//         console.log(`Database connection :: index.js :: ${error}`)
//         throw error
//     }
// })()