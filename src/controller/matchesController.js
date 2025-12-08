import UserProfileDetail from "../models/userProfileDetailModel.js";
import MatchRequest from "../models/matchRequestModel.js";
import User from "../models/userModel.js";
import { createActivity } from "./notificationController.js";
import UserPartnerPreference from "../models/userPartnerPreferenceModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";

// 🔹 Helper: safe string compare (already used below but let's make sure it's defined once)
const equalsCI = (a, b) =>
  a?.trim()?.toLowerCase() === b?.trim()?.toLowerCase();

// 🔹 Helper: get all userIds you already interacted with (sent/received)
const getInteractionExcludedUserIds = async (userId) => {
  const interactions = await MatchRequest.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
    status: { $in: ["Pending", "Accepted", "Rejected", "Blocked"] },
  })
    .select("senderId receiverId")
    .lean();

  const excluded = new Set();

  interactions.forEach((req) => {
    const s = req.senderId?.toString();
    const r = req.receiverId?.toString();
    const u = userId?.toString();

    if (s === u && r) excluded.add(r);
    else if (r === u && s) excluded.add(s);
  });

  return Array.from(excluded);
};

// 🔹 Helper: check if there is any 'Blocked' relationship between 2 users
const hasBlockedBetween = async (userAId, userBId) => {
  const blocked = await MatchRequest.findOne({
    status: "Blocked",
    $or: [
      { senderId: userAId, receiverId: userBId },
      { senderId: userBId, receiverId: userAId },
    ],
  }).lean();

  return !!blocked;
};

//get match feed
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

    // 2️⃣ Exclude: self + ALL interacted users (sent/received/blocked/rejected)
    const excludedUserIds = await getInteractionExcludedUserIds(userId);
    const excludedSet = new Set([
      userId.toString(),
      ...excludedUserIds.map((id) => id.toString()),
    ]);

    // 3️⃣ Fetch opposite gender profiles + JOIN user
    const allOppProfiles = await UserProfileDetail.find({
      isProfileVisible: true,
      // don't show self or already interacted users
      userId: { $nin: Array.from(excludedSet) },
    })
      .populate("userId", "firstName lastName email gender registrationId")
      .lean();

    // 4️⃣ Filter by gender from userId (User model)
    let genderMatched = allOppProfiles.filter(
      (p) =>
        p.userId?.gender &&
        p.userId.gender.toLowerCase() === oppositeGender.toLowerCase()
    );

    // 5️⃣ Respect *other user's* partner preferences (basic fields)
    const filteredByOtherPrefs = [];
    for (const p of genderMatched) {
      const otherPref = await UserPartnerPreference.findOne({
        userProfileId: p._id,
      }).lean();

      // If they have no preference → allow
      if (!otherPref) {
        filteredByOtherPrefs.push(p);
        continue;
      }

      // If they DO have preferences → current user MUST match them
      if (
        otherPref.religion &&
        !equalsCI(currentProfile.religion, otherPref.religion)
      )
        continue;
      if (
        otherPref.motherTongue &&
        !equalsCI(currentProfile.motherTongue, otherPref.motherTongue)
      )
        continue;
      if (otherPref.city && !equalsCI(currentProfile.city, otherPref.city))
        continue;

      filteredByOtherPrefs.push(p);
    }

    // 6️⃣ Attach profilePhoto (from profile OR gallery)
    // 6️⃣ Attach flags + profile photo
    for (const p of filteredByOtherPrefs) {
      const otherUserId = p.userId?._id?.toString();

      // A. Profile Photo
      if (!p.profilePhoto) {
        const gallery = await UserPhotoGallery.find({
          userProfileId: p._id,
          isProfilePhoto: true,
        });
        p.profilePhoto = gallery?.[0]?.imageUrl || null;
      }

      // B. Has Sent Interest
      const sentInterest = await MatchRequest.findOne({
        senderId: userId,
        receiverId: otherUserId,
        type: "Interest",
        status: { $in: ["Pending", "Accepted"] },
      }).lean();

      p.hasSentInterest = !!sentInterest;

      // C. Has Received Interest
      const receivedInterest = await MatchRequest.findOne({
        senderId: otherUserId,
        receiverId: userId,
        type: "Interest",
        status: { $in: ["Pending"] },
      }).lean();

      p.hasReceivedInterest = !!receivedInterest;

      // D. Is Blocked (either way)
      const isBlocked = await MatchRequest.findOne({
        type: "Interest",
        status: "Blocked",
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      }).lean();

      p.isBlocked = !!isBlocked;
    }

    // 7️⃣ Previous matching logic (unchanged, but uses filteredByOtherPrefs)
    const used = new Set();

    let perfectMatches = [];
    const preference = await UserPartnerPreference.findOne({
      userProfileId: currentProfile._id,
    });

    if (preference) {
      perfectMatches = filteredByOtherPrefs.filter((p) => {
        return (
          (!preference.religion || equalsCI(p.religion, preference.religion)) &&
          (!preference.motherTongue ||
            equalsCI(p.motherTongue, preference.motherTongue)) &&
          (!preference.city || equalsCI(p.city, preference.city))
        );
      });

      perfectMatches.forEach((m) => used.add(m._id.toString()));
    }

    const religionMatches = filteredByOtherPrefs.filter(
      (p) =>
        !used.has(p._id.toString()) &&
        equalsCI(p.religion, currentProfile.religion)
    );
    religionMatches.forEach((m) => used.add(m._id.toString()));

    const locationMatches = filteredByOtherPrefs.filter(
      (p) =>
        !used.has(p._id.toString()) &&
        (equalsCI(p.city, currentProfile.city) ||
          equalsCI(p.state, currentProfile.state))
    );
    locationMatches.forEach((m) => used.add(m._id.toString()));

    const fallbackMatches = filteredByOtherPrefs.filter(
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

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    // ❌ Prevent sending to self
    if (senderId.toString() === receiverId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send interest to yourself" });
    }

    // ❌ Prevent sending if blocked either way
    const isBlocked = await hasBlockedBetween(senderId, receiverId);
    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "You cannot send interest to this user" });
    }

    // ❌ Prevent duplicate or reverse existing Interest (Pending / Accepted / Blocked)
    const existingRequest = await MatchRequest.findOne({
      type: "Interest",
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      status: { $in: ["Pending", "Accepted", "Blocked"] },
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Interest already exists between these users" });
    }

    // ✅ (Optional) You can also disallow resend after Rejected if you want:
    // const rejectedRequest = await MatchRequest.findOne({
    //   type: "Interest",
    //   $or: [
    //     { senderId, receiverId },
    //     { senderId: receiverId, receiverId: senderId },
    //   ],
    //   status: "Rejected",
    // });
    // if (rejectedRequest) {
    //   return res
    //     .status(400)
    //     .json({ message: "Interest was rejected earlier. You cannot resend now." });
    // }

    // ✅ Create new Interest
    const newRequest = await MatchRequest.create({
      senderId,
      receiverId,
      type: "Interest",
      // status defaults to "Pending" in model (assuming)
    });

    // ✅ Log activity for receiver
    const senderName = `${req.user.firstName || ""} ${
      req.user.lastName || ""
    }`.trim();
    await createActivity(
      receiverId,
      senderId,
      "InterestSent",
      `${senderName} sent you an interest request`,
      newRequest._id,
      { requestType: "Interest" }
    );

    res.status(201).json({
      message: "Interest sent successfully",
      request: newRequest,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3️⃣ Chat Request
export const sendChatRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send chat request to yourself" });
    }

    const isBlocked = await hasBlockedBetween(senderId, receiverId);
    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "You cannot send chat request to this user" });
    }

    // ❌ Prevent duplicate/reverse Chat requests (Pending / Accepted / Blocked)
    const existingChatReq = await MatchRequest.findOne({
      type: "Chat",
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      status: { $in: ["Pending", "Accepted", "Blocked"] },
    });

    if (existingChatReq) {
      return res
        .status(400)
        .json({ message: "Chat request already exists between these users" });
    }

    //🔐 OPTIONAL: Allow chat only if there is an accepted Interest
    const acceptedInterest = await MatchRequest.findOne({
      type: "Interest",
      status: "Accepted",
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    if (!acceptedInterest) {
      return res.status(400).json({
        message: "You can start a chat only after interest is accepted",
      });
    }

    const chatReq = await MatchRequest.create({
      senderId,
      receiverId,
      type: "Chat",
    });

    const senderName = `${req.user.firstName || ""} ${
      req.user.lastName || ""
    }`.trim();
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
    const { id } = req.params; // profile owner userId
    const viewerId = req.user._id;

    // ❌ Blocked? → don't allow viewing
    const isBlocked = await hasBlockedBetween(viewerId, id);
    if (isBlocked) {
      return res
        .status(403)
        .json({ message: "You are not allowed to view this profile" });
    }

    // Fetch viewer user details
    const viewer = await User.findById(viewerId).select("firstName lastName");
    const viewerName = viewer
      ? `${viewer.firstName} ${viewer.lastName}`
      : "Someone";

    // Fetch viewed profile
    const profile = await UserProfileDetail.findOne({ userId: id }).populate(
      "userId",
      "firstName middleName lastName gender email phone registrationId"
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Optionally you could check: if (!profile.isProfileVisible) return 403

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

// filter matches
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

    // 🔹 Exclude profiles you've already interacted with (if logged in)
    if (req.user?._id) {
      const userId = req.user._id;
      const excludedUserIds = await getInteractionExcludedUserIds(userId);
      query.userId = {
        $nin: [
          userId.toString(),
          ...excludedUserIds.map((id) => id.toString()),
        ],
      };
    }

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
};// ✅ Accept / Reject / Block / Cancel Interest or Chat Request
export const handleRequestAction = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // "Accepted" | "Rejected" | "Blocked" | "Cancelled"
    const userId = req.user._id;

    const validActions = ["Accepted", "Rejected", "Blocked", "Cancelled"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid action type" });
    }

    const matchRequest = await MatchRequest.findById(requestId);
    if (!matchRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    const isSender = matchRequest.senderId.toString() === userId.toString();
    const isReceiver = matchRequest.receiverId.toString() === userId.toString();

    // 🔥 CASE: Cancel Request → only sender can cancel
    if (action === "Cancelled") {
      if (!isSender) {
        return res.status(403).json({
          message: "Only the sender can cancel this request",
        });
      }

      // Only pending requests can be cancelled
      if (matchRequest.status !== "Pending") {
        return res.status(400).json({
          message: `Cannot cancel a request that is already ${matchRequest.status}`,
        });
      }

      matchRequest.status = "Cancelled";
      await matchRequest.save();

      return res.json({
        message: "Request cancelled successfully",
        request: matchRequest,
      });
    }

    // 🔥 Accept / Reject / Block → ONLY receiver
    if (!isReceiver) {
      return res.status(403).json({
        message: "Not authorized to modify this request",
      });
    }

    // Block allowed anytime
    if (action !== "Blocked" && matchRequest.status !== "Pending") {
      return res.status(400).json({
        message: `Cannot ${action.toLowerCase()} a request that is already ${matchRequest.status}`,
      });
    }

    matchRequest.status = action;
    await matchRequest.save();

    return res.json({
      message: `Request ${action.toLowerCase()} successfully`,
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
