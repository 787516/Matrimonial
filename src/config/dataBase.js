import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://omkarpowar8724_db_user:89sGNkRbFMg821jK@matrimonial.zu5mauk.mongodb.net/Matrimonial"
    );
    
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    console.log(`📊 Database Name: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;