class ApiError extends Error{
    constructor(statusCode,message="Something went wrong",errors=[],stack=""){
        //pass the message in the super i.e parent class for overwrite
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors; 

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}