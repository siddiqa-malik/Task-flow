import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  sendInvitation,
  getProjectInvitations,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
} from "./invitation.service.js";
import { createInvitationSchema } from "./invitation.validation.js";

// =====================================================
// SEND INVITATION CONTROLLER
// =====================================================
export const send = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createInvitationSchema.parse(req.body);
    const projectId = req.params.projectId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!projectId || !isValidObjectId(projectId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing project ID",
      });
      return;
    }

    const invitation = await sendInvitation(projectId, userId, validatedData);

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send invitation",
    });
  }
};

// =====================================================
// GET PROJECT INVITATIONS CONTROLLER
// =====================================================
export const getAllForProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!projectId || !isValidObjectId(projectId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing project ID",
      });
      return;
    }

    const invitations = await getProjectInvitations(projectId, userId);

    res.status(200).json({
      success: true,
      message: "Project invitations fetched successfully",
      count: invitations.length,
      data: invitations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch invitations",
    });
  }
};

// =====================================================
// GET CURRENT USER'S INVITATIONS CONTROLLER
// =====================================================
export const getMy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const invitations = await getMyInvitations(userId);

    res.status(200).json({
      success: true,
      message: "Your invitations fetched successfully",
      count: invitations.length,
      data: invitations,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch your invitations",
    });
  }
};

// =====================================================
// ACCEPT INVITATION CONTROLLER
// =====================================================
export const accept = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const token = req.params.token?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
      return;
    }

    const result = await acceptInvitation(token, userId);

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully! You are now a member.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to accept invitation",
    });
  }
};

// =====================================================
// REJECT INVITATION CONTROLLER
// =====================================================
export const reject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const token = req.params.token?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
      return;
    }

    const result = await rejectInvitation(token, userId);

    res.status(200).json({
      success: true,
      message: "Invitation rejected",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject invitation",
    });
  }
};

// =====================================================
// CANCEL INVITATION CONTROLLER
// =====================================================
export const cancel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const invitationId = req.params.invitationId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!invitationId || !isValidObjectId(invitationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing invitation ID",
      });
      return;
    }

    const deleted = await cancelInvitation(invitationId, userId);

    res.status(200).json({
      success: true,
      message: "Invitation cancelled successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to cancel invitation",
    });
  }
};
