import mongoose from "mongoose";
import { Project } from "./project.model.js";
import { ProjectMember } from "../projectMembers/projectMember.model.js";
import { Issue } from "../issues/issue.model.js";
import { Comment } from "../comments/comment.model.js";
import { Invitation } from "../invitations/invitation.model.js";
import { Notification } from "../notifications/notification.model.js";
import { User } from "../users/user.model.js";

interface CreateProjectData {
    name: string;
    description?: string;
    startDate?: Date;
    dueDate?: Date;
    priority?: string;
    projectStatus?: string;
    lead?: any;
    teamId?: string;
    teamName?: string;
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
        priority: data.priority || "none",
        projectStatus: data.projectStatus || "planned",
        lead: data.lead,
        teamId: data.teamId,
        teamName: data.teamName,
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
    priority?: string;
    projectStatus?: string;
    lead?: any;
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

    // Allow project owner, workspace admin, or project manager to delete the project
    const isOwner = project.ownerId && project.ownerId.toString() === cleanUserId;
    if (!isOwner) {
        const user = await User.findById(cleanUserId);
        const isAdmin = user && user.role === "admin";
        const isManager = await ProjectMember.findOne({
            projectId: new mongoose.Types.ObjectId(cleanProjectId),
            userId: new mongoose.Types.ObjectId(cleanUserId),
            role: { $in: ["owner", "manager"] as any },
        });
        if (!isAdmin && !isManager) {
            throw new Error("Only the project owner or administrator can delete this project");
        }
    }

    // Robust query matching both ObjectId and string formats of projectId
    const objProjId = new mongoose.Types.ObjectId(cleanProjectId);
    const projQuery: any = {
        $or: [{ projectId: objProjId }, { projectId: cleanProjectId }],
    };

    // CASCADING DELETE: Clean up all child resources to prevent orphaned records in MongoDB
    // 1. Find all issue IDs of this project
    const projectIssues = await Issue.find(projQuery).select("_id");
    const issueIds = projectIssues.map((t: any) => t._id);

    // 2. Delete all comments on those issues
    if (issueIds.length > 0) {
        await Comment.deleteMany({
            $or: [{ issueId: { $in: issueIds } }, { taskId: { $in: issueIds } }],
        });
    }

    // 3. Delete all issues of this project
    await Issue.deleteMany(projQuery);

    // 4. Delete all project members
    await ProjectMember.deleteMany({
        $or: [{ projectId: objProjId }, { projectId: cleanProjectId }],
    });

    // 5. Delete all invitations for this project
    await Invitation.deleteMany({
        $or: [{ projectId: objProjId }, { projectId: cleanProjectId }],
    });

    // 6. Delete all notifications tied to this project
    await Notification.deleteMany({
        $or: [{ projectId: objProjId }, { projectId: cleanProjectId }],
    });

    // 7. Finally, delete the project
    await Project.findByIdAndDelete(cleanProjectId);

    return {
        message: "Project and all associated tasks, members, and data deleted successfully",
    };
};
