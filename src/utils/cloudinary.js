import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SCERET

})

const uploadOnCloudinary = async (localFilePath) => {
    try {
            //console.log("inside uploadOnCloudinary")
            //console.log(localFilePath)
            if(!localFilePath) return null
            //upload the file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
            })
            
            //file has been uploaded successfully
            //console.log("file is uploaded on cloudinary");
            //console.log(response.url)
            //console.log(response)
            fs.unlinkSync(localFilePath)
            return response;
            
            
    }
    catch(error){
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
        //console.log("error inside uploadOnCloudinary")
    }
}

export {uploadOnCloudinary} 