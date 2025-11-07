import dotenv from "dotenv";
dotenv.config(); 
import express from "express";
const app = express();
const port = 1818;
import connectDB from "./src/config/dataBase.js";
import authRoute from "./src/routes/authRoute.js";

app.use(express.json());


// ✅ Use routes
app.use("/api/auth", authRoute);
app.get('/', (req, res) => {
    res.send('Welcome to Matrimonial Backend!');
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  });