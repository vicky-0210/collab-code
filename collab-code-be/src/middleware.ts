import { Request,Response,NextFunction } from "express";
import  jwt  from "jsonwebtoken";
const JWT_PASS = process.env.JWT_PASS;
if (!JWT_PASS) {
    throw new Error('JWT_PASS environment variable is not defined');
}
export const userMiddleware = (req:Request,res:Response,next:NextFunction)=>{
    const header = req.headers["authorization"];
    const decoded = jwt.verify(header as string,JWT_PASS);

    if(decoded){
        //@ts-ignore
        req.userId = decoded.id;
        next()
    }else{
        res.status(403).json({
            message : "you are not logged in"
        })
    }
}