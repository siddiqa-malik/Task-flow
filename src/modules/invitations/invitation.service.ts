import crypto from "crypto";
import mongoose from "mongoose";
import { Invitation } from "./invitation.model.js";
import { Project } from "../projects/project.model.js";
import { ProjectMember } from "../projectMembers/projectMember.model.js";
import { User } from "../users/user.model.js";
import { createNotification } from "../notifications/notification.service.js";
import { sendInvitationEmail } from "../../utils/email.service.js";

interface SendInvitationInput {
  email: string;
  role?: "manager" | "member";
}

// =====================================================
// SEND INVITATION
// =====================================================
export const sendInvitation = async (
  projectId: string,
  invitedByUserId: string,
  data: SendInvitationInput
) => {
  const cleanProjectId = projectId.trim();
  const cleanUserId = invitedByUserId.trim();
  const cleanEmail = data.email.toLowerCase().trim();

  if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
    throw new Error("Invalid project ID");
  }

  // 1. Verify project exists
  const project = await Project.findById(cleanProjectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Authorization: Sender must be project owner or manager
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isManager = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
    role: "manager",
  });

  if (!isOwner && !isManager) {
    throw new Error("Only project owners and managers can send invitations");
  }

  // 3. Verify target is not already the owner
  const owner = await User.findById(project.ownerId);
  if (owner && owner.email.toLowerCase() === cleanEmail) {
    throw new Error("User is already the owner of this project");
  }

  // 4. Verify target is not already a member
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const isMember = await ProjectMember.findOne({
      projectId: project._id,
      userId: existingUser._id,
    });

    if (isMember) {
      throw new Error("User is already a member of this project");
    }
  }

  // 5. Check if active pending invitation already exists
  const pendingInvitation = await Invitation.findOne({
    projectId: project._id,
    email: cleanEmail,
    status: "pending",
  });

  if (pendingInvitation) {
    if (pendingInvitation.expiresAt > new Date()) {
      throw new Error("A pending invitation has already been sent to this email");
    } else {
      pendingInvitation.status = "expired";
      await pendingInvitation.save();
    }
  }

  // 6. Generate secure invitation token (expires in 7 days)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 7. Create invitation
  const invitation = await Invitation.create({
    projectId: project._id,
    invitedBy: new mongoose.Types.ObjectId(cleanUserId),
    email: cleanEmail,
    role: data.role || "member",
    status: "pending",
    token,
    expiresAt,
  });

  // 8. Notify invited user if already registered on platform
  if (existingUser) {
    createNotification({
      userId: existingUser._id,
      type: "project-invitation",
      message: `You were invited to join project: "${project.name}" as ${data.role || "member"}`,
      projectId: project._id,
    });
  }

  // 9. Send invitation email
  const senderUser = await User.findById(cleanUserId).select("name");
  await sendInvitationEmail(
    cleanEmail,
    project.name,
    token,
    senderUser?.name
  );

  // 10. Return populated invitation
  return await Invitation.findById(invitation._id)
    .populate("invitedBy", "name email avatar")
    .populate("projectId", "name description");
};

// =====================================================
// GET PROJECT INVITATIONS (FOR OWNER / MANAGER)
// =====================================================
export const getProjectInvitations = async (
  projectId: string,
  userId: string
) => {
  const cleanProjectId = projectId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
    throw new Error("Invalid project ID");
  }

  const project = await Project.findById(cleanProjectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // Sender must be owner or manager
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isManager = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
    role: "manager",
  });

  if (!isOwner && !isManager) {
    throw new Error(
      "Only project owners and managers can view project invitations"
    );
  }

  const invitations = await Invitation.find({ projectId: project._id })
    .populate("invitedBy", "name email avatar")
    .sort({ createdAt: -1 });

  return invitations;
};

// =====================================================
// GET CURRENT USER'S RECEIVED INVITATIONS
// =====================================================
export const getMyInvitations = async (userId: string) => {
  const cleanUserId = userId.trim();

  const currentUser = await User.findById(cleanUserId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const invitations = await Invitation.find({
    email: currentUser.email.toLowerCase(),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .populate("projectId", "name description ownerId")
    .populate("invitedBy", "name email avatar")
    .sort({ createdAt: -1 });

  return invitations;
};

// =====================================================
// ACCEPT INVITATION BY TOKEN
// =====================================================
export const acceptInvitation = async (token: string, userId: string) => {
  const cleanToken = token.trim();
  const cleanUserId = userId.trim();

  const currentUser = await User.findById(cleanUserId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const invitation = await Invitation.findOne({ token: cleanToken });
  if (!invitation) {
    throw new Error("Invalid invitation token");
  }

  if (invitation.status !== "pending") {
    throw new Error(`Invitation has already been ${invitation.status}`);
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    throw new Error("This invitation has expired");
  }

  // Verify that the logged in user's email matches the invitation email
  if (
    invitation.email.toLowerCase() !== currentUser.email.toLowerCase()
  ) {
    throw new Error(
      `This invitation was sent to ${invitation.email}, but you are logged in as ${currentUser.email}`
    );
  }

  // Add user to project members if not already
  let member = await ProjectMember.findOne({
    projectId: invitation.projectId,
    userId: currentUser._id,
  });

  if (!member) {
    member = await ProjectMember.create({
      projectId: invitation.projectId,
      userId: currentUser._id,
      role: invitation.role,
    });
  }

  // Update invitation status
  invitation.status = "accepted";
  await invitation.save();

  const populatedMember = await ProjectMember.findById(member._id)
    .populate("userId", "name email avatar")
    .populate("projectId", "name description");

  return {
    invitation,
    member: populatedMember,
  };
};

// =====================================================
// REJECT INVITATION BY TOKEN
// =====================================================
export const rejectInvitation = async (token: string, userId: string) => {
  const cleanToken = token.trim();
  const cleanUserId = userId.trim();

  const currentUser = await User.findById(cleanUserId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const invitation = await Invitation.findOne({ token: cleanToken });
  if (!invitation) {
    throw new Error("Invalid invitation token");
  }

  if (invitation.status !== "pending") {
    throw new Error(`Invitation has already been ${invitation.status}`);
  }

  if (
    invitation.email.toLowerCase() !== currentUser.email.toLowerCase()
  ) {
    throw new Error(
      `This invitation was sent to ${invitation.email}, but you are logged in as ${currentUser.email}`
    );
  }

  invitation.status = "rejected";
  await invitation.save();

  return invitation;
};

// =====================================================
// CANCEL / REVOKE INVITATION
// =====================================================
export const cancelInvitation = async (
  invitationId: string,
  userId: string
) => {
  const cleanInvitationId = invitationId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanInvitationId)) {
    throw new Error("Invalid invitation ID");
  }

  const invitation = await Invitation.findById(cleanInvitationId);
  if (!invitation) {
    throw new Error("Invitation not found");
  }

  const project = await Project.findById(invitation.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // Authorization: Sender must be project owner or manager
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isManager = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
    role: "manager",
  });

  if (!isOwner && !isManager) {
    throw new Error(
      "Only project owners and managers can cancel invitations"
    );
  }

  const deleted = await Invitation.findByIdAndDelete(cleanInvitationId);

  return deleted;
};
