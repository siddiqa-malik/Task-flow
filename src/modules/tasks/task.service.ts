import mongoose from "mongoose";
import { Task } from "./task.model.js";
import { Project } from "../projects/project.model.js";
import { ProjectMember } from "../projectMembers/projectMember.model.js";
import { User } from "../users/user.model.js";
import { Comment } from "../comments/comment.model.js";
import { Notification } from "../notifications/notification.model.js";
import { createNotification } from "../notifications/notification.service.js";

interface CreateTaskInput {
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  status?: "todo" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: Date | null;
}

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  status?: "todo" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: Date | null;
}

interface TaskFilters {
  status?: "todo" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  assignedTo?: string;
  search?: string;
}

// =====================================================
// CREATE TASK
// =====================================================
export const createTask = async (
  projectId: string,
  userId: string,
  data: CreateTaskInput
) => {
  const cleanProjectId = projectId.trim();
  const cleanUserId = userId.trim();

  // 1. Verify project exists
  const project = await Project.findById(cleanProjectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Authorization: verify user is owner or member of this project
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to create tasks in this project");
  }

  // 3. If assignedTo is provided, verify user exists and belongs to this project
  let cleanAssignedTo: mongoose.Types.ObjectId | null = null;

  if (data.assignedTo && data.assignedTo.trim() !== "") {
    const targetUserId = data.assignedTo.trim();

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new Error("Invalid assignedTo user ID");
    }

    const assignedUser = await User.findById(targetUserId);
    if (!assignedUser) {
      throw new Error("Assigned user not found");
    }

    const isAssignedOwner = project.ownerId.toString() === targetUserId;
    const isAssignedMember = await ProjectMember.findOne({
      projectId: project._id,
      userId: new mongoose.Types.ObjectId(targetUserId),
    });

    if (!isAssignedOwner && !isAssignedMember) {
      throw new Error("Cannot assign task to a user who is not a member of this project");
    }

    cleanAssignedTo = new mongoose.Types.ObjectId(targetUserId);
  }

  // 4. Create task
  const task = await Task.create({
    projectId: project._id,
    title: data.title.trim(),
    description: data.description ? data.description.trim() : undefined,
    createdBy: new mongoose.Types.ObjectId(cleanUserId),
    assignedTo: cleanAssignedTo,
    status: data.status || "todo",
    priority: data.priority || "medium",
    dueDate: data.dueDate || undefined,
  });

  // 5. Populate and return task
  const populatedTask = await Task.findById(task._id)
    .populate("createdBy", "name email avatar role")
    .populate("assignedTo", "name email avatar role")
    .populate("projectId", "name");

  // 6. Notify assigned user (if assigned to someone else)
  if (cleanAssignedTo && cleanAssignedTo.toString() !== cleanUserId) {
    createNotification({
      userId: cleanAssignedTo,
      type: "task-assigned",
      message: `You were assigned to task: "${task.title}" in project "${project.name}"`,
      projectId: project._id,
      taskId: task._id,
    });
  }

  return populatedTask;
};

// =====================================================
// GET PROJECT TASKS (WITH FILTERS & SEARCH)
// =====================================================
export const getProjectTasks = async (
  projectId: string,
  userId: string,
  filters: TaskFilters = {}
) => {
  const cleanProjectId = projectId.trim();
  const cleanUserId = userId.trim();

  // 1. Verify project exists
  const project = await Project.findById(cleanProjectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Authorization
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to view tasks for this project");
  }

  // 3. Build query filter
  const query: any = {
    projectId: project._id,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo && mongoose.Types.ObjectId.isValid(filters.assignedTo.trim())) {
    query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo.trim());
  }

  if (filters.search && filters.search.trim() !== "") {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];
  }

  // 4. Fetch tasks
  const tasks = await Task.find(query)
    .populate("createdBy", "name email avatar role")
    .populate("assignedTo", "name email avatar role")
    .sort({ createdAt: -1 });

  return tasks;
};

// =====================================================
// GET SINGLE TASK BY ID
// =====================================================
export const getTaskById = async (taskId: string, userId: string) => {
  const cleanTaskId = taskId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanTaskId)) {
    throw new Error("Invalid task ID");
  }

  const task = await Task.findById(cleanTaskId)
    .populate("createdBy", "name email avatar role")
    .populate("assignedTo", "name email avatar role")
    .populate("projectId", "name description ownerId");

  if (!task) {
    throw new Error("Task not found");
  }

  // Authorization check on project
  const project: any = task.projectId;
  const isOwner = project?.ownerId?.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project?._id || task.projectId,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to view this task");
  }

  return task;
};

// =====================================================
// UPDATE TASK
// =====================================================
export const updateTask = async (
  taskId: string,
  userId: string,
  data: UpdateTaskInput
) => {
  const cleanTaskId = taskId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanTaskId)) {
    throw new Error("Invalid task ID");
  }

  const task = await Task.findById(cleanTaskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new Error("Associated project not found");
  }

  // Authorization: user must be project owner or member
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isMember = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
  });

  if (!isOwner && !isMember) {
    throw new Error("You do not have access to update tasks in this project");
  }

  // If assignedTo is being changed, verify target user is member or owner
  const updatePayload: any = {};

  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description ? data.description.trim() : null;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;

  if (data.assignedTo !== undefined) {
    if (data.assignedTo === null || data.assignedTo.trim() === "") {
      updatePayload.assignedTo = null;
    } else {
      const targetUserId = data.assignedTo.trim();

      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new Error("Invalid assignedTo user ID");
      }

      const assignedUser = await User.findById(targetUserId);
      if (!assignedUser) {
        throw new Error("Assigned user not found");
      }

      const isAssignedOwner = project.ownerId.toString() === targetUserId;
      const isAssignedMember = await ProjectMember.findOne({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(targetUserId),
      });

      if (!isAssignedOwner && !isAssignedMember) {
        throw new Error("Cannot assign task to a user who is not a member of this project");
      }

      updatePayload.assignedTo = new mongoose.Types.ObjectId(targetUserId);
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(
    cleanTaskId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  )
    .populate("createdBy", "name email avatar role")
    .populate("assignedTo", "name email avatar role")
    .populate("projectId", "name");

  if (
    updatePayload.assignedTo &&
    updatePayload.assignedTo.toString() !== cleanUserId
  ) {
    createNotification({
      userId: updatePayload.assignedTo,
      type: "task-assigned",
      message: `You were assigned to task: "${updatedTask?.title || "Task"}" in project "${project.name}"`,
      projectId: project._id,
      taskId: cleanTaskId,
    });
  }

  return updatedTask;
};

// =====================================================
// DELETE TASK
// =====================================================
export const deleteTask = async (taskId: string, userId: string) => {
  const cleanTaskId = taskId.trim();
  const cleanUserId = userId.trim();

  if (!mongoose.Types.ObjectId.isValid(cleanTaskId)) {
    throw new Error("Invalid task ID");
  }

  const task = await Task.findById(cleanTaskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const project = await Project.findById(task.projectId);
  if (!project) {
    throw new Error("Associated project not found");
  }

  // Permission: Owner of project, creator of task, or project manager can delete
  const isOwner = project.ownerId.toString() === cleanUserId;
  const isCreator = task.createdBy.toString() === cleanUserId;
  const isManager = await ProjectMember.findOne({
    projectId: project._id,
    userId: new mongoose.Types.ObjectId(cleanUserId),
    role: "manager",
  });

  if (!isOwner && !isCreator && !isManager) {
    throw new Error("You do not have permission to delete this task");
  }

  const deletedTask = await Task.findByIdAndDelete(cleanTaskId)
    .populate("createdBy", "name email avatar role")
    .populate("assignedTo", "name email avatar role");

  if (deletedTask) {
    // Cascading delete: clean up comments and notifications for this task
    await Comment.deleteMany({ taskId: cleanTaskId });
    await Notification.deleteMany({ taskId: cleanTaskId });
  }

  return deletedTask;
};
