import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "./task.service.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskFilterSchema,
} from "./task.validation.js";

// =====================================================
// CREATE TASK CONTROLLER
// =====================================================
export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

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

    const task = await createTask(projectId, userId, validatedData);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create task",
    });
  }
};

// =====================================================
// GET ALL TASKS FOR A PROJECT CONTROLLER
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

    const filters = taskFilterSchema.parse(req.query);

    const tasks = await getProjectTasks(projectId, userId, filters);

    res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch tasks",
    });
  }
};

// =====================================================
// GET SINGLE TASK CONTROLLER
// =====================================================
export const getOne = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const taskId = req.params.taskId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!taskId || !isValidObjectId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing task ID",
      });
      return;
    }

    const task = await getTaskById(taskId, userId);

    res.status(200).json({
      success: true,
      message: "Task fetched successfully",
      data: task,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch task",
    });
  }
};

// =====================================================
// UPDATE TASK CONTROLLER
// =====================================================
export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = updateTaskSchema.parse(req.body);

    const taskId = req.params.taskId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!taskId || !isValidObjectId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing task ID",
      });
      return;
    }

    const task = await updateTask(taskId, userId, validatedData);

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update task",
    });
  }
};

// =====================================================
// DELETE TASK CONTROLLER
// =====================================================
export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const taskId = req.params.taskId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!taskId || !isValidObjectId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing task ID",
      });
      return;
    }

    const deleted = await deleteTask(taskId, userId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete task",
    });
  }
};
