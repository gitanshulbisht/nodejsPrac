const asynHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).
        catch((err) => next(err))
    }
}


export { asynHandler }


//const asyncHandler = () =>{}
//const aysncHandler = (func) => () => {}  Higher order functions - functions that can take other fucntions as input and pass it to the function
//const asynHandler = (func) => async() => {}

/*
const asyncHandler = (fn) = > async (req, res, next) => {
    try{
        await fn(req, res, next)
    } catch( error ){
        res.status(err.code || 500).json({
            success:false,
            messsage: err.messsage
        })
    }
}*/