import { Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  getCyclesByTeam,
  getCycleById,
  createCycle,
  updateCycle,
  deleteCycle,
} from "./cycle.service.js";

export const getByTeam = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { teamId, status } = req.query;

    if (!teamId) {
      res.status(400).json({
        success: false,
        message: "teamId query parameter is required",
      });
      return;
    }

    const cycles = await getCyclesByTeam(
      teamId as string,
      status as string | undefined
    );

    res.json({
      success: true,
      data: cycles,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch cycles",
    });
  }
};

export const getOne = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await getCycleById(id);

    if (!cycle) {
      res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
      return;
    }

    res.json({
      success: true,
      data: cycle,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch cycle",
    });
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { teamId, workspaceId, name, description, startsAt, endsAt } = req.body;

    if (!teamId || !workspaceId || !startsAt || !endsAt) {
      res.status(400).json({
        success: false,
        message: "teamId, workspaceId, startsAt, and endsAt are required",
      });
      return;
    }

    const cycle = await createCycle({
      teamId,
      workspaceId,
      name,
      description,
      startsAt,
      endsAt,
    });

    res.status(201).json({
      success: true,
      message: "Cycle created successfully",
      data: cycle,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create cycle",
    });
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await updateCycle(id, req.body);

    if (!cycle) {
      res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Cycle updated successfully",
      data: cycle,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update cycle",
    });
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cycle = await deleteCycle(id);

    if (!cycle) {
      res.status(404).json({
        success: false,
        message: "Cycle not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Cycle deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete cycle",
    });
  }
};
