import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .trim(),

  email: z
    .string()
    .email("Please provide a valid email")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email")
    .trim()
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "New password must be at least 6 characters"),
});