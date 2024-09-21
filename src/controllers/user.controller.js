import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) =>
{
    console.log("In generateAccessAndRefreshTokens")
    console.log(userId)
    
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave :false})

        return {accessToken, refreshToken}
    
}

const registerUser = asyncHandler( async (req,res) => {
    

    // get user details from frontend
    const {fullName, email, username, password } = req.body
    //console.log("email:", email)
    
    // validation - not empty
    if([fullName,email,username,password].some((field) => field?.trim() === "") ){
        throw new ApiError(400,"All fields are required.")
    }
    
    // check if user already exists: username, email
   const exsitedUser= await User.findOne({
        $or: [{ username }, { email }]
    })
    
    // check if user already exists: username, email
    if(exsitedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //console.log(avatarLocalPath)
    //console.log(coverImageLocalPath)
    if( !avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)
    //console.log(avatar)
    //console.log(coverImage)    
    if(!avatar){
        throw new ApiError(400,"Avatar field is required")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if(!createdUser){
        throw new ApiError("something went wrong while registering the user")
    }
    
    // return res
    //console.log(res)
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )

})

const loginUser = asyncHandler(async(req, res) =>{
 // req body - > data
 const {email, username, password} = req.body
 //username or email
 if(!username && !email){
    throw new ApiError(400, "username or email is required")
 }

 //Here is an alternative of above code based on logic discuss
// if (!(username ||email)){
    //throw new Api Error ( 400, "user name or email is required")
//}


//find the user
const user = await User.findOne({
    $or:[{username}, {email}]
})

if (!user){
    throw new ApiError (404, "User does not exsist")
}
//password check
const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid){
    throw new ApiError(404,"Invalid user credentials")
}
//access and refresh token
 const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

//send cookie
const loggedInUser = await User.findById(user.id).select("-password -refreshToken")

const options = {
    httpOnly: true,
    secure :true
}

return res.status(200)
.cookie("accessToken", accessToken,options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken,
            refreshToken
        },
        "User logged in Successfully"
    )
)


})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{},"User logged Out"))
    
})
    
const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refresh.Token

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    //verify incoming token from client
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        //find user using the _id and its information in db
        const user = await User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }


})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    user.isPasswordCorrect = await user.isPaaswordCorrect(oldPassword)
    
    if(!isPaaswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .statuts(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res.status(200)
    .json(2000,req.user, "currrent user fetched successfully")
})

const updateAcountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} =req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar fiel is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        }
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
        const coverImageLocalPath = req.file?.path
    
        if(!coverImageLocalPath){
            throw new ApiError(400,"User cover image field is missing")
        }
    
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
        if(!coverImage.url){
            throw new ApiError(400,"Error while uploading on coverImage")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage:avatar.url
                }
            },
            {new: true}
    
        ).serlect("-password")

        return res
        .status(200)
        .json (
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAcountDetails,
    updateUserAvatar,
    updateUserCoverImage

}