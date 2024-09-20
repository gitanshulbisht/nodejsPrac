import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) =>
{

    try{
        const user = await User.findById(userId)
        const acceToken = user.generateAccessToken()
        const refreshToken = user.genrateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave :false})

        return {acceToken, refreshToken}
    }catch(error){
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
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
const loggedINUser = await User.findById(user.id).select("-password -refreshToken")

const options = {
    httpOnly: true,
    secure :true
}

return res.status(200)
.cookie("accessToken", accessToken,options)
.cookie("refreshToken", refreshToken, options)
.json(
    newApiResponse(
        200,
        {
            user: loggedINUser, accessToken,
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
    

   
export {
    registerUser,
    loginUser,
    logoutUser
}