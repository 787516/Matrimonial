import mongoose from "mongoose";

const partnerPreferenceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ageRange: { min: Number, max: Number },
  religion: String,
  caste: String,
  education: String,
  occupation: String,
  location: String,
  maritalStatus: { type: String, enum: ["Never Married", "Divorced", "Widowed"] },
});

export default mongoose.model("PartnerPreferenceModel", partnerPreferenceSchema);
