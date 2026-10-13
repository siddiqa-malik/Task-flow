import { Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import { createProjectSchema, updateProjectSchema } from "./project.validation.js";
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
} from "./project.service.js";
export const create = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const validatedData = createProjectSchema.parse(req.body);

        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });

            return;
        }

        const project = await createProject(
            validatedData,
            userId
        );

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: project,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create project",
        });
    }
};

export const getAll = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });

            return;
        }

        const projects = await getProjects(userId);

        res.status(200).json({
            success: true,
            data: projects,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch projects",
        });
    }
};

export const getOne = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const projectId = req.params.id;
        const userId = req.user?.id;

        // 1. Project ID check karein
        if (!projectId || typeof projectId !== "string" || !isValidObjectId(projectId)) {
            res.status(400).json({
                success: false,
                message: "Invalid or missing project ID",
            });
            return;
        }

        // 2. User ID check karein
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const project = await getProjectById(
            projectId,
            userId
        );

        res.status(200).json({
            success: true,
            data: project,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Project not found",
        });
    }
};

export const update = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const validatedData = updateProjectSchema.parse(req.body);

        const projectId = req.params.id;
        const userId = req.user?.id;

        if (!projectId || typeof projectId !== "string" || !isValidObjectId(projectId)) {
            res.status(400).json({
                success: false,
                message: "Invalid or missing project ID",
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const project = await updateProject(
            projectId,
            userId,
            validatedData
        );

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: project,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to update project";
        const statusCode = message === "Project not found" ? 404 : 400;

        res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

export const remove = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const projectId = req.params.id;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        if (!projectId || typeof projectId !== "string" || !isValidObjectId(projectId)) {
            res.status(400).json({
                success: false,
                message: "Invalid or missing project ID",
            });
            return;
        }

        await deleteProject(projectId, userId);


        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Project not found",
        });
    }
};