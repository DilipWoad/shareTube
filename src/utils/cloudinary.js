import {v2 as cloudinary} from 'cloudinary';

import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

//first we save the file in the server then send it to cloudinary 
// as soon as we save file in cloudinary we unlinked the file from the server ...
// this is to ensure that file reach the cloudinary

// cloudinary.uploader.upload("takes servers file path",{id:"any name"})   //CODE FROM CLOUDINARY

//so we can do is use a function that take file path as input and in that trycatch and upload it to the cloudinary

const uploadToCloudinary=async(localFilePath)=>{
    try {
        const respone = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file is upload sucessfully
        // console.log("file is uploaded in cloudinary",respone)
        // console.log(respone.url)
        fs.unlinkSync(localFilePath); //remove file from the server
        return respone;
    } catch (error) {
        //if uploading file was unsucessfull then remove the
        //locally saved file as it can be harmfull
        if(localFilePath==""){
            return null;
        }
        fs.unlinkSync(localFilePath)
        
        return null
    }
}

const deleteFromCloudinary=async(public_id,resource)=>{
    try {
        await cloudinary.uploader.destroy(public_id,{resource_type:resource});
    } catch (error) {
        console.log("Cloudinary :: deleteFromCloudinary :: ",error)
    }
}


export {uploadToCloudinary,deleteFromCloudinary};