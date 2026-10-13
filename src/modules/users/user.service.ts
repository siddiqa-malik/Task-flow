import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "./user.model.js";

interface UpdateProfileInput {
  name?: string;
  avatar?: string | null;
}

// =====================================================
// GET CURRENT USER PROFILE
// =====================================================
export const getProfile = async (userId: string) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(cleanUserId).select("-password");
  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// =====================================================
// UPDATE PROFILE
// =====================================================
export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput
) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.avatar !== undefined) updatePayload.avatar = data.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    cleanUserId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
};

// =====================================================
// CHANGE PASSWORD
// =====================================================
export const changePassword = async (
  userId: string,
  currentPass: string,
  newPass: string
) => {
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(cleanUserId);
  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPass, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPass, 10);
  user.password = hashedPassword;
  await user.save();

  return { message: "Password updated successfully" };
};

// =====================================================
// SEARCH USERS (FOR ASSIGNING TASKS OR INVITING)
// =====================================================
export const searchUsers = async (
  query: string,
  excludeUserId?: string
) => {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const searchRegex = new RegExp(cleanQuery, "i");

  const filter: any = {
    $or: [{ name: searchRegex }, { email: searchRegex }],
  };

  if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
  }

  const users = await User.find(filter)
    .select("name email avatar role")
    .limit(10);

  return users;
};
