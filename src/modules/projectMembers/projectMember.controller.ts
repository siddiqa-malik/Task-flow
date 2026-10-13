import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  addProjectMember,
  getProjectMembers,
  getProjectMemberById,
  removeProjectMember,
  updateProjectMemberRole,
} from "./projectMember.service.js";
import {
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "./projectMember.validation.js";


export const addMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = addProjectMemberSchema.parse(req.body);

    const projectId = req.params.projectId?.trim();
    const ownerId = req.user?.id;

    if (!ownerId) {
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

    const projectMember = await addProjectMember(
      projectId,
      ownerId,
      validatedData
    );

    res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: projectMember,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add member",
    });
  }
};

export const getMembers = async (
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

    const members = await getProjectMembers(projectId, userId);

    res.status(200).json({
      success: true,
      message: "Project members fetched successfully",
      data: members,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch project members",
    });
  }
};

export const getMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId?.trim();
    const memberId = req.params.memberId?.trim();
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

    if (!memberId) {
      res.status(400).json({
        success: false,
        message: "Member ID is required",
      });
      return;
    }

    const member = await getProjectMemberById(projectId, userId, memberId);

    res.status(200).json({
      success: true,
      message: "Project member fetched successfully",
      data: member,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch project member",
    });
  }
};


export const removeMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const projectId = req.params.projectId?.trim();
    const memberId = req.params.memberId?.trim();
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!projectId || !isValidObjectId(projectId)) {
      res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
      return;
    }

    if (!memberId) {
      res.status(400).json({
        success: false,
        message: "Member ID is required",
      });
      return;
    }

    const deleted = await removeProjectMember(projectId, ownerId, memberId);

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to remove project member",
    });
  }
};

export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = updateProjectMemberRoleSchema.parse(req.body);

    const projectId = req.params.projectId?.trim();
    const memberId = req.params.memberId?.trim();
    const ownerId = req.user?.id;

    if (!ownerId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!projectId || !isValidObjectId(projectId)) {
      res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
      return;
    }

    if (!memberId) {
      res.status(400).json({
        success: false,
        message: "Member ID is required",
      });
      return;
    }

    const updated = await updateProjectMemberRole(
      projectId,
      ownerId,
      memberId,
      validatedData.role
    );

    res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update member role",
    });
  }
};
