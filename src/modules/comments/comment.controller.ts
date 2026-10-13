import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  addComment,
  getTaskComments,
  getCommentById,
  updateComment,
  deleteComment,
} from "./comment.service.js";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validation.js";

// =====================================================
// ADD COMMENT CONTROLLER
// =====================================================
export const create = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createCommentSchema.parse(req.body);
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

    const comment = await addComment(taskId, userId, validatedData.content);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to add comment",
    });
  }
};

// =====================================================
// GET ALL COMMENTS FOR A TASK CONTROLLER
// =====================================================
export const getAllForTask = async (
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

    const comments = await getTaskComments(taskId, userId);

    res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch comments",
    });
  }
};

// =====================================================
// GET SINGLE COMMENT CONTROLLER
// =====================================================
export const getOne = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const commentId = req.params.commentId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!commentId || !isValidObjectId(commentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing comment ID",
      });
      return;
    }

    const comment = await getCommentById(commentId, userId);

    res.status(200).json({
      success: true,
      message: "Comment fetched successfully",
      data: comment,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch comment",
    });
  }
};

// =====================================================
// UPDATE COMMENT CONTROLLER
// =====================================================
export const update = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validatedData = updateCommentSchema.parse(req.body);
    const commentId = req.params.commentId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!commentId || !isValidObjectId(commentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing comment ID",
      });
      return;
    }

    const updated = await updateComment(
      commentId,
      userId,
      validatedData.content
    );

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update comment",
    });
  }
};

// =====================================================
// DELETE COMMENT CONTROLLER
// =====================================================
export const remove = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const commentId = req.params.commentId?.trim();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!commentId || !isValidObjectId(commentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing comment ID",
      });
      return;
    }

    const deleted = await deleteComment(commentId, userId);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete comment",
    });
  }
};
