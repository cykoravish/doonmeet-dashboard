import { z } from "zod";

const STATUSES = ["draft", "published", "cancelled"] as const;

export const createEventSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(100),
  description: z.string().trim().min(1, "Description is required").max(2000),
  locationName: z.string().trim().max(100).optional().default(""),
  locationAddress: z.string().trim().max(200).optional().default(""),
  date: z.coerce.date({ error: "A valid date is required" }),
  endsAt: z.coerce.date().nullable().optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(30)).max(5).optional().default([]),
  status: z.enum(STATUSES).optional().default("published"),
});

export const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  locationName: z.string().trim().max(100).optional(),
  locationAddress: z.string().trim().max(200).optional(),
  date: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(30)).max(5).optional(),
  status: z.enum(STATUSES).optional(),
});
