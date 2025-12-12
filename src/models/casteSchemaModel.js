import mongoose from "mongoose";

const casteSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

export default mongoose.model("Caste", casteSchema);
