import jwt from "jsonwebtoken";

export const generateAccessToken = (id, role) => {
  return jwt.sign({ _id: id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
  
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ _id: id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};
