import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from "./label.service.js";

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId, teamId } = req.query;

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: "workspaceId query parameter is required",
      });
      return;
    }

    const labels = await getLabels(
      workspaceId as string,
      teamId as string | undefined
    );

    res.json({
      success: true,
      data: labels,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch labels",
    });
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId, teamId, name, color, description } = req.body;

    if (!workspaceId || !name?.trim()) {
      res.status(400).json({
        success: false,
        message: "workspaceId and name are required",
      });
      return;
    }

    const label = await createLabel({
      workspaceId,
      teamId,
      name,
      color,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Label created successfully",
      data: label,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create label",
    });
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const label = await updateLabel(id, req.body);

    if (!label) {
      res.status(404).json({
        success: false,
        message: "Label not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Label updated successfully",
      data: label,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update label",
    });
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const label = await deleteLabel(id);

    if (!label) {
      res.status(404).json({
        success: false,
        message: "Label not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Label deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete label",
    });
  }
};
