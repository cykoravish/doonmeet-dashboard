import { z } from "zod";

export const createPlaceSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(100),
  image: z.string().trim().url("Must be a valid image URL"),
  category: z.string().trim().min(1, "Category is required").max(50),
  shortDescription: z.string().trim().min(1, "Short description is required").max(200),
  about: z.string().trim().min(1, "About is required"),
  highlights: z.array(z.string().trim().max(100)).max(10).optional().default([]),
  bestTimeToVisit: z.string().trim().max(200).optional().default(""),
  howToReach: z.string().trim().max(500).optional().default(""),
});

export const updatePlaceSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  image: z.string().trim().url().optional(),
  category: z.string().trim().min(1).max(50).optional(),
  shortDescription: z.string().trim().min(1).max(200).optional(),
  about: z.string().trim().min(1).optional(),
  highlights: z.array(z.string().trim().max(100)).max(10).optional(),
  bestTimeToVisit: z.string().trim().max(200).optional(),
  howToReach: z.string().trim().max(500).optional(),
});
