import mongoose from "mongoose";

const userDeleteLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reasonType: {
      type: String,
     // enum: ["Marriage Fixed", "Married", "Other Reason"],
      enum: ["Marriage Fixed", "Other Reason"],
      required: true,
    },
    marriageDate: Date,
    //groomName: { type: String, trim: true },
    partnerName: { type: String, trim: true },
    partnerRegistrationId : {type: String, trim: true},
    source: {
      type: String,
      //enum: ["Shubh Mangal Sohala Matrimony", "Other Matrimony", "Other Source"],
    },
    receiveGift: { type: Boolean, default: false },
    story: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

const UserDeleteLogModel = mongoose.model("UserDeleteLog", userDeleteLogSchema);
export default UserDeleteLogModel;
