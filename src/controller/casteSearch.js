import express from "express";
import Caste from "../models/casteSchemaModel.js";

const router = express.Router();

// Autocomplete caste search
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.length < 1) {
      return res.json({ castes: [] });
    }

    const regex = new RegExp(query, "i");

    const results = await Caste.find({ name: regex })
      .limit(10)
      .sort({ name: 1 });

    res.json({ castes: results });
  } catch (err) {
    console.error("Autocomplete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
