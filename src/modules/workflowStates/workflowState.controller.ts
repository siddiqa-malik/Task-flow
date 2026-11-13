import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getWorkflowStatesByTeam,
  ensureTeamWorkflowStates,
  createWorkflowState,
  updateWorkflowState,
  deleteWorkflowState,
} from "./workflowState.service.js";

export const getStates = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { teamId, workspaceId } = req.query;

    if (!teamId) {
      res.status(400).json({
        success: false,
        message: "teamId query parameter is required",
      });
      return;
    }

    const states = await getWorkflowStatesByTeam(
      teamId as string,
      workspaceId as string | undefined
    );

    res.json({
      success: true,
      data: states,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch workflow states",
    });
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { teamId, workspaceId, name, color, type, position, description } =
      req.body;

    if (!teamId || !workspaceId || !name?.trim() || !type) {
      res.status(400).json({
        success: false,
        message: "teamId, workspaceId, name, and type are required",
      });
      return;
    }

    const state = await createWorkflowState({
      teamId,
      workspaceId,
      name,
      color,
      type,
      position,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Workflow state created successfully",
      data: state,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create workflow state",
    });
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const state = await updateWorkflowState(id, req.body);

    if (!state) {
      res.status(404).json({
        success: false,
        message: "Workflow state not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Workflow state updated successfully",
      data: state,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update workflow state",
    });
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id || "");
    const state = await deleteWorkflowState(id);

    if (!state) {
      res.status(404).json({
        success: false,
        message: "Workflow state not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Workflow state deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete workflow state",
    });
  }
};
