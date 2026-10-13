import { z } from "zod";

export const addProjectMemberSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email("Invalid email format").optional(),
    role: z.enum(["manager", "member"]).default("member"),
  })
  .refine((data) => Boolean(data.userId || data.email), {
    message: "Either userId or email is required",
  });

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(["manager", "member"]),
});
