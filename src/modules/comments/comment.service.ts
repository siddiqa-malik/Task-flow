import mongoose from "mongoose";
import { Comment } from "./comment.model.js";
import { Task } from "../tasks/task.model.js";
import { Project } from "../projects/project.model.js";
import { ProjectMember } from "../projectMembers/projectMember.model.js";
import { createNotification } from "../notifications/notification.service.js";

// =====================================================
// ADD COMMENT TO A TASK
// =====================================================
export const addComment = async (
  taskId: string,
  userId: string,
  content: string
) => {
  const cleanTaskId = taskId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanTaskId)) {
    throw new Error("Invalid task ID");
  }

  // 1. Verify task exists
  const task = await Task.findById(cleanTaskId);
  if (!task) {
    throw new Error("Task not found");
  }

  // 2. Verify project exists
  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new Error("Associated project not found");
  }

  // 3. Authorization: User must be project owner or member
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to comment on this task");
  }

  // 4. Create comment
  const newComment = await Comment.create({
    taskId: task._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
    content: content.trim(),
  });

  // 5. Populate author info
  const populatedComment = await Comment.findById(newComment._id).populate(
    "userId",
    "name email avatar role"
  );

  // 6. Notify task assignee or creator (if not the commenter)
  const notifyTarget =
    task.assignedTo && task.assignedTo.toString() !== cleanUserId
      ? task.assignedTo
      : task.createdBy && task.createdBy.toString() !== cleanUserId
      ? task.createdBy
      : null;

  if (notifyTarget) {
    createNotification({
      userId: notifyTarget,
      type: "comment-added",
      message: `A new comment was added on task: "${task.title}"`,
      projectId: project._id,
      taskId: task._id,
    });
  }

  return populatedComment;
};

// =====================================================
// GET ALL COMMENTS FOR A TASK
// =====================================================
export const getTaskComments = async (taskId: string, userId: string) => {
  const cleanTaskId = taskId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanTaskId)) {
    throw new Error("Invalid task ID");
  }

  // 1. Verify task exists
  const task = await Task.findById(cleanTaskId);
  if (!task) {
    throw new Error("Task not found");
  }

  // 2. Verify project exists
  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new Error("Associated project not found");
  }

  // 3. Authorization
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to view comments for this task");
  }

  // 4. Fetch comments (oldest first for natural chat/discussion flow)
  const comments = await Comment.find({ taskId: task._id })
    .populate("userId", "name email avatar role")
    .sort({ createdAt: 1 });

  return comments;
};

// =====================================================
// GET SINGLE COMMENT BY ID
// =====================================================
export const getCommentById = async (commentId: string, userId: string) => {
  const cleanCommentId = commentId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanCommentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await Comment.findById(cleanCommentId).populate(
    "userId",
    "name email avatar role"
  );

  if (!comment) {
    throw new Error("Comment not found");
  }

  const task = await Task.findById(comment.taskId);
  if (!task) {
    throw new Error("Associated task not found");
  }

  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new Error("Associated project not found");
  }

  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to view this comment");
  }

  return comment;
};

// =====================================================
// UPDATE COMMENT
// =====================================================
export const updateComment = async (
  commentId: string,
  userId: string,
  content: string
) => {
  const cleanCommentId = commentId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanCommentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await Comment.findById(cleanCommentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  // Only the creator of the comment can edit it
  if (comment.userId.toString() !== cleanUserId) {
    throw new Error("You can only edit your own comments");
  }

  comment.content = content.trim();
  await comment.save();

  const populatedComment = await Comment.findById(comment._id).populate(
    "userId",
    "name email avatar role"
  );

  return populatedComment;
};

// =====================================================
// DELETE COMMENT
// =====================================================
export const deleteComment = async (commentId: string, userId: string) => {
  const cleanCommentId = commentId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanCommentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await Comment.findById(cleanCommentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  const task = await Task.findById(comment.taskId);
  if (!task) {
    // If task was deleted, comment can be cleaned up
    await Comment.findByIdAndDelete(cleanCommentId);
    return comment;
  }

  const project = await Project.findById(task.projectId);

  // Authorization:
  // 1. Comment creator can delete
  // 2. Project owner can delete
  // 3. Project manager can delete
  const isAuthor = comment.userId.toString() === cleanUserId;
  const isOwner = project?.ownerId.toString() === cleanUserId;
  const isManager = project
    ? await ProjectMember.findOne({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(cleanUserId),
        role: "manager",
      })
    : false;

  if (!isAuthor && !isOwner && !isManager) {
    throw new Error("You do not have permission to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(cleanCommentId);

  return deletedComment;
};
