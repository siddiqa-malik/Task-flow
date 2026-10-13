import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  role: z
    .enum(["manager", "member"])
    .default("member"),
});
