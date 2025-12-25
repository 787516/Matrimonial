import mongoose from "mongoose";
import dotenv from "dotenv";
import SubscriptionPlan from "./src/models/subscriptionPlanModel.js";

dotenv.config();

mongoose
  .connect("mongodb+srv://omkarpowar8724_db_user:89sGNkRbFMg821jK@matrimonial.zu5mauk.mongodb.net/Matrimonial")
  .then(async () => {
    console.log("Connected to DB");

    await SubscriptionPlan.deleteMany(); // clear old data

    await SubscriptionPlan.insertMany([
      {
        name: "FREE",
        price: 0,
        durationInDays: 30,
        features: {
          canViewContacts: false,
          maxProfileViews: 1,
          unlimitedProfileViews: false,
          chatAllowed: false,
          unlimitedInterest: false,
          supportLevel: "Basic",
        },
      },
      
      {
        name: "SILVER",
        price: 2500,
        durationInDays: 90,
        features: {
          canViewContacts: true,
          maxProfileViews: 100,
          unlimitedProfileViews: false,
          chatAllowed: true,
          unlimitedInterest: true,
          supportLevel: "Basic",
        },
      },
      {
        name: "GOLD",
        price: 4000,
        durationInDays: 180,
        features: {
          canViewContacts: true,
          maxProfileViews: 300,
          unlimitedProfileViews: false,
          chatAllowed: true,
          unlimitedInterest: true,
          supportLevel: "Advanced",
        },
      },
      {
        name: "PLATINUM",
        price: 8000,
        durationInDays: 360,
        features: {
          canViewContacts: true,
          maxProfileViews: 0, // unused because unlimited = true
          unlimitedProfileViews: true,
          chatAllowed: true,
          unlimitedInterest: true,
          supportLevel: "Dedicated",
        },
      },
    ]);

    console.log("Plans seeded successfully!");
    process.exit();
  })
  .catch((err) => console.log(err));
