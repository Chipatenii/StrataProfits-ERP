import { z } from "zod"

export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
    assigned_to: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    estimated_hours: z.number().min(0).nullable().optional(),
    created_by: z.string().uuid("Invalid creator ID").optional(),
})

export const updateMemberSchema = z.object({
    role: z.string().optional(),
    hourly_rate: z.number().min(0).optional(),
})

export const updateProfileSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    fullName: z.string().min(1, "Full name is required"),
})
