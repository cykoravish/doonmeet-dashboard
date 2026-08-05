import { z } from "zod";

const CATEGORIES = ["tech", "nature", "food", "photography", "sports", "arts", "general"] as const;

export const createCommunitySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  description: z.string().trim().max(1000).optional().default(""),
  category: z.enum(CATEGORIES).optional().default("general"),
});

export const updateCommunitySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(CATEGORIES).optional(),
  isActive: z.boolean().optional(),
  announcementText: z.string().trim().max(300).nullable().optional(),
});
