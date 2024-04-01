import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

// get this code from cloudinary getting started
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

export const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,
        {resource_type: "auto"});
        // this clear the local files after uploading
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

export const deleteOnCloudinary = async (public_id, resource_type="image") => {
    try {
        if(!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
        // console.log("delete result", result);
    } catch (error) {
        console.log("delete on cloudinary failed", error);
        // throw new Error(404, "delete on cloudinary failed")
        return error;
    }
};