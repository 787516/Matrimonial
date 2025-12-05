import UserProfileDetail from "../models/userProfileDetailModel.js";
import MatchRequest from "../models/matchRequestModel.js";
import User from "../models/userModel.js"; // 👈 needed for gender info
import { createActivity } from "./notificationController.js"; // 👈 Import activity logger
import UserPartnerPreference from "../models/userPartnerPreferenceModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";

export const getMatchFeed = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Load current user + profile
    const currentUser = await User.findById(userId);
    const currentProfile = await UserProfileDetail.findOne({ userId });

    if (!currentUser || !currentProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const oppositeGender =
      currentUser.gender?.toLowerCase() === "male" ? "female" : "male";

    // 2️⃣ Fetch opposite gender profiles + JOIN: user + gallery
    const allOppProfiles = await UserProfileDetail.find({
      userId: { $ne: userId },
      isProfileVisible: true,
    })
      .populate("userId", "firstName lastName email gender registrationId ")
      .lean();

    // 3️⃣ Filter by gender from userId (User model)
    const genderMatched = allOppProfiles.filter(
      (p) => p.userId?.gender?.toLowerCase() === oppositeGender.toLowerCase()
    );

    // 4️⃣ Attach profilePhoto (from profile OR gallery)
    for (const p of genderMatched) {
      const gallery = await UserPhotoGallery.find({
        userProfileId: p._id,
        isProfilePhoto: true,
      });

      p.profilePhoto = p.profilePhoto || gallery?.[0]?.imageUrl || null;
    }

    // Continue your logic...
    const used = new Set();
    const equalsCI = (a, b) =>
      a?.trim()?.toLowerCase() === b?.trim()?.toLowerCase();

    let perfectMatches = [];
    const preference = await UserPartnerPreference.findOne({
      userProfileId: currentProfile._id,
    });

    if (preference) {
      perfectMatches = genderMatched.filter((p) => {
        return (
          (!preference.religion || equalsCI(p.religion, preference.religion)) &&
          (!preference.motherTongue ||
            equalsCI(p.motherTongue, preference.motherTongue)) &&
          (!preference.city || equalsCI(p.city, preference.city))
        );
      });

      perfectMatches.forEach((m) => used.add(m._id.toString()));
    }

    const religionMatches = genderMatched.filter(
      (p) =>
        !used.has(p._id.toString()) &&
        equalsCI(p.religion, currentProfile.religion)
    );
    religionMatches.forEach((m) => used.add(m._id.toString()));

    const locationMatches = genderMatched.filter(
      (p) =>
        !used.has(p._id.toString()) &&
        (equalsCI(p.city, currentProfile.city) ||
          equalsCI(p.state, currentProfile.state))
    );
    locationMatches.forEach((m) => used.add(m._id.toString()));

    const fallbackMatches = genderMatched.filter(
      (p) => !used.has(p._id.toString())
    );

    return res.status(200).json({
      message: "Matches fetched successfully",
      perfectMatches,
      religionMatches,
      locationMatches,
      fallbackMatches,
    });
  } catch (err) {
    console.error("MatchFeed Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 2️⃣ Send Interest
export const sendInterest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    const existingRequest = await MatchRequest.findOne({
      senderId,
      receiverId,
      type: "Interest",
    });
    if (existingRequest)
      return res.status(400).json({ message: "Interest already sent" });

    const newRequest = await MatchRequest.create({
      senderId,
      receiverId,
      type: "Interest",
    });

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

    res
      .status(201)
      .json({ message: "Interest sent successfully", request: newRequest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3️⃣ Chat Request
export const sendChatRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    const chatReq = await MatchRequest.create({
      senderId,
      receiverId,
      type: "Chat",
    });

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
// 4️⃣ View Profile
export const viewProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user._id;

    // ✅ Fetch viewer user details (FIX for undefined name)
    const viewer = await User.findById(viewerId).select("firstName lastName");
    const viewerName = viewer
      ? `${viewer.firstName} ${viewer.lastName}`
      : "Someone";

    // Fetch viewed profile
    const profile = await UserProfileDetail.findOne({ userId: id }).populate(
      "userId",
      "firstName middleName lastName gender email phone registrationId"
    );

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // ⭐ Log activity for profile owner
    await createActivity(
      id, // receiver (profile owner)
      viewerId, // sender
      "ProfileViewed",
      `${viewerName} viewed your profile`
    );

    res.json({
      message: "Profile viewed successfully",
      profile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const filterMatches = async (req, res) => {
  try {
    const {
      religion,
      caste,
      motherTongue,
      city,
      education,
      profession,
      income,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isProfileVisible: true };

    const addFilter = (field, value) => {
      if (value && value.trim() !== "") {
        query[field] = { $regex: value.trim(), $options: "i" };
      }
    };

    addFilter("religion", religion);
    addFilter("community", caste);
    addFilter("motherTongue", motherTongue);
    addFilter("city", city);
    addFilter("highestQualification", education);
    addFilter("designation", profession);
    addFilter("annualIncome", income);

    const skip = (page - 1) * limit;

    const matches = await UserProfileDetail.find(query)
      .populate("userId", "firstName lastName gender")
      .skip(skip)
      .limit(Number(limit));

    const total = await UserProfileDetail.countDocuments(query);

    res.json({
      message: "Filtered matches fetched",
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
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
      return res
        .status(403)
        .json({ message: "Not authorized to modify this request" });
    }

    // Update status
    matchRequest.status = action;
    await matchRequest.save();

    // ✅ Log activity for sender if accepted
    if (action === "Accepted") {
      const receiverName = req.user.firstName + " " + req.user.lastName;
      const activityType =
        matchRequest.type === "Interest"
          ? "InterestAccepted"
          : "ChatRequestAccepted";
      const message =
        matchRequest.type === "Interest"
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

    res.json({
      message: "Pending requests fetched",
      total: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  // console.log(" Fetching Dashboard Stats ");
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

    // console.log(" Dashboard stats sent ", res.data);
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

    // 👇 NEW: only chat requests
    if (req.query.onlyChat === "true") {
      filter.type = "Chat";
    }

    // RECEIVED REQUESTS (others → you)
    if (type === "received") {
      filter.receiverId = userId;
    }

    // SENT REQUESTS (you → others)
    else if (type === "sent") {
      filter.senderId = userId;
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    // Find requests with user details
    const requests = await MatchRequest.find(filter)
      .populate("senderId", "firstName lastName email gender registrationId")
      .populate("receiverId", "firstName lastName email gender registrationId");

    // Format final user list
    const formatted = [];

    for (const reqItem of requests) {
      const otherUser =
        type === "received" ? reqItem.senderId : reqItem.receiverId;

      // Fetch profile details (location, language, age, etc.)
      const profileDetails = await UserProfileDetail.findOne({
        userId: otherUser._id,
      }).lean();

      // Fetch profile photo
      const photo = await UserPhotoGallery.findOne({
        userProfileId: otherUser._id,
        isProfilePhoto: true,
      });

      formatted.push({
        _id: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        email: otherUser.email,
        registrationId: otherUser.registrationId,
        gender: otherUser.gender,
        profilePhoto: photo ? photo.imageUrl : null,

        maritalStatus: profileDetails?.maritalStatus || "",
        city: profileDetails?.city || "",
        state: profileDetails?.state || "",
        motherTongue: profileDetails?.motherTongue || "",
        age: profileDetails?.age || "",

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
