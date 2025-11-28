import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getMatchFeed,
  sendInterest,
  sendChatRequest,
  viewProfile,
  filterMatches,
  getPendingRequests,
  handleRequestAction,
  getDashboardStats,
  getDashboardRequestList
} from "../controller/matchesController.js";

const router = express.Router();

router.get("/feed", authMiddleware, getMatchFeed);
router.post("/interest", authMiddleware, sendInterest);
router.post("/chat-request", authMiddleware, sendChatRequest);
router.get("/view/:id", authMiddleware, viewProfile);
router.get("/filter", authMiddleware, filterMatches);
// Get pending requests
router.get("/requests/pending", authMiddleware, getPendingRequests);
// Accept / Reject / Block
router.patch("/requests/:requestId", authMiddleware, handleRequestAction);

router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/Dashboard-Stat-List/requests", authMiddleware, getDashboardRequestList);



export default router;
