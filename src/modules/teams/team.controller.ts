import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import { Team } from "./team.model.js";
import mongoose from "mongoose";
import { ensureTeamWorkflowStates } from "../workflowStates/workflowState.service.js";

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { name, key, description, workspaceId, icon, color, isPrivate, copiedFrom } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Team name is required" });
      return;
    }

    if (!key?.trim()) {
      res.status(400).json({ success: false, message: "Team identifier is required" });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ success: false, message: "Workspace ID is required" });
      return;
    }

    // Check if key already exists in this workspace
    const existingKey = await Team.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      key: key.trim().toUpperCase(),
    });

    if (existingKey) {
      res.status(400).json({
        success: false,
        message: `Team identifier "${key.trim().toUpperCase()}" is already in use in this workspace`,
      });
      return;
    }

    const team = await Team.create({
      name: name.trim(),
      key: key.trim().toUpperCase(),
      description: description?.trim() || undefined,
      status: "active",
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      icon: icon || "FolderKanban",
      color: color || "#5e6ad2",
      isPrivate: Boolean(isPrivate),
      copiedFrom: copiedFrom?.trim() || undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
      members: [
        {
          userId: new mongoose.Types.ObjectId(userId),
          role: "lead",
          status: "active",
          joinedAt: new Date(),
        },
      ],
      invitations: [],
    });

    // Auto-seed default Linear workflow states for the new team
    try {
      await ensureTeamWorkflowStates(team._id as any, team.workspaceId as any);
    } catch {
      // Non-fatal if states fail to seed
    }

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: team,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create team",
    });
  }
};

export const getWorkspaceTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { workspaceId, status } = req.query;
    const filter: Record<string, any> = {};

    if (workspaceId && mongoose.isValidObjectId(workspaceId as string)) {
      filter.workspaceId = new mongoose.Types.ObjectId(workspaceId as string);
    }

    if (status) {
      filter.status = status;
    }

    const teams = await Team.find(filter)
      .populate("members.userId", "name email avatar")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: teams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch teams",
    });
  }
};

export const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = String(id || "");
    let team = null;

    if (mongoose.isValidObjectId(idStr)) {
      team = await Team.findById(idStr).populate("members.userId", "name email avatar");
    }

    if (!team) {
      team = await Team.findOne({
        $or: [
          { key: idStr.toUpperCase() },
          { name: new RegExp('^' + idStr + '$', 'i') },
        ],
      }).populate("members.userId", "name email avatar");
    }

    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch team",
    });
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, key, description, status, icon, color, isPrivate } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    if (name) team.name = name.trim();
    if (key) team.key = key.trim().toUpperCase();
    if (description !== undefined) team.description = description?.trim();
    if (status) team.status = status;
    if (icon) team.icon = icon;
    if (color) team.color = color;
    if (typeof isPrivate === "boolean") team.isPrivate = isPrivate;
    if (Array.isArray(req.body.members)) team.members = req.body.members;

    await team.save();

    res.json({
      success: true,
      message: "Team updated successfully",
      data: team,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update team",
    });
  }
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndUpdate(id, { status: "deleted" }, { new: true });

    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    res.json({
      success: true,
      message: "Team moved to recently deleted",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete team",
    });
  }
};

export const addTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, role, userId: providedUserId } = req.body;
    const currentUserId = req.user?.id;

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid team ID is required" });
      return;
    }

    const team = await Team.findById(id);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const memberRole = role === "lead" ? "lead" : "member";

    const { User } = await import("../users/user.model.js");
    const { Workspace } = await import("../workspaces/workspace.model.js");

    let userDoc: any = null;
    if (providedUserId && mongoose.isValidObjectId(providedUserId)) {
      userDoc = await User.findById(providedUserId);
    } else if (cleanEmail) {
      userDoc = await User.findOne({ email: cleanEmail });
    }

    const ws = await Workspace.findById(team.workspaceId);
    const isAlreadyWsMember = ws && userDoc && ws.members.some(
      (m: any) => m.userId && m.userId.toString() === userDoc._id.toString()
    );

    // Standard SaaS Rule:
    // If the user already has a verified account AND is an active workspace member,
    // they can be directly added to team.members.
    if (userDoc && isAlreadyWsMember) {
      if (!Array.isArray(team.members)) team.members = [];

      const existingMemberIndex = team.members.findIndex(
        (m: any) => m.userId && m.userId.toString() === userDoc._id.toString()
      );

      if (existingMemberIndex >= 0) {
        team.members[existingMemberIndex].role = memberRole as any;
        team.members[existingMemberIndex].status = "active";
      } else {
        team.members.push({
          userId: userDoc._id,
          email: userDoc.email,
          role: memberRole as any,
          status: "active",
          joinedAt: new Date(),
        } as any);
      }

      await team.save();
    } else {
      // Standard SaaS Rule:
      // DO NOT create unverified accounts in User collection.
      // DO NOT add unaccepted users to team.members or ws.members.
      // Store in team.invitations as 'pending' and send an invitation email with a secure token.
      const targetEmail = cleanEmail || (userDoc ? userDoc.email : "");
      if (targetEmail) {
        if (!Array.isArray(team.invitations)) team.invitations = [];
        const existingInv = team.invitations.find(
          (i) => i.email && i.email.toLowerCase() === targetEmail.toLowerCase()
        );

        if (existingInv) {
          existingInv.role = memberRole as any;
          existingInv.status = "pending";
          existingInv.createdAt = new Date();
        } else {
          team.invitations.push({
            email: targetEmail,
            role: memberRole as any,
            status: "pending",
            createdAt: new Date(),
          });
        }

        await team.save();

        try {
          const { inviteTeammates } = await import("../workspaces/workspace.service.js");
          await inviteTeammates({
            invitedByUserId: currentUserId || team.createdBy.toString(),
            emails: [targetEmail],
            teamName: team.name,
            workspaceId: team.workspaceId.toString(),
            senderName: (req.user as any)?.name,
            role: "member",
          });
        } catch (inviteErr) {
          console.error("Workspace invite dispatch error:", inviteErr);
        }
      }
    }

    const populatedTeam = await Team.findById(team._id).populate("members.userId", "name email avatar");

    res.status(200).json({
      success: true,
      message: userDoc && isAlreadyWsMember
        ? `Added ${userDoc.name || userDoc.email} to team`
        : `Invitation sent to ${cleanEmail}`,
      data: populatedTeam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to add member to team",
    });
  }
};

export const removeTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, memberId } = req.params;
    const queryEmail = typeof req.query?.email === "string" ? req.query.email.trim().toLowerCase() : "";
    const bodyEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    const rawId = decodeURIComponent(String(memberId || "")).trim();
    const rawIdLower = rawId.toLowerCase();

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid team ID is required" });
      return;
    }

    const team = await Team.findById(id);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    const { User } = await import("../users/user.model.js");

    // Collect all candidate target IDs and Emails
    const targetIds = new Set<string>();
    const targetEmails = new Set<string>();

    if (rawId && !rawId.startsWith("team-")) {
      targetIds.add(rawId);
    }
    if (rawIdLower.includes("@")) {
      targetEmails.add(rawIdLower);
    }
    if (queryEmail && queryEmail.includes("@")) {
      targetEmails.add(queryEmail);
    }
    if (bodyEmail && bodyEmail.includes("@")) {
      targetEmails.add(bodyEmail);
    }

    // Resolve user if rawId is a valid ObjectId
    if (mongoose.isValidObjectId(rawId)) {
      try {
        const u = await User.findById(rawId);
        if (u) {
          targetIds.add(u._id.toString());
          if (u.email) targetEmails.add(u.email.toLowerCase());
        }
      } catch {}
    }

    // Resolve user if any email is provided
    for (const email of Array.from(targetEmails)) {
      try {
        const u = await User.findOne({ email });
        if (u) {
          targetIds.add(u._id.toString());
        }
      } catch {}
    }

    // Filter out from team.members
    if (Array.isArray(team.members)) {
      team.members = (team.members as any).filter((m: any) => {
        const mSubId = m._id ? m._id.toString() : "";
        const mUserId = (m.userId?._id || m.userId)?.toString();
        const mEmail = (m.email || (typeof m.userId === "object" ? m.userId?.email : "") || "").toLowerCase();

        if (mSubId && targetIds.has(mSubId)) return false;
        if (mUserId && targetIds.has(mUserId)) return false;
        if (mEmail && targetEmails.has(mEmail)) return false;
        if (mEmail && rawIdLower === mEmail) return false;
        return true;
      });
    }

    // Filter out from team.invitations
    if (Array.isArray(team.invitations)) {
      team.invitations = team.invitations.filter((inv: any) => {
        const invEmail = (inv.email || "").toLowerCase();
        if (invEmail && targetEmails.has(invEmail)) return false;
        if (invEmail && rawIdLower === invEmail) return false;
        if (inv._id && targetIds.has(inv._id.toString())) return false;
        return true;
      });
    }

    await team.save();

    const populatedTeam = await Team.findById(team._id).populate("members.userId", "name email avatar");

    res.status(200).json({
      success: true,
      message: "Member removed from team successfully",
      data: populatedTeam,
    });
  } catch (error: any) {
    console.error("removeTeamMember error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to remove member from team",
    });
  }
};
