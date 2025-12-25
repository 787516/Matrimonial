import UserProfileDetail from "../models/userProfileDetailModel.js";
import MatchRequest from "../models/matchRequestModel.js";
import User from "../models/userModel.js";
import { createActivity } from "./notificationController.js";
import UserPartnerPreference from "../models/userPartnerPreferenceModel.js";
import UserPhotoGallery from "../models/userPhotoGalleryModel.js";
import ChatRoom from "../models/chatRoomModel.js";
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

export const getMatchFeed = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pagination (kept for metadata; categories preserved)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Current user + profile
    const currentUser = await User.findById(userId);
    const currentProfile = await UserProfileDetail.findOne({ userId });

    if (!currentUser || !currentProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const oppositeGender =
      currentUser.gender?.toLowerCase() === "male" ? "female" : "male";

    // Exclude users whom current user interacted with
    const excludedUserIds = await getInteractionExcludedUserIds(userId);
    const excludedSet = new Set([userId.toString(), ...excludedUserIds]);

    // 1️⃣ Load ALL valid opposite-gender profiles (NO pagination yet!)
    const allCandidates = await UserProfileDetail.find({
      isProfileVisible: true,
      userId: { $nin: Array.from(excludedSet) },
    })
      .populate("userId", "firstName lastName email gender registrationId")
      .lean();

    // Apply gender filter
    let validProfiles = allCandidates.filter(
      (p) => p.userId?.gender?.toLowerCase() === oppositeGender
    );

    // 2️⃣ Apply OTHER USER's PARTNER preference (as filter)
    const otherPrefs = await UserPartnerPreference.find({
      userProfileId: { $in: validProfiles.map((p) => p._id) },
    }).lean();

    const prefMap = {};
    otherPrefs.forEach((pref) => {
      prefMap[pref.userProfileId] = pref;
    });

    validProfiles = validProfiles.filter((p) => {
      const pref = prefMap[p._id];
      if (!pref) return true;

      if (pref.religion && !equalsCI(currentProfile.religion, pref.religion))
        return false;

      if (
        pref.motherTongue &&
        !equalsCI(currentProfile.motherTongue, pref.motherTongue)
      )
        return false;

      if (pref.city && !equalsCI(currentProfile.city, pref.city)) return false;

      return true;
    });

    // 3️⃣ Attach profile photo in ONE query
    const galleryPhotos = await UserPhotoGallery.find({
      userProfileId: { $in: validProfiles.map((p) => p._id) },
      isProfilePhoto: true,
    }).lean();

    const photoMap = {};
    galleryPhotos.forEach((g) => {
      photoMap[g.userProfileId] = g.imageUrl;
    });

    // 4️⃣ Attach interest + block flags in BULK queries
    const ids = validProfiles.map((p) => p.userId._id);

    const sent = await MatchRequest.find({
      senderId: userId,
      receiverId: { $in: ids },
      type: "Interest",
      status: { $in: ["Pending", "Accepted"] },
    });

    const received = await MatchRequest.find({
      senderId: { $in: ids },
      receiverId: userId,
      type: "Interest",
      status: "Pending",
    });

    const blocked = await MatchRequest.find({
      type: "Interest",
      status: "Blocked",
      $or: [
        { senderId: userId, receiverId: { $in: ids } },
        { senderId: { $in: ids }, receiverId: userId },
      ],
    });

    const sentSet = new Set(sent.map((x) => x.receiverId.toString()));
    const receivedSet = new Set(received.map((x) => x.senderId.toString()));
    const blockedPairs = new Set(
      blocked.map((x) => `${x.senderId.toString()}-${x.receiverId.toString()}`)
    );

    // Attach metadata & profilePhoto placeholder
    validProfiles = validProfiles.map((p) => {
      const uid = p.userId._id.toString();

      return {
        ...p,
        profilePhoto: photoMap[p._id] || p.profilePhoto || null,
        hasSentInterest: sentSet.has(uid),
        hasReceivedInterest: receivedSet.has(uid),
        isBlocked:
          blockedPairs.has(`${userId}-${uid}`) ||
          blockedPairs.has(`${uid}-${userId}`),
      };
    });

    // ---------------------------
    // 5️⃣ Scoring using CURRENT USER'S preference (age has stronger weight)
    // ---------------------------

    const preference = await UserPartnerPreference.findOne({
      userProfileId: currentProfile._id,
    });

    // Helper: age calculation
    const getAge = (dob) => {
      if (!dob) return null;
      const birth = new Date(dob);
      return Math.floor((Date.now() - birth) / (365.25 * 24 * 60 * 60 * 1000));
    };

    // Compute matchPercentage for every valid profile
    // Weight scheme (total dynamic based on which pref fields exist):
    // AGE: 35 (strong)
    // HEIGHT: 15
    // RELIGION: 20
    // CASTE: 15
    // MOTHER_TONGUE: 10
    // CITY: 10
    // STATE: 5
    // (Only increment maxScore when pref field exists)
    const scoredProfiles = validProfiles.map((p) => {
      let score = 0;
      let maxScore = 0;

      if (preference?.ageRange) {
        maxScore += 45;
        const age = getAge(p.dateOfBirth);
        if (
          age !== null &&
          age >= Number(preference.ageRange.min) &&
          age <= Number(preference.ageRange.max)
        ) {
          score += 45;
        }
      }

      if (preference?.heightRange) {
        maxScore += 15;
        const h = Number(p.height);
        if (!Number.isNaN(h) && h >= Number(preference.heightRange.min) && h <= Number(preference.heightRange.max)) {
          score += 15;
        }
      }

      if (preference?.religion) {
        maxScore += 20;
        if (equalsCI(p.religion, preference.religion)) score += 20;
      }

      if (preference?.caste) {
        maxScore += 15;
        if (equalsCI(p.caste, preference.caste)) score += 15;
      }

      if (preference?.motherTongue) {
        maxScore += 10;
        if (equalsCI(p.motherTongue, preference.motherTongue)) score += 10;
      }

      if (preference?.city) {
        maxScore += 10;
        if (equalsCI(p.city, preference.city)) score += 10;
      }

      if (preference?.state) {
        maxScore += 5;
        if (equalsCI(p.state, preference.state)) score += 5;
      }

      // Avoid division by zero
      const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;

      return {
        ...p,
        matchPercentage: percentage,
      };
    });

    // 5️⃣ Category logic (preserve categories, but use matchPercentage and sort inside)
    const used = new Set();

    // perfectMatches: those meeting your preference well (threshold 60)
    const perfectMatches = [];
    const others = [];

    scoredProfiles.forEach((p) => {
      if (p.matchPercentage >= 60) {
        perfectMatches.push(p);
        used.add(p._id.toString());
      } else {
        others.push(p);
      }
    });

    // religionMatches: same religion (and not already used)
    const religionMatches = scoredProfiles.filter(
      (p) => !used.has(p._id.toString()) && equalsCI(p.religion, currentProfile.religion)
    );

    religionMatches.forEach((m) => used.add(m._id.toString()));

    // locationMatches: same city or state (and not used)
    const locationMatches = scoredProfiles.filter(
      (p) =>
        !used.has(p._id.toString()) &&
        (equalsCI(p.city, currentProfile.city) || equalsCI(p.state, currentProfile.state))
    );
    
    locationMatches.forEach((m) => used.add(m._id.toString()));

    // fallback: everything else not used
    const fallbackMatches = scoredProfiles.filter((p) => !used.has(p._id.toString()));

    // ---------------------------
    // Sort each category by matchPercentage DESC
    // ---------------------------
    perfectMatches.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    religionMatches.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    locationMatches.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    fallbackMatches.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

    // 6️⃣ Apply pagination meta (we keep categories intact; page & totalPages returned)
    const totalProfiles = validProfiles.length;

    res.json({
      page,
      limit,
      totalProfiles,
      totalPages: Math.ceil(totalProfiles / limit),
      perfectMatches,
      religionMatches,
      locationMatches,
      fallbackMatches,
    });
  } catch (err) {
    console.error("MatchFeed Error:", err);
    res.status(500).json({ error: err.message });
  }
};


//opposite gender API
export const getOppositeGenderProfiles = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 1️⃣ Load current user
    const currentUser = await User.findById(userId);
    const oppositeGender =
      currentUser.gender?.toLowerCase() === "male" ? "female" : "male";

    // 2️⃣ Get all opposite-gender USERS
    const oppositeUserIds = await User.find({
      gender: oppositeGender,
      status: "Active", // optional: recommended
    }).distinct("_id");

    // 3️⃣ Get all opposite-gender PROFILES
    let allProfiles = await UserProfileDetail.find({
      userId: { $in: oppositeUserIds },
      isProfileVisible: true,
    })
      .populate(
        "userId",
        "firstName lastName profilePhoto gender email registrationId "
      )
      .lean();

    // 4️⃣ Remove BLOCKED users
    const blocked = await MatchRequest.find({
      status: "Blocked",
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const blockedIds = new Set();
    blocked.forEach((r) => {
      blockedIds.add(String(r.senderId));
      blockedIds.add(String(r.receiverId));
    });

    blockedIds.delete(String(userId));

    allProfiles = allProfiles.filter(
      (p) => !blockedIds.has(String(p.userId._id))
    );

    // 5️⃣ Pagination AFTER filtering
    const total = allProfiles.length;
    const profiles = allProfiles.slice(skip, skip + limit);

    // 6️⃣ Attach photos
    const gallery = await UserPhotoGallery.find({
      userProfileId: profiles.map((p) => p._id),
      isProfilePhoto: true,
    });

    const photoMap = {};
    gallery.forEach((g) => (photoMap[g.userProfileId] = g.imageUrl));

    // 7️⃣ Interest flags
    const ids = profiles.map((p) => String(p.userId._id));

    const sent = await MatchRequest.find({
      senderId: userId,
      receiverId: { $in: ids },
      type: "Interest",
    });

    const received = await MatchRequest.find({
      senderId: { $in: ids },
      receiverId: userId,
      type: "Interest",
    });

    const sentSet = new Set(sent.map((r) => String(r.receiverId)));
    const receivedSet = new Set(received.map((r) => String(r.senderId)));

    const finalProfiles = profiles.map((p) => ({
      ...p,
      profilePhoto: p.profilePhoto || photoMap[p._id] || null, // ✅ FIX
      hasSentInterest: sentSet.has(String(p.userId._id)),
      hasReceivedInterest: receivedSet.has(String(p.userId._id)),
      isBlocked: false,
    }));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      profiles: finalProfiles,
    });
  } catch (err) {
    console.error("Opposite Gender Error:", err);
    res.status(500).json({ error: err.message });
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

    const sub = req.subscription; // injected by subscriptionMiddleware

    if (!sub || !sub.planId.features.chatAllowed) {
      return res.status(403).json({
        message:
          "Your plan does not allow chat. Please upgrade your membership.",
      });
    }

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

// view profile controller
export const viewProfile = async (req, res) => {
  try {
    const { id } = req.params;        // profile being viewed
    const viewerId = req.user._id;    // logged-in user

    const subscription = req.subscription; // injected via middleware

    /* -------------------------------------------------
       🔒 BASIC SUBSCRIPTION VALIDATION
    --------------------------------------------------*/

    // ❌ No subscription
    if (!subscription || !subscription.planId) {
      return res.status(403).json({
        message: "Please upgrade your membership to view profiles.",
      });
    }

    const plan = subscription.planId;
    const { features } = plan;

    /* -------------------------------------------------
       ❌ BLOCK CHECK (safety)
    --------------------------------------------------*/
    const isBlocked = await hasBlockedBetween(viewerId, id);
    if (isBlocked) {
      return res.status(403).json({
        message: "You are not allowed to view this profile.",
      });
    }

    /* -------------------------------------------------
       ⭐ VIEW LIMIT LOGIC
    --------------------------------------------------*/

    // ⭐ PLATINUM (or unlimited plans) → skip all checks
    if (!features.unlimitedProfileViews) {
      // Fetch current count ONCE
      const viewer = await User.findById(viewerId).select("profileViewCount");

      const currentCount = viewer.profileViewCount || 0;
      const maxAllowed = features.maxProfileViews;

      // ❌ Limit reached (FREE / SILVER / GOLD)
      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          message:
            plan.name === "FREE"
              ? "You have already viewed one profile. Please upgrade your membership."
              : `You have reached your limit of ${maxAllowed} profile views. Please upgrade your membership.`,
        });
      }

      // ✅ Safe increment AFTER all checks pass
      await User.updateOne(
        { _id: viewerId },
        { $inc: { profileViewCount: 1 } }
      );
    }

    /* -------------------------------------------------
       👤 FETCH PROFILE
    --------------------------------------------------*/
    const profile = await UserProfileDetail.findOne({ userId: id }).populate(
      "userId",
      "firstName lastName gender email phone registrationId"
    );

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    /* -------------------------------------------------
       🔔 ACTIVITY LOG (optional but clean)
    --------------------------------------------------*/
    const viewerUser = await User.findById(viewerId).select(
      "firstName lastName"
    );

    await createActivity(
      id,
      viewerId,
      "ProfileViewed",
      `${viewerUser.firstName} ${viewerUser.lastName} viewed your profile`
    );

    /* -------------------------------------------------
       ✅ SUCCESS
    --------------------------------------------------*/
    return res.status(200).json({
      message: "Profile viewed successfully",
      profile,
    });
  } catch (error) {
    console.error("View profile error:", error);
    return res.status(500).json({
      message: "Something went wrong while viewing profile.",
    });
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
}; // ✅ Accept / Reject / Block / Cancel Interest or Chat Request

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
        message: `Cannot ${action.toLowerCase()} a request that is already ${
          matchRequest.status
        }`,
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

//block user
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user._id;
    const blockedUserId = req.params.userId;

    if (!blockedUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if already blocked
    const existing = await MatchRequest.findOne({
      type: "Interest",
      status: "Blocked",
      $or: [
        { senderId: blockerId, receiverId: blockedUserId },
        { senderId: blockedUserId, receiverId: blockerId },
      ],
    });

    if (existing) {
      return res.json({ message: "User already blocked", request: existing });
    }

    // Create OR update MatchRequest for blocking
    let request = await MatchRequest.findOne({
      $or: [
        { senderId: blockerId, receiverId: blockedUserId },
        { senderId: blockedUserId, receiverId: blockerId },
      ],
    });

    if (!request) {
      // Create a new block entry
      request = new MatchRequest({
        senderId: blockerId,
        receiverId: blockedUserId,
        type: "Interest",
        status: "Blocked",
      });
    } else {
      // Update existing request
      request.status = "Blocked";
    }

    await request.save();

    return res.json({
      message: "User blocked successfully",
      request,
    });
  } catch (err) {
    console.error("Block User Error:", err);
    res.status(500).json({ error: err.message });
  }
};

//unblock user

export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id; // the user performing the unblock
    const otherUserId = req.params.userId;

    if (!otherUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // find the Block record (either direction)
    const request = await MatchRequest.findOne({
      type: "Interest",
      status: "Blocked",
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    });

    if (!request) {
      return res.status(404).json({ message: "No blocked relationship found" });
    }

    // ensure the caller is a participant (extra safety)
    const isParticipant =
      String(request.senderId) === String(userId) ||
      String(request.receiverId) === String(userId);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to unblock this user" });
    }

    // Option A (recommended): mark the block as cancelled to keep history
    request.status = "Cancelled";
    await request.save();

    // Option B (alternative): remove the block record entirely
    // await MatchRequest.deleteOne({ _id: request._id });

    // optional: notify the other user
    const unblockerName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim();
    const otherIdToNotify = String(userId) === String(request.senderId)
      ? request.receiverId
      : request.senderId;

    await createActivity(
      otherIdToNotify,
      userId,
      "UserUnblocked",
      `${unblockerName} unblocked you`,
      request._id,
      { requestType: "Interest" }
    );

    return res.json({
      message: "User unblocked successfully",
      request, // or return some sanitized object if necessary
    });
  } catch (err) {
    console.error("Unblock User Error:", err);
    return res.status(500).json({ error: err.message });
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


const buildDashboardList = async ({ userId, type, status, onlyChat }) => {
  // ⛔ This function returns ONLY CLEAN, RENDERABLE USERS

  let includeStatuses = ["Pending", "Accepted"];

// ❌ duplicated & conflicting
if (status === "Blocked") {
  includeStatuses = ["Blocked"];
} else if (status && status !== "active") {
  includeStatuses = status.split(",").map(s => s.trim());
}

if (status && status !== "active") {
  includeStatuses = status.split(",").map(s => s.trim());
}

  let filter = {};

  if (type === "interaction") {
    filter = {
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: { $in: includeStatuses },
    };
  } else {
    filter.status = { $in: includeStatuses };
    if (onlyChat) filter.type = "Chat";

    if (type === "received") filter.receiverId = userId;
    if (type === "sent") filter.senderId = userId;
  }

  const requests = await MatchRequest.find(filter).lean();

  const otherIds = new Set();
  const safeRequests = [];

  for (const r of requests) {
    const sender = String(r.senderId);
    const receiver = String(r.receiverId);

    const other =
      type === "interaction"
        ? sender === String(userId) ? receiver : sender
        : type === "received"
        ? sender
        : receiver;

    if (!other || other === "undefined") continue;

    otherIds.add(other);
    safeRequests.push({ ...r, otherId: other });
  }

  const users = await User.find({ _id: { $in: [...otherIds] } })
    .select("firstName lastName email gender registrationId")
    .lean();

  const userMap = {};
  users.forEach(u => (userMap[String(u._id)] = u));

  const profiles = await UserProfileDetail.find({
    userId: { $in: [...otherIds] },
  }).lean();

  const profileMap = {};
  profiles.forEach(p => (profileMap[String(p.userId)] = p));

  const photos = await UserPhotoGallery.find({
    userProfileId: { $in: [...otherIds] },
    isProfilePhoto: true,
  }).lean();

  const photoMap = {};
  photos.forEach(p => (photoMap[String(p.userProfileId)] = p.imageUrl));

  return safeRequests
    .map(r => {
      const u = userMap[r.otherId];
      if (!u) return null;

      const profile = profileMap[r.otherId] || {};

      return {
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        registrationId: u.registrationId,
        gender: u.gender,
        profilePhoto: photoMap[r.otherId] || null,
        maritalStatus: profile.maritalStatus || "",
        city: profile.city || "",
        state: profile.state || "",
        actionStatus: r.status,         // Pending | Accepted | Rejected | Blocked
  direction:
    String(r.senderId) === String(userId)
      ? "sent"
      : "received",

        status: r.status,
        requestId: r._id,
      };
    })
    .filter(Boolean);
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const sentPending = await buildDashboardList({
      userId,
      type: "sent",
      status: "Pending",
    });

    const sentAccepted = await buildDashboardList({
      userId,
      type: "sent",
      status: "Accepted",
    });

    const receivedPending = await buildDashboardList({
      userId,
      type: "received",
      status: "Pending",
    });

    const receivedAccepted = await buildDashboardList({
      userId,
      type: "received",
      status: "Accepted",
    });

    const receivedRejected = await buildDashboardList({
  userId,
  type: "received",
  status: "Rejected",
});

const sentRejected = await buildDashboardList({
  userId,
  type: "sent",
  status: "Rejected",
});


    const interactions = await buildDashboardList({
      userId,
      type: "interaction",
      status: "active",
    });

    const totalChats = await ChatRoom.countDocuments({
  participants: userId,
});
const blockedByMe = await buildDashboardList({
  userId,
  type: "sent",
  status: "Blocked",
});

    res.json({
      received: {
        pending: receivedPending.length,
        accepted: receivedAccepted.length,
        rejected: receivedRejected.length,
      },
      sent: {
        pending: sentPending.length,
        acceptedByOthers: sentAccepted.length,
        declinedByOthers: sentRejected.length,
      },
      
      interactions: {
        total: interactions.length,
      },
       chats: {
    totalChats, // ✅ FIXED
  },
  blocked: {
    total: blockedByMe.length, // ✅ NEW
  },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getDashboardRequestList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, status, onlyChat } = req.query;

    const users = await buildDashboardList({
      userId,
      type,
      status,
      onlyChat: onlyChat === "true",
    });
    const finalUsers =
      type === "interaction"
        ? users.map(u => ({ ...u, mode: "interaction" }))
        : users;

    res.json({
      message: "List fetched",
       total: finalUsers.length,
      users: finalUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





