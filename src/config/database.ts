import mongoose from "mongoose";

/*
 * Connects to MongoDB and reuses the existing connection across
 * Vercel serverless function invocations when already connected.
 */
export const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};