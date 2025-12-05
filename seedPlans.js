import mongoose from "mongoose";
import dotenv from "dotenv";
import SubscriptionPlan from "./src/models/subscriptionPlanModel.js";

dotenv.config();

mongoose.connect("mongodb+srv://omkarpowar8724_db_user:89sGNkRbFMg821jK@matrimonial.zu5mauk.mongodb.net/Matrimonial").then(async () => {
  console.log("Connected to DB");

  await SubscriptionPlan.deleteMany(); // clear old data

  await SubscriptionPlan.insertMany([
    {
      name: "FREE",
      price: 0,
      durationInDays: 30,
      features: {
        canViewProfiles: true,
        canChat: false,
        canViewContactDetails: false,
      },
    },
    {
      name: "SILVER",
      price: 2500,
      durationInDays: 90,
      features: {
        canViewProfiles: true,
        canChat: true,
        canViewContactDetails: true,
      },
    },
    {
      name: "GOLD",
      price: 4000,
      durationInDays: 180,
      features: {
        canViewProfiles: true,
        canChat: true,
        canViewContactDetails: true,
      },
    },
    {
      name: "PLATINUM",
      price: 8000,
      durationInDays: 360,
      features: {
        canViewProfiles: true,
        canChat: true,
        canViewContactDetails: true,
      },
    },
  ]);

  console.log("Plans seeded successfully!");
  process.exit();
});
