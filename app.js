import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();
const port = 1818;
import connectDB from "./src/config/dataBase.js";
import authRoute from "./src/routes/authRoute.js";
import profileRoute from "./src/routes/profileRoutes.js";
import matchesRoute from "./src/routes/matchesRoutes.js";
import settingRoute from "./src/routes/settingRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import subscriptionRoutes from "./src/routes/subscriptionRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js"; // ✅ Import notification routes
import { initializeSocket } from "./src/utils/socketServer.js";
import http from "http";
import cors from "cors";

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],// allow your React app
    credentials: true,                // allow cookies / headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // allowed HTTP methods
  })
);

app.use(express.json());
const server = http.createServer(app);
// Initialize Socket.IO server
initializeSocket(server);

// ✅ Use routes
app.use("/api/auth", authRoute);
app.use("/api/profile", profileRoute);
app.use("/api/matches", matchesRoute);
app.use("/api/settings", settingRoute);
app.use("/api/chat", chatRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/notifications", notificationRoutes); // ✅ Register notification routes

app.get('/', (req, res) => {
    res.send('Welcome to Matrimonial Backend!');
});

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  });