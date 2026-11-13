import { Workspace } from "./workspace.model.js";
import { User } from "../users/user.model.js";
import { sendInvitationEmail, getLastPreviewUrl } from "../../utils/email.service.js";
import crypto from "crypto";
import mongoose from "mongoose";

interface CreateWorkspaceInput {
  name: string;
  slug: string;
  companySize?: string;
  role?: string;
  ownerId: string;
}

export const createWorkspace = async (input: CreateWorkspaceInput) => {
  const cleanName = input.name.trim();
  let baseSlug = (input.slug || cleanName)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .trim() || "workspace";

  // Ensure unique slug
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (await Workspace.findOne({ slug: uniqueSlug })) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const ownerObjectId = new mongoose.Types.ObjectId(input.ownerId);

  const newWorkspace = await Workspace.create({
    name: cleanName,
    slug: uniqueSlug,
    ownerId: ownerObjectId,
    companySize: input.companySize || "1-10",
    role: input.role || "Other",
    members: [
      {
        userId: ownerObjectId,
        role: "owner",
        joinedAt: new Date(),
      },
    ],
  });

  return newWorkspace;
};

export const getUserWorkspaces = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Auto-bind any workspaces where this user was invited by email
  try {
    const currentUser = await User.findById(userObjectId).select("email").lean();
    const userEmail = currentUser?.email?.toLowerCase().trim();
    if (userEmail) {
      const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const invitedWorkspaces = await Workspace.find({
        "invitations.email": { $regex: new RegExp(`^${escapedEmail}$`, "i") },
        "members.userId": { $ne: userObjectId },
      });

      for (const iws of invitedWorkspaces) {
        const matchInv = iws.invitations.find(
          (i) => i.email.toLowerCase() === userEmail && i.status !== "expired"
        );
        if (matchInv) {
          iws.members.push({
            userId: userObjectId,
            role: matchInv.role || "member",
            joinedAt: new Date(),
          });
          matchInv.status = "accepted";
          await iws.save();

          try {
            const { Team } = await import("../teams/team.model.js");
            await Team.updateMany(
              { workspaceId: iws._id, "members.userId": { $ne: userObjectId } },
              { $push: { members: { userId: userObjectId, role: "member", status: "active", joinedAt: new Date() } } }
            );
            await Team.updateMany(
              { workspaceId: iws._id, "invitations.email": userEmail },
              { $set: { "invitations.$[elem].status": "accepted" } },
              { arrayFilters: [{ "elem.email": userEmail }] }
            );
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("Auto-binding invited workspaces error:", err);
  }

  const workspaces = await Workspace.find({
    $or: [{ ownerId: userObjectId }, { "members.userId": userObjectId }],
  })
    .populate("ownerId", "name email avatar")
    .populate("members.userId", "name email avatar")
    .sort({ updatedAt: -1 });

  return workspaces;
};

export const getWorkspaceById = async (workspaceId: string, userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const found = await Workspace.findOne({
    _id: workspaceId,
    $or: [{ ownerId: userObjectId }, { "members.userId": userObjectId }],
  })
    .populate("ownerId", "name email avatar")
    .populate("members.userId", "name email avatar");

  if (!found) {
    throw new Error("Workspace not found or unauthorized");
  }

  return found;
};

export const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  data: { name?: string; companySize?: string; role?: string }
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const ws = await Workspace.findOne({
    _id: workspaceId,
    $or: [
      { ownerId: userObjectId },
      { members: { $elemMatch: { userId: userObjectId, role: { $in: ["owner", "admin"] } } } },
    ],
  });

  if (!ws) {
    throw new Error("Workspace not found or insufficient permissions");
  }

  if (data.name) ws.name = data.name.trim();
  if (data.companySize) ws.companySize = data.companySize;
  if (data.role) ws.role = data.role;

  await ws.save();
  return ws;
};

export const inviteTeammates = async (params: {
  invitedByUserId: string;
  emails: string[] | string;
  teamName: string;
  workspaceId?: string;
  senderName?: string;
  role?: "admin" | "manager" | "member";
}) => {
  const { invitedByUserId, emails, teamName, workspaceId, senderName: providedSenderName, role: providedRole } = params;

  let emailList: string[] = [];
  if (Array.isArray(emails)) {
    emailList = emails;
  } else if (typeof emails === "string") {
    emailList = emails.split(/[,\s\n]+/).map((e) => e.trim()).filter(Boolean);
  }

  const validEmails = Array.from(
    new Set(
      emailList
        .map((e) => e.toLowerCase().trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    )
  );

  if (validEmails.length === 0) {
    throw new Error("Please provide at least one valid email address");
  }

  const sender = await User.findById(invitedByUserId).select("name email");
  const senderName =
    providedSenderName?.trim() ||
    sender?.name?.trim() ||
    (sender?.email ? sender.email.split("@")[0] : "") ||
    "A teammate";

  let resolvedWorkspace = null;
  if (workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
    resolvedWorkspace = await Workspace.findById(workspaceId);
  }
  if (!resolvedWorkspace) {
    resolvedWorkspace = await Workspace.findOne({
      $or: [
        { ownerId: new mongoose.Types.ObjectId(invitedByUserId) },
        { "members.userId": new mongoose.Types.ObjectId(invitedByUserId) },
      ],
    }).sort({ updatedAt: -1 });
  }

  const effectiveTeamName =
    teamName?.trim() && teamName.trim() !== "Design agency"
      ? teamName.trim()
      : resolvedWorkspace?.name || teamName?.trim() || "Workspace";

  const results = [];
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const toEmail of validEmails) {
    const token = crypto.randomBytes(32).toString("hex");

    const sent = await sendInvitationEmail(
      toEmail,
      effectiveTeamName,
      token,
      senderName
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const inviteLink = `${clientUrl}/invitations/accept?token=${token}`;

    if (resolvedWorkspace) {
      if (!resolvedWorkspace.invitations) {
        resolvedWorkspace.invitations = [];
      }
      const invRole = providedRole || "member";
      const existingIdx = resolvedWorkspace.invitations.findIndex(
        (i: any) => i.email.toLowerCase() === toEmail.toLowerCase()
      );
      if (existingIdx >= 0) {
        resolvedWorkspace.invitations[existingIdx].token = token;
        resolvedWorkspace.invitations[existingIdx].role = invRole as any;
        resolvedWorkspace.invitations[existingIdx].senderName = senderName;
        resolvedWorkspace.invitations[existingIdx].invitedBy = new mongoose.Types.ObjectId(invitedByUserId);
        resolvedWorkspace.invitations[existingIdx].status = "pending";
        resolvedWorkspace.invitations[existingIdx].expiresAt = sevenDaysFromNow;
        resolvedWorkspace.invitations[existingIdx].createdAt = new Date();
      } else {
        resolvedWorkspace.invitations.push({
          email: toEmail,
          token,
          role: invRole,
          senderName,
          invitedBy: new mongoose.Types.ObjectId(invitedByUserId),
          status: "pending",
          expiresAt: sevenDaysFromNow,
          createdAt: new Date(),
        } as any);
      }
    }

    results.push({
      email: toEmail,
      sent,
      token,
      inviteLink,
      previewUrl: getLastPreviewUrl(),
    });
  }

  if (resolvedWorkspace) {
    await resolvedWorkspace.save();
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  return {
    teamName: effectiveTeamName,
    sentCount: results.length,
    recipients: validEmails,
    inviteLink: results[0]?.inviteLink || `${clientUrl}/invitations/accept`,
    previewUrl: results[0]?.previewUrl || null,
    details: results,
  };
};

export const getWorkspaceInviteByToken = async (token: string) => {
  const cleanToken = token.trim();
  const ws = await Workspace.findOne({ "invitations.token": cleanToken }).populate("ownerId", "name email avatar");
  if (!ws) {
    throw new Error("Invitation not found or has expired");
  }

  const inv = ws.invitations.find((i) => i.token === cleanToken);
  if (!inv) {
    throw new Error("Invitation details not found");
  }

  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
    inv.status = "expired";
    await ws.save();
    throw new Error("This invitation has expired");
  }

  const memberCount = ws.members?.length || 1;

  // Resolve authentic inviter name and details
  let inviterUser: any = null;
  if (inv.invitedBy) {
    inviterUser = await User.findById(inv.invitedBy).select("name email avatar").lean();
  }

  const inviterName =
    inv.senderName ||
    inviterUser?.name ||
    (ws.ownerId as any)?.name ||
    "A team member";

  const inviterEmail =
    inviterUser?.email ||
    (ws.ownerId as any)?.email ||
    "";

  return {
    workspace: {
      id: ws._id,
      name: ws.name,
      slug: ws.slug,
      companySize: ws.companySize,
      memberCount,
    },
    invitation: {
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
    },
    inviter: {
      name: inviterName,
      email: inviterEmail,
      avatar: inviterUser?.avatar || (ws.ownerId as any)?.avatar,
    },
    owner: ws.ownerId,
  };
};

export const acceptWorkspaceInvitation = async (token: string, userId: string) => {
  const cleanToken = token.trim();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const ws = await Workspace.findOne({ "invitations.token": cleanToken });
  if (!ws) {
    throw new Error("Invalid or expired invitation token");
  }

  const inv = ws.invitations.find((i) => i.token === cleanToken);
  if (!inv) {
    throw new Error("Invitation not found");
  }

  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
    inv.status = "expired";
    await ws.save();
    throw new Error("This invitation has expired");
  }

  // Ensure user is added to members if not already present
  const alreadyMember = ws.members.some((m) => m.userId.toString() === userId);
  if (!alreadyMember) {
    ws.members.push({
      userId: userObjectId,
      role: inv.role || "member",
      joinedAt: new Date(),
    });
  }

  inv.status = "accepted";
  await ws.save();

  // Also automatically add user to all active teams in this workspace
  try {
    const { Team } = await import("../teams/team.model.js");
    await Team.updateMany(
      { workspaceId: ws._id, "members.userId": { $ne: userObjectId } },
      { $push: { members: { userId: userObjectId, role: "member", status: "active", joinedAt: new Date() } } }
    );
    if (inv.email) {
      const cleanEmail = inv.email.toLowerCase().trim();
      await Team.updateMany(
        { workspaceId: ws._id, "invitations.email": cleanEmail },
        { $set: { "invitations.$[elem].status": "accepted" } },
        { arrayFilters: [{ "elem.email": cleanEmail }] }
      );
    }
  } catch {}

  return { workspace: ws, message: "Invitation accepted successfully" };
};

/*
 * Allows an authenticated member to leave a workspace.
 * If the user is the owner and other members exist, ownership transfers.
 * If the user is the last remaining member, an error is thrown indicating
 * they should delete the workspace instead.
 */
export const leaveWorkspace = async (workspaceId: string, userId: string) => {
  const cleanWsId = workspaceId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanWsId)) {
    throw new Error("Invalid workspace ID");
  }

  const ws = await Workspace.findById(cleanWsId);
  if (!ws) {
    throw new Error("Workspace not found");
  }

  const isMember = ws.members.some(
    (m) => m.userId.toString() === cleanUserId
  );
  if (!isMember) {
    throw new Error("You are not a member of this workspace");
  }

  if (ws.ownerId.toString() === cleanUserId) {
    const otherMembers = ws.members.filter(
      (m) => m.userId.toString() !== cleanUserId
    );
    if (otherMembers.length > 0) {
      ws.ownerId = otherMembers[0].userId;
      otherMembers[0].role = "owner";
    }
  }

  ws.members = ws.members.filter(
    (m) => m.userId.toString() !== cleanUserId
  );

  await ws.save();
  return { message: "Successfully left workspace" };
};
