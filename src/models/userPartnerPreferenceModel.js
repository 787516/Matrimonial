import mongoose from "mongoose";

const preferenceSchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfileDetail",
      required: true,
      unique: true,
    },

    // BASIC
    maritalStatus: [String],
    ageRange: {
      min: Number,
      max: Number,
    },
    heightRange: {
      min: Number,
      max: Number,
    },

    // RELIGION
    religion: String,
    caste: String,
    motherTongue: String,

    // CAREER
    education: String,
    occupation: String,
    salaryRange: String,

    // LOCATION
    country: String,
    state: String,
    city: String,

    // LIFESTYLE
    diet: String,
    smoking: String,
    drinking: String,

    // HOROSCOPE
    manglik: String,
    rashi: String,
    nadi: String,
    gan: String,
    charan: String,

    partnerExpectation: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model("UserPartnerPreference", preferenceSchema);


// const UserPartnerPreference = mongoose.model(
//   "UserPartnerPreference",
//   userPartnerPreferenceSchema
// );
// export default UserPartnerPreference;
