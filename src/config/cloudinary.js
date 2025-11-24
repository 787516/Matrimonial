import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dhhhbtzpu",
  api_key: process.env.CLOUDINARY_API_KEY || "621639731496239", 
  api_secret: process.env.CLOUDINARY_API_SECRET || "D25-Ts3MJSElOe_6L9ULHQaBtEo",
});

export default cloudinary;
