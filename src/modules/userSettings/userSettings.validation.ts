import { z } from "zod";

export const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  compactView: z.boolean().optional(),
});
