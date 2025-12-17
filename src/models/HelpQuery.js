import mongoose from "mongoose";

const helpQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    userId: { type: String, required: true }, // profile ID / registration ID
    type: {
      type: String,
      enum: ["Query", "Complaint", "Suggestion", "Feedback"],
      required: true,
    },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
  },
  { timestamps: true }
);

export default mongoose.model("HelpQuery", helpQuerySchema);
