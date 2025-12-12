import express from "express";
import Caste from "../models/casteSchemaModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const castes = await Caste.find().sort({ name: 1 });
    res.json({ castes });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch castes" });
  }
});

export default router;
