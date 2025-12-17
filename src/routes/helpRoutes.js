import express from "express";
import { createHelpQuery } from "../controller/helpController.js";

const router = express.Router();

router.post("/HelpQuery", createHelpQuery);

export default router;
