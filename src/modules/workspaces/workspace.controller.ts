import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  inviteTeammates,
  getWorkspaceInviteByToken,
  acceptWorkspaceInvitation,
  leaveWorkspace,
} from "./workspace.service.js";

export const create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { name, slug, companySize, role } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: "Workspace name is required" });
      return;
    }

    const ws = await createWorkspace({
      name,
      slug,
      companySize,
      role,
      ownerId: userId,
    });

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: ws,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create workspace",
    });
  }
};

export const getMyWorkspaces = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const workspaces = await getUserWorkspaces(userId);

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch workspaces",
    });
  }
};

export const getOne = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const ws = await getWorkspaceById(id as string, userId);

    res.status(200).json({
      success: true,
      data: ws,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Workspace not found",
    });
  }
};

export const update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const updated = await updateWorkspace(id as string, userId, req.body);

    res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update workspace",
    });
  }
};

export const invite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { emails, teamName, workspaceId, senderName, role } = req.body;
    if (!emails) {
      res.status(400).json({ success: false, message: "At least one email is required" });
      return;
    }

    const result = await inviteTeammates({
      invitedByUserId: userId,
      emails,
      teamName: teamName || "Workspace",
      workspaceId,
      senderName,
      role: role || "member",
    });

    res.status(200).json({
      success: true,
      message: `Invitations sent successfully to ${result.sentCount} teammate${result.sentCount > 1 ? "s" : ""}`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send invitations",
    });
  }
};

export const getInviteDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token || "");
    if (!token) {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }
    const details = await getWorkspaceInviteByToken(token);
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Invitation not found",
    });
  }
};

export const acceptInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const token = String(req.params.token || "");
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required to accept invitation" });
      return;
    }
    if (!token) {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }

    const result = await acceptWorkspaceInvitation(token, userId);
    res.status(200).json({
      success: true,
      message: "Workspace invitation accepted successfully",
      data: result.workspace,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to accept invitation",
    });
  }
};

/*
 * POST /api/workspaces/:id/leave
 * Allows authenticated user to remove themselves from a workspace
 */
export const leave = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const workspaceId = req.params.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const result = await leaveWorkspace(workspaceId, userId);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to leave workspace",
    });
  }
};
