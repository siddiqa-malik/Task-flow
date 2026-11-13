import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .trim()
    .optional(),

  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim()
    .optional(),

  title: z
    .string()
    .max(100, "Title cannot exceed 100 characters")
    .trim()
    .optional()
    .nullable(),

  username: z
    .string()
    .max(50, "Username cannot exceed 50 characters")
    .trim()
    .optional()
    .nullable(),

  avatar: z
    .string()
    .max(500, "Avatar URL is too long")
    .optional()
    .nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(6, "Current password must be at least 6 characters"),

  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters"),
});
