import { z } from "zod";

export const createProjectSchema = z.object({
    name: z
        .string()
        .min(2, "Project name must be at least 2 characters")
        .max(100, "Project name cannot exceed 100 characters")
        .trim(),

    description: z
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .trim()
        .optional(),

    startDate: z.coerce.date().optional(),

    dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = z.object({
    name: z
        .string()
        .min(2, "Project name must be at least 2 characters")
        .max(100, "Project name cannot exceed 100 characters")
        .trim()
        .optional(),

    description: z
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .trim()
        .optional(),

    status: z
        .enum(["active", "archived"])
        .optional(),

    startDate: z
        .coerce
        .date()
        .optional(),

    dueDate: z
        .coerce
        .date()
        .optional(),
});