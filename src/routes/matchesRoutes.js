import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { subscriptionMiddleware } from "../middleware/subscriptionMiddleware.js"
import {
  getMatchFeed,
  getOppositeGenderProfiles,
  sendInterest,
  sendChatRequest,
  viewProfile,
  filterMatches,
  getPendingRequests,
  handleRequestAction,
  blockUser,
  getDashboardStats,
  getDashboardRequestList
} from "../controller/matchesController.js";

const router = express.Router();

router.get("/feed", authMiddleware, getMatchFeed);
router.get("/opposite-gender", authMiddleware, getOppositeGenderProfiles);

router.post("/interest", authMiddleware, subscriptionMiddleware, sendInterest);
router.post("/chat-request", authMiddleware,subscriptionMiddleware, sendChatRequest);
router.get("/view/:id", authMiddleware,subscriptionMiddleware, viewProfile);
router.get("/filter", authMiddleware, filterMatches);
// Get pending requests
router.get("/requests/pending", authMiddleware, getPendingRequests);
// Accept / Reject / Block
router.patch("/requests/:requestId", authMiddleware, handleRequestAction);
//only block
router.patch("/matches/block-user/:userId", authMiddleware, blockUser);

router.get("/dashboard-stats", authMiddleware, getDashboardStats);
router.get("/Dashboard-Stat-List/requests", authMiddleware, getDashboardRequestList);



export default router;
