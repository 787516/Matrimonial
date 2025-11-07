import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    education: String,
    occupation: String,
    income: String,
    religion: String,
    caste: String,
    height: String,
    weight: String,
    diet: String,
    hobbies: [String],
    about: String,
    familyDetails: {
      fatherName: String,
      motherName: String,
      siblings: Number,
      familyType: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserProfileModel", userProfileSchema);
