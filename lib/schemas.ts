import { z } from "zod"

// Canonical set of task statuses — shared by schema validation and TypeScript types.
export const TASK_STATUSES = [
  "todo",
  "pending",
  "pending_approval",
  "in_progress",
  "completed",
  "verified",
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(["low", "medium", "high"]),
  assigned_to: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  estimated_hours: z.number().min(0).nullable().optional(),
  project_id: z.string().uuid("Invalid project ID").nullable().optional(),
  deliverable_id: z.string().uuid("Invalid deliverable ID").nullable().optional(), // Stage 1
  created_by: z.string().uuid("Invalid creator ID").optional(),
})

export const createSelfTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_project_related: z.boolean().default(false),
  project_id: z.string().uuid("Invalid project ID").optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().min(0).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]),
})

export const updateMemberSchema = z.object({
  role: z.enum([
    "admin", "team_member", "virtual_assistant", "developer",
    "social_media_manager", "book_keeper", "marketing", "sales",
    "graphic_designer", "client"
  ] as const).optional(),
  hourly_rate: z.number().min(0).optional(),
})

export const updateProfileSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  fullName: z.string().min(1, "Full name is required"),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "archived", "completed"]),
})

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["manager", "member", "viewer"]),
})

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  business_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  tpin: z.string().optional(),
  contact_person: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(["dev", "design", "marketing", "mixed"]),
  value_tier: z.enum(["Standard", "Premium", "HighValue"]),
  status: z.enum(["Lead", "Active", "Dormant", "Past"]),
  social_links: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
})

export const createDealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(), // Can be linked later
  stage: z.enum(["NewLead", "Qualified", "ProposalSent", "Negotiation", "Won", "Lost"]),
  estimated_value: z.number().min(0),
  currency: z.string().default("ZMW"),
  probability: z.number().min(0).max(100).default(0),
  expected_close_date: z.string().optional().nullable(),
})

export const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  date_time_start: z.string(), // ISO string
  date_time_end: z.string().optional().nullable(),
  type: z.enum(["Discovery", "Review", "Renewal", "Strategy", "General"]),
  mode: z.enum(["InPerson", "Zoom", "GoogleMeet", "PhoneCall"]),
  location: z.string().optional(),
  agenda: z.string().optional(),
  assigned_to_user_id: z.string().uuid().optional().nullable(),
}).refine(
  (m) => {
    if (!m.date_time_end) return true
    return new Date(m.date_time_end) > new Date(m.date_time_start)
  },
  { message: "Meeting end time must be after start time", path: ["date_time_end"] }
)

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum(["Transport", "Data", "OfficeSpace", "Meal", "Other"]),
  currency: z.string().default("ZMW"),
  description: z.string().min(1, "Description is required"),
  date: z.string().optional(), // For record keeping if different from created_at
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  meeting_id: z.string().uuid().optional().nullable(),
})

// ─── Accounting ────────────────────────────────────────────────────────────────

export const accountTypeEnum = z.enum(["asset", "liability", "equity", "revenue", "expense"])

export const createAccountSchema = z.object({
  code: z.string().min(1, "Account code is required").max(20),
  name: z.string().min(1, "Account name is required"),
  type: accountTypeEnum,
  subtype: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  currency: z.string().default("ZMW"),
  description: z.string().optional().nullable(),
})

export const updateAccountSchema = createAccountSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export const createExchangeRateSchema = z.object({
  from_currency: z.string().length(3),
  to_currency: z.string().length(3).default("ZMW"),
  rate: z.number().positive("Rate must be greater than 0"),
  effective_date: z.string(),
  source: z.enum(["manual", "xe", "boz", "api"]).default("manual"),
})

const journalLineInputSchema = z.object({
  account_id: z.string().uuid("Invalid account"),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  currency: z.string().default("ZMW"),
  fx_rate: z.number().positive().default(1),
  memo: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
}).refine(
  (line) => (line.debit > 0 && line.credit === 0) || (line.debit === 0 && line.credit > 0),
  { message: "Line must have exactly one of debit or credit > 0" }
)

export const createJournalEntrySchema = z.object({
  entry_date: z.string(),
  memo: z.string().optional().nullable(),
  source_type: z.enum([
    "invoice", "payment", "expense", "payroll",
    "manual", "fx_revaluation", "opening_balance",
  ]).default("manual"),
  source_id: z.string().uuid().optional().nullable(),
  lines: z.array(journalLineInputSchema).min(2, "At least 2 lines are required"),
}).refine(
  (entry) => {
    const totalDebit = entry.lines.reduce((s, l) => s + (l.debit * l.fx_rate), 0)
    const totalCredit = entry.lines.reduce((s, l) => s + (l.credit * l.fx_rate), 0)
    return Math.abs(totalDebit - totalCredit) < 0.01
  },
  { message: "Journal entry must be balanced (debits = credits in base currency)" }
)

export const createDeliverableSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Deliverable name is required"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "archived"]),
  due_date: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  sort_order: z.number().int(),
  total_price: z.number().min(0),
  billing_type: z.enum(["fixed", "hourly"]),
  template_id: z.string().uuid().or(z.literal("")).optional().nullable(),
})
