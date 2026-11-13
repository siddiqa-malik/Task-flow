import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  createIssue,
  getIssues,
  getIssueByIdOrIdentifier,
  getSubIssues,
  updateIssue,
  deleteIssue,
} from "./issue.service.js";

export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { title } = req.body;
    if (!title?.trim()) {
      res.status(400).json({ success: false, message: "Issue title is required" });
      return;
    }

    const issue = await createIssue(req.body, userId);

    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: issue,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create issue",
    });
  }
};

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      workspaceId,
      teamId,
      projectId,
      cycleId,
      parentId,
      status,
      stateId,
      priority,
      assignedTo,
      search,
      onlyRoots,
    } = req.query;

    const issues = await getIssues({
      workspaceId: workspaceId as string | undefined,
      teamId: teamId as string | undefined,
      projectId: projectId as string | undefined,
      cycleId: cycleId as string | undefined,
      parentId: parentId as string | undefined,
      status: status as string | undefined,
      stateId: stateId as string | undefined,
      priority: priority as string | undefined,
      assignedTo: assignedTo as string | undefined,
      search: search as string | undefined,
      onlyRoots: onlyRoots === "true",
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch issues",
    });
  }
};

export const getOne = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const issue = await getIssueByIdOrIdentifier(id);

    if (!issue) {
      res.status(404).json({
        success: false,
        message: "Issue not found",
      });
      return;
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch issue",
    });
  }
};

export const getSubIssuesHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const subIssues = await getSubIssues(id);

    res.json({
      success: true,
      data: subIssues,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch sub-issues",
    });
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const updated = await updateIssue(id, req.body);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Issue not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Issue updated successfully",
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update issue",
    });
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const deleted = await deleteIssue(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Issue not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete issue",
    });
  }
};
