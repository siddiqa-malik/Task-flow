import mongoose from "mongoose";
import { Project } from "./project.model.js";
import { ProjectMember } from "../projectMembers/projectMember.model.js";
import { Task } from "../tasks/task.model.js";
import { Comment } from "../comments/comment.model.js";
import { Invitation } from "../invitations/invitation.model.js";
import { Notification } from "../notifications/notification.model.js";

interface CreateProjectData {
    name: string;
    description?: string;
    startDate?: Date;
    dueDate?: Date;
}

export const createProject = async (
    data: CreateProjectData,
    ownerId: string
) => {
    const cleanOwnerId = ownerId.trim();

    const project = await Project.create({
        name: data.name.trim(),
        description: data.description ? data.description.trim() : undefined,
        ownerId: new mongoose.Types.ObjectId(cleanOwnerId),
        startDate: data.startDate,
        dueDate: data.dueDate,
    });

    await ProjectMember.create({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(cleanOwnerId),
        role: "owner",
    });

    const populatedProject = await Project.findById(project._id)
        .populate("ownerId", "name email avatar role");

    return populatedProject;
};

export const getProjects = async (userId: string) => {
    const cleanUserId = userId.trim();

    if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
        throw new Error("Invalid user ID");
    }

    const userObjectId = new mongoose.Types.ObjectId(cleanUserId);

    // 1. Find all projects where user is explicitly added as a member
    const memberships = await ProjectMember.find({
        userId: userObjectId,
    }).select("projectId role");

    const memberProjectIds = memberships.map((m) => m.projectId);

    // 2. Query projects where user is owner OR user is a member
    const projects = await Project.find({
        $or: [
            { ownerId: userObjectId },
            { _id: { $in: memberProjectIds } },
        ],
    })
        .populate("ownerId", "name email avatar role")
        .sort({ createdAt: -1 })
        .lean();

    // 3. Attach user role for each project so the client knows what permissions they have
    const membershipMap = new Map<string, string>();
    memberships.forEach((m) => {
        membershipMap.set(m.projectId.toString(), m.role);
    });

    const formattedProjects = projects.map((proj) => {
        const ownerUser: any = proj.ownerId;
        const ownerIdStr = ownerUser?._id ? ownerUser._id.toString() : proj.ownerId.toString();
        const isOwner = ownerIdStr === cleanUserId;
        const role = isOwner ? "owner" : (membershipMap.get(proj._id.toString()) || "member");

        return {
            ...proj,
            currentUserRole: role,
        };
    });

    return formattedProjects;
};

export const getProjectById = async (
    projectId: string,
    userId: string
) => {
    const cleanProjectId = projectId.trim();
    const cleanUserId = userId.trim();

    if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
        throw new Error("Invalid project ID");
    }

    if (!mongoose.Types.ObjectId.isValid(cleanUserId)) {
        throw new Error("Invalid user ID");
    }

    const project = await Project.findById(cleanProjectId)
        .populate("ownerId", "name email avatar role")
        .lean();

    if (!project) {
        throw new Error("Project not found");
    }

    const ownerUser: any = project.ownerId;
    const ownerIdStr = ownerUser?._id ? ownerUser._id.toString() : project.ownerId.toString();
    const isOwner = ownerIdStr === cleanUserId;

    // Check if user is a member of the project
    const membership = await ProjectMember.findOne({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(cleanUserId),
    });

    if (!isOwner && !membership) {
        throw new Error("You do not have access to view this project");
    }

    const role = isOwner ? "owner" : membership?.role || "member";

    return {
        ...project,
        currentUserRole: role,
    };
};

interface UpdateProjectData {
    name?: string;
    description?: string;
    status?: "active" | "archived";
    startDate?: Date;
    dueDate?: Date;
}

export const updateProject = async (
    projectId: string,
    userId: string,
    data: UpdateProjectData
) => {
    const cleanProjectId = projectId.trim();
    const cleanUserId = userId.trim();

    if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
        throw new Error("Invalid project ID");
    }

    const project = await Project.findById(cleanProjectId);
    if (!project) {
        throw new Error("Project not found");
    }

    // Permission check: Owner or Manager can update project details
    const isOwner = project.ownerId.toString() === cleanUserId;
    const isManager = await ProjectMember.findOne({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(cleanUserId),
        role: "manager",
    });

    if (!isOwner && !isManager) {
        throw new Error("Only project owners and managers can update project details");
    }

    const updatedProject = await Project.findByIdAndUpdate(
        cleanProjectId,
        { $set: data },
        { new: true, runValidators: true }
    ).populate("ownerId", "name email avatar role");

    return updatedProject;
};

export const deleteProject = async (
    projectId: string,
    userId: string
) => {
    const cleanProjectId = projectId.trim();
    const cleanUserId = userId.trim();

    if (!mongoose.Types.ObjectId.isValid(cleanProjectId)) {
        throw new Error("Invalid project ID");
    }

    const project = await Project.findById(cleanProjectId);
    if (!project) {
        throw new Error("Project not found");
    }

    // Only project owner can delete the project
    if (project.ownerId.toString() !== cleanUserId) {
        throw new Error("Only the project owner can delete this project");
    }

    // CASCADING DELETE: Clean up all child resources to prevent orphaned records in MongoDB
    // 1. Find all task IDs of this project
    const projectTasks = await Task.find({ projectId: cleanProjectId }).select("_id");
    const taskIds = projectTasks.map((t) => t._id);

    // 2. Delete all comments on those tasks
    if (taskIds.length > 0) {
        await Comment.deleteMany({ taskId: { $in: taskIds } });
    }

    // 3. Delete all tasks of this project
    await Task.deleteMany({ projectId: cleanProjectId });

    // 4. Delete all project members
    await ProjectMember.deleteMany({ projectId: cleanProjectId });

    // 5. Delete all invitations for this project
    await Invitation.deleteMany({ projectId: cleanProjectId });

    // 6. Delete all notifications tied to this project
    await Notification.deleteMany({ projectId: cleanProjectId });

    // 7. Finally, delete the project
    await Project.findByIdAndDelete(cleanProjectId);

    return {
        message: "Project and all associated tasks, members, and data deleted successfully",
    };
};