import mongoose from "mongoose";
import { Project } from "../projects/project.model.js";
import { User } from "../users/user.model.js";
import { ProjectMember } from "./projectMember.model.js";

interface AddProjectMemberData {
    userId?: string;
    email?: string;
    role?: "manager" | "member";
}

// =====================================================
// ADD PROJECT MEMBER
// =====================================================

export const addProjectMember = async (
    projectId: string,
    ownerId: string,
    data: AddProjectMemberData
) => {
    const cleanProjectId = projectId.trim();
    const cleanOwnerId = ownerId.trim();

    // 1. Check if project exists and current user is owner
    const project = await Project.findOne({
        _id: cleanProjectId,
        ownerId: cleanOwnerId,
    });

    if (!project) {
        throw new Error("Project not found or you are not the owner");
    }

    // 2. Find the user that we want to add
    let user = null;

    if (data.email) {
        user = await User.findOne({
            email: data.email.toLowerCase().trim(),
        });
    } else if (data.userId) {
        user = await User.findById(data.userId.trim());
    }

    if (!user) {
        throw new Error("User not found with the provided userId or email");
    }

    // 3. Check if user is already the project owner
    if (project.ownerId.toString() === user._id.toString()) {
        throw new Error("This user is already the owner of the project");
    }

    // 4. Check if user is already a project member
    const existingMember = await ProjectMember.findOne({
        projectId: project._id,
        userId: user._id,
    });

    if (existingMember) {
        throw new Error("User is already a member of this project");
    }

    // 5. Create project member
    const projectMember = await ProjectMember.create({
        projectId: project._id,
        userId: user._id,
        role: data.role || "member",
    });

    // IMPORTANT DEBUG
    console.log(
        "CREATED PROJECT MEMBER:",
        projectMember.toObject()
    );

    // 6. Prepare user details
    const userDetails = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        role: user.role,
    };

    // 7. Return created member
    return {
        _id: projectMember._id,
        projectId: project._id,
        userId: userDetails,
        user: userDetails,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        role: projectMember.role,
        joinedAt: projectMember.joinedAt,
        createdAt: (projectMember as any).createdAt,
        updatedAt: (projectMember as any).updatedAt,
    };
};

// =====================================================
// GET ALL PROJECT MEMBERS
// =====================================================

export const getProjectMembers = async (
    projectId: string,
    userId: string
) => {
    const cleanProjectId = projectId.trim();
    const cleanUserId = userId.trim();

    // 1. Find project
    const project = await Project.findById(cleanProjectId).populate(
        "ownerId",
        "name email avatar role"
    );

    console.log("PROJECT FOUND:", project);

    if (!project) {
        throw new Error("Project not found");
    }

    // 2. Get owner ID
    const ownerUser: any = project.ownerId;

    const ownerIdStr = ownerUser?._id
        ? ownerUser._id.toString()
        : project.ownerId.toString();

    // 3. Check if current user is owner
    const isOwner = ownerIdStr === cleanUserId;

    // 4. If user is not owner, check if they are a member
    let isMember = null;

    if (!isOwner) {
        isMember = await ProjectMember.findOne({
            projectId: project._id,
            userId: cleanUserId,
        });
    }

    // 5. Authorization check
    if (!isOwner && !isMember) {
        throw new Error(
            "You do not have access to view members of this project"
        );
    }

    // =====================================================
    // GET PROJECT MEMBERS
    // =====================================================

    const projectMembers = await ProjectMember.find({
        projectId: project._id,
    })
        .populate(
            "userId",
            "name email avatar role"
        )
        .lean();

    console.log("PROJECT ID:", project._id.toString());

    console.log(
        "PROJECT MEMBERS:",
        projectMembers
    );

    // =====================================================
    // FORMAT MEMBERS
    // =====================================================

    const formattedMembers = projectMembers.map(
        (member: any) => {
            const memberUser = member.userId;

            return {
                _id: member._id,

                projectId: project._id,

                userId: memberUser,

                user: memberUser,

                name: memberUser?.name || "Unknown Member",

                email: memberUser?.email || "",

                avatar: memberUser?.avatar || null,

                role: member.role,

                joinedAt:
                    member.joinedAt ||
                    member.createdAt ||
                    new Date(),
            };
        }
    );

    // =====================================================
    // PROJECT OWNER
    // =====================================================

    const ownerDetails = {
        _id: ownerUser?._id || project.ownerId,

        name: ownerUser?.name || "Project Owner",

        email: ownerUser?.email || "",

        avatar: ownerUser?.avatar || null,

        role: ownerUser?.role || "user",
    };

    const ownerEntry = {
        _id: project._id,

        projectId: project._id,

        userId: ownerDetails,

        user: ownerDetails,

        name: ownerDetails.name,

        email: ownerDetails.email,

        avatar: ownerDetails.avatar,

        role: "owner" as const,

        joinedAt:
            (project as any).createdAt ||
            new Date(),
    };

    // =====================================================
    // CHECK IF OWNER ALREADY EXISTS IN MEMBERS
    // =====================================================

    const hasOwnerInMembers =
        formattedMembers.some((member: any) => {
            const memberUserId = member.userId?._id
                ? member.userId._id.toString()
                : member.userId?.toString();

            return memberUserId === ownerIdStr;
        });

    // =====================================================
    // FINAL MEMBERS LIST
    // =====================================================

    let finalMembers = formattedMembers;

    if (!hasOwnerInMembers) {
        finalMembers = [
            ownerEntry,
            ...formattedMembers,
        ];
    }

    return finalMembers;
};

// =====================================================
// REMOVE PROJECT MEMBER
// =====================================================

export const removeProjectMember = async (
    projectId: string,
    ownerId: string,
    memberId: string
) => {
    const cleanProjectId = projectId.trim();
    const cleanOwnerId = ownerId.trim();
    const cleanMemberId = memberId.trim();

    // 1. Check project owner
    const project = await Project.findOne({
        _id: cleanProjectId,
        ownerId: cleanOwnerId,
    });

    if (!project) {
        throw new Error(
            "Project not found or you are not the owner"
        );
    }

    // 2. Prevent removing the project owner
    if (
        cleanMemberId === cleanOwnerId ||
        cleanMemberId === project.ownerId.toString()
    ) {
        throw new Error(
            "The project owner cannot be removed from the project"
        );
    }

    const memberObjId = mongoose.Types.ObjectId.isValid(cleanMemberId)
        ? new mongoose.Types.ObjectId(cleanMemberId)
        : null;

    const projectObjId = mongoose.Types.ObjectId.isValid(cleanProjectId)
        ? new mongoose.Types.ObjectId(cleanProjectId)
        : null;

    // 3. Find and delete member (only removes the relationship in ProjectMember, User account remains intact)
    const member = await ProjectMember.findOneAndDelete({
        $or: [
            { projectId: cleanProjectId },
            ...(projectObjId ? [{ projectId: projectObjId }] : []),
            { projectId: project._id },
        ],
        $or: [
            { _id: cleanMemberId },
            ...(memberObjId ? [{ _id: memberObjId }] : []),
            { userId: cleanMemberId },
            ...(memberObjId ? [{ userId: memberObjId }] : []),
        ],
    }).populate("userId", "name email avatar role");

    if (!member) {
        // Check if member exists in another project to give an accurate error message
        const existsElsewhere = await ProjectMember.findOne({
            $or: [
                { _id: cleanMemberId },
                ...(memberObjId ? [{ _id: memberObjId }] : []),
                { userId: cleanMemberId },
                ...(memberObjId ? [{ userId: memberObjId }] : []),
            ],
        });

        if (existsElsewhere) {
            throw new Error(
                `Member is in project (${existsElsewhere.projectId}), not in this project (${cleanProjectId})`
            );
        }

        throw new Error("Member not found in this project");
    }

    return member;
};

// =====================================================
// UPDATE PROJECT MEMBER ROLE
// =====================================================

export const updateProjectMemberRole = async (
    projectId: string,
    ownerId: string,
    memberId: string,
    role: "manager" | "member"
) => {
    const cleanProjectId = projectId.trim();
    const cleanOwnerId = ownerId.trim();
    const cleanMemberId = memberId.trim();

    // 1. Check project owner
    const project = await Project.findOne({
        _id: cleanProjectId,
        ownerId: cleanOwnerId,
    });

    if (!project) {
        throw new Error(
            "Project not found or you are not the owner"
        );
    }

    // 2. Update member role
    const member =
        await ProjectMember.findOneAndUpdate(
            {
                projectId: project._id,

                $or: [
                    {
                        _id: cleanMemberId,
                    },

                    ...(mongoose.Types.ObjectId.isValid(
                        cleanMemberId
                    )
                        ? [
                            {
                                _id: new mongoose.Types.ObjectId(
                                    cleanMemberId
                                ),
                            },
                            {
                                userId:
                                    new mongoose.Types.ObjectId(
                                        cleanMemberId
                                    ),
                            },
                        ]
                        : [
                            {
                                userId: cleanMemberId,
                            },
                        ]),
                ],
            },

            {
                role,
            },

            {
                new: true,
            }
        ).populate(
            "userId",
            "name email avatar role"
        );

    if (!member) {
        throw new Error(
            "Member not found in this project"
        );
    }

    return member;
};

// =====================================================
// GET SINGLE PROJECT MEMBER
// =====================================================

export const getProjectMemberById = async (
    projectId: string,
    userId: string,
    memberId: string
) => {
    const cleanProjectId = projectId.trim();
    const cleanMemberId = memberId.trim();

    // 1. Verify project exists
    const project = await Project.findById(cleanProjectId).populate(
        "ownerId",
        "name email avatar role"
    );

    if (!project) {
        throw new Error("Project not found");
    }

    // 2. Check authorization
    const ownerUser: any = project.ownerId;
    const ownerIdStr = ownerUser?._id
        ? ownerUser._id.toString()
        : project.ownerId.toString();

    const isOwner = ownerIdStr === userId.trim();
    const isMember = await ProjectMember.findOne({
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(userId.trim()),
    });

    if (!isOwner && !isMember) {
        throw new Error("You do not have access to view this project");
    }

    // 3. If requested memberId is the owner
    if (
        cleanMemberId === ownerIdStr ||
        cleanMemberId === project._id.toString()
    ) {
        return {
            _id: project._id,
            projectId: project._id,
            userId: ownerUser,
            user: ownerUser,
            name: ownerUser?.name || "Project Owner",
            email: ownerUser?.email || "",
            avatar: ownerUser?.avatar || null,
            role: "owner" as const,
            joinedAt: (project as any).createdAt || new Date(),
        };
    }

    // 4. Find member in ProjectMember collection
    const member = await ProjectMember.findOne({
        projectId: project._id,
        $or: [
            { _id: cleanMemberId },
            ...(mongoose.Types.ObjectId.isValid(cleanMemberId)
                ? [
                    { _id: new mongoose.Types.ObjectId(cleanMemberId) },
                    { userId: new mongoose.Types.ObjectId(cleanMemberId) },
                ]
                : [{ userId: cleanMemberId }]),
        ],
    }).populate("userId", "name email avatar role");

    if (!member) {
        throw new Error("Project member not found");
    }

    const u: any = member.userId;
    return {
        _id: member._id,
        projectId: project._id,
        userId: u,
        user: u,
        name: u?.name || "Unknown Member",
        email: u?.email || "",
        avatar: u?.avatar || null,
        role: member.role,
        joinedAt: member.joinedAt || (member as any).createdAt,
    };
};