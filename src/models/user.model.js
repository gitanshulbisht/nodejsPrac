import mogoose, {Schema} from "mongoose";

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type:String,
        required:true,
        unique: true,
        lowercase: true,
        trim: true,
        
    },
    fullname:{
        type:String,
        required:true,
        lowercase: true,
        trim: true,
        
    },
    avatar: {
        type: String, //cloudinary URL
        required: true
    },
    coverImage:{
        type:String, //cloudinary URL
    },
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required:[true, "Password is required"]
    }
},{timestamps:true})

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.Schema.methods.generateAccessToken = function(){
    return jwt.sign( {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SCERET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
   
}
userSchema.methods.generateRefreshtoken =function(){
    return jwt.sign( {
        _id: this._id,
        
    },
    process.env.ACCESS_TOKEN_SCERET,{
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    })
}
export const User = mongoose.model("User", userSchema)