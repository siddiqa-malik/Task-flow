import mongoose from "mongoose";
import { Comment } from "./comment.model.js";
import { Issue } from "../issues/issue.model.js";
import { createNotification } from "../notifications/notification.service.js";

// =====================================================
// ADD COMMENT TO AN ISSUE / TASK
// =====================================================
export const addComment = async (
  issueOrTaskId: string,
  userId: string,
  content: string
) => {
  const cleanId = issueOrTaskId.trim();
  const cleanUserId = userId.trim();

  let issue;
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    issue = await Issue.findById(cleanId);
  }
  if (!issue) {
    issue = await Issue.findOne({ identifier: cleanId.toUpperCase() });
  }

  if (!issue) {
    throw new Error("Issue not found");
  }

  // Create comment
  const newComment = await Comment.create({
    issueId: issue._id,
    taskId: issue._id, // Backward compatibility
    userId: new mongoose.Types.ObjectId(cleanUserId),
    content: content.trim(),
  });

  // Populate author info
  const populatedComment = await Comment.findById(newComment._id).populate(
    "userId",
    "name email avatar role"
  );

  // Notify issue assignee or creator (if not the commenter)
  const notifyTarget =
    issue.assignedTo && issue.assignedTo.toString() !== cleanUserId
      ? issue.assignedTo
      : issue.createdBy && issue.createdBy.toString() !== cleanUserId
      ? issue.createdBy
      : null;

  if (notifyTarget) {
    createNotification({
      userId: notifyTarget as any,
      type: "comment-added",
      message: `A new comment was added on issue "${issue.identifier || issue.title}"`,
      projectId: issue.projectId,
      issueId: issue._id as any,
    });
  }

  return populatedComment;
};

// =====================================================
// GET ALL COMMENTS FOR AN ISSUE / TASK
// =====================================================
export const getIssueComments = async (
  issueOrTaskId: string,
  _userId: string
) => {
  const cleanId = issueOrTaskId.trim();

  let issue;
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    issue = await Issue.findById(cleanId);
  }
  if (!issue) {
    issue = await Issue.findOne({ identifier: cleanId.toUpperCase() });
  }

  const queryId = issue
    ? issue._id
    : mongoose.Types.ObjectId.isValid(cleanId)
    ? new mongoose.Types.ObjectId(cleanId)
    : null;

  if (!queryId) return [];

  const comments = await Comment.find({
    $or: [{ issueId: queryId }, { taskId: queryId }],
  })
    .populate("userId", "name email avatar role")
    .sort({ createdAt: 1 });

  return comments;
};

export const getTaskComments = getIssueComments;

// =====================================================
// GET SINGLE COMMENT BY ID
// =====================================================
export const getCommentById = async (commentId: string, _userId: string) => {
  const cleanCommentId = commentId.trim();

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

  const isAuthor = comment.userId.toString() === cleanUserId;
  if (!isAuthor) {
    throw new Error("You do not have permission to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(cleanCommentId);
  return deletedComment;
};
