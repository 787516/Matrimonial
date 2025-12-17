import HelpQuery from "../models/HelpQuery.js";

export const createHelpQuery = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      id,
      type,
      subject,
      question,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !id ||
      !type ||
      !subject ||
      !question
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const query = await HelpQuery.create({
      name,
      email,
      phone,
      userId: id,
      type,
      subject,
      question,
    });

    res.status(201).json({
      message: "Your query has been submitted successfully",
      queryId: query._id,
    });
  } catch (error) {
    console.error("Help query error:", error);
    res.status(500).json({ message: "Failed to submit query" });
  }
};
