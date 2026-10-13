import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(200, "Title cannot exceed 200 characters")
    .trim(),

  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),

  assignedTo: z
    .string()
    .optional()
    .nullable(),

  status: z
    .enum(["todo", "in-progress", "completed"])
    .default("todo"),

  priority: z
    .enum(["low", "medium", "high"])
    .default("medium"),

  dueDate: z
    .coerce.date()
    .optional()
    .nullable(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title cannot be empty")
    .max(200, "Title cannot exceed 200 characters")
    .trim()
    .optional(),

  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),

  assignedTo: z
    .string()
    .optional()
    .nullable(),

  status: z
    .enum(["todo", "in-progress", "completed"])
    .optional(),

  priority: z
    .enum(["low", "medium", "high"])
    .optional(),

  dueDate: z
    .coerce.date()
    .optional()
    .nullable(),
});

export const taskFilterSchema = z.object({
  status: z.enum(["todo", "in-progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
});
