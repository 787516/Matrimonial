import UserProfileDetail from "../models/userProfileDetailModel.js";
import MatchRequest from "../models/matchRequestModel.js";
import User from "../models/userModel.js"; // 👈 needed for gender info
import { createActivity } from "./notificationController.js"; // 👈 Import activity logger

export const getMatchFeed = async (req, res) => {
  try {

    const userId = req.user._id;

    // 1️⃣ Get current user's details
    const currentUser = await User.findById(userId);
    const currentProfile = await UserProfileDetail.findOne({ userId });

    if (!currentUser || !currentProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }
     
    // 2️⃣ Find opposite gender users with same religion
    const userGender = currentUser.gender.toLowerCase();
    const oppositeUsers = await User.find({
      _id: { $ne: userId },
      gender: userGender === "Male" ? "Female" : "Male",
    }).select("_id firstName lastName gender email");

    const oppositeUserIds = oppositeUsers.map((u) => u._id);

    // 3️⃣ Find their profile details (based on religion, visibility, etc.)
    const suggestions = await UserProfileDetail.find({
      userId: { $in: oppositeUserIds },
      religion: currentProfile.religion,
      // isProfileVisible: true,
    })
      .populate("userId", "firstName lastName gender email")
      .limit(10);

    res.json({ message: "Match suggestions fetched", suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2️⃣ Send Interest
export const sendInterest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    const existingRequest = await MatchRequest.findOne({ senderId, receiverId, type: "Interest" });
    if (existingRequest) return res.status(400).json({ message: "Interest already sent" });

    const newRequest = await MatchRequest.create({ senderId, receiverId, type: "Interest" });
    
    // ✅ Log activity for receiver
    const senderName = req.user.firstName + " " + req.user.lastName;
    await createActivity(
      receiverId,
      senderId,
      "InterestSent",
      `${senderName} sent you an interest request`,
      newRequest._id,
      { requestType: "Interest" }
    );

    res.status(201).json({ message: "Interest sent successfully", request: newRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3️⃣ Chat Request
export const sendChatRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    const chatReq = await MatchRequest.create({ senderId, receiverId, type: "Chat" });
    
    // ✅ Log activity for receiver
    const senderName = req.user.firstName + " " + req.user.lastName;
    await createActivity(
      receiverId,
      senderId,
      "ChatRequestReceived",
      `${senderName} sent you a chat request`,
      chatReq._id,
      { requestType: "Chat" }
    );

    res.status(201).json({ message: "Chat request sent", chatReq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4️⃣ View Profile
export const viewProfile = async (req, res) => {
  
  try {
    const { id } = req.params;
    const viewerId = req.user._id;

    const profile = await UserProfileDetail.findOne({ userId: id }).populate("userId", "firstName lastName gender email");
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // ✅ Log activity for profile owner
    const viewerName = req.user.firstName + " " + req.user.lastName;
    await createActivity(
      id,
      viewerId,
      "ProfileViewed",
      `${viewerName} viewed your profile`
    );

    res.json({ message: "Profile viewed successfully", profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const filterMatches = async (req, res) => {
  //console.log(" Applied Filters ");
  try {
    const filters = req.query;
    const query = {};

    // Helper function to check if a value is valid (not empty)
    const isValid = (val) => val && val.trim() !== "";

    // Case-insensitive partial search for flexible filtering
    if (isValid(filters.education))
      query.education = { $regex: filters.education.trim(), $options: "i" };

    if (isValid(filters.religion))
      query.religion = { $regex: `^${filters.religion.trim()}$`, $options: "i" };

    if (isValid(filters.salary))
      query.salary = { $regex: filters.salary.trim(), $options: "i" };

    if (isValid(filters.motherTongue))
      query.motherTongue = { $regex: filters.motherTongue.trim(), $options: "i" };

    if (isValid(filters.location))
      query.location = { $regex: filters.location.trim(), $options: "i" };

    // Only show visible profiles
    query.isProfileVisible = true;

   // console.log(" Applied Filters =>", query);

    const matches = await UserProfileDetail.find(query)
      .populate("userId", "firstName lastName gender email");

    if (!matches.length) {
      return res.status(404).json({
        message: "No matching profiles found",
        matches: [],
      });
    }

    res.json({
      message: "Filtered matches fetched",
      total: matches.length,
      matches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Accept / Reject / Block Interest or Chat Request
export const handleRequestAction = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // "Accepted" | "Rejected" | "Blocked"
    const userId = req.user._id; // receiver

    // Validate action
    const validActions = ["Accepted", "Rejected", "Blocked"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid action type" });
    }

    // Find request
    const matchRequest = await MatchRequest.findById(requestId);
    if (!matchRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only receiver can act
    if (matchRequest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this request" });
    }

    // Update status
    matchRequest.status = action;
    await matchRequest.save();

    // ✅ Log activity for sender if accepted
    if (action === "Accepted") {
      const receiverName = req.user.firstName + " " + req.user.lastName;
      const activityType = matchRequest.type === "Interest" ? "InterestAccepted" : "ChatRequestAccepted";
      const message = matchRequest.type === "Interest" 
        ? `${receiverName} accepted your interest request` 
        : `${receiverName} accepted your chat request`;
      
      await createActivity(
        matchRequest.senderId,
        userId,
        activityType,
        message,
        matchRequest._id,
        { requestType: matchRequest.type }
      );
    }

    res.json({
      message: `Request ${action.toLowerCase()} successfully.`,
      request: matchRequest,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await MatchRequest.find({
      receiverId: userId,
      status: "Pending",
    }).populate("senderId", "firstName lastName email gender");

    res.json({ message: "Pending requests fetched", total: requests.length, requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const getDashboardStats = async (req, res) => {
  console.log(" Fetching Dashboard Stats ");
  try {
    const userId = req.user._id;

    // ------------------------------
    // RECEIVED REQUESTS (others → you)
    // ------------------------------
    const receivedPending = await MatchRequest.countDocuments({
      receiverId: userId,
      status: "Pending",
    });

    const receivedAccepted = await MatchRequest.countDocuments({
      receiverId: userId,
      status: "Accepted",
    });

    const receivedRejected = await MatchRequest.countDocuments({
      receiverId: userId,
      status: "Rejected",
    });

    // ------------------------------
    // SENT REQUESTS (you → others)
    // ------------------------------
    const sentPending = await MatchRequest.countDocuments({
      senderId: userId,
      status: "Pending",
    });

    const sentAccepted = await MatchRequest.countDocuments({
      senderId: userId,
      status: "Accepted",
    });

    const sentRejected = await MatchRequest.countDocuments({
      senderId: userId,
      status: "Rejected",
    });

    res.json({
      message: "Dashboard stats fetched",

      received: {
        accepted: receivedAccepted,
        pending: receivedPending,
        rejected: receivedRejected,
      },

      sent: {
        acceptedByOthers: sentAccepted,
        pending: sentPending,
        declinedByOthers: sentRejected,
      },
    });

    console.log(" Dashboard stats sent ", res.data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getDashboardRequestList = async (req, res) => {
  try {
    const userId = req.user._id;

    let { type, status } = req.query;

    if (!type || !status) {
      return res.status(400).json({ message: "type and status are required" });
    }

    let filter = { status };

    // RECEIVED REQUESTS (others → you)
    if (type === "received") {
      filter.receiverId = userId;
    }

    // SENT REQUESTS (you → others)
    else if (type === "sent") {
      filter.senderId = userId;
    }

    else {
      return res.status(400).json({ message: "Invalid type" });
    }

    // Find requests with user details
    const requests = await MatchRequest.find(filter)
      .populate("senderId", "firstName lastName email gender")
      .populate("receiverId", "firstName lastName email gender");

    // Format final user list
    const formatted = [];

    for (const reqItem of requests) {
      const otherUser =
        type === "received" ? reqItem.senderId : reqItem.receiverId;

      // Fetch profile photo
      const photo = await UserPhotoGallery.findOne({
        userProfileId: otherUser._id,
        isProfilePhoto: true
      });

      formatted.push({
        _id: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        email: otherUser.email,
        gender: otherUser.gender,
        profilePhoto: photo ? photo.imageUrl : null,
        status: reqItem.status,
        requestId: reqItem._id,
      });
    }

    res.json({
      message: "List fetched",
      total: formatted.length,
      users: formatted,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
