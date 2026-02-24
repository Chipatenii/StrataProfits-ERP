export interface Project {
    id: string
    name: string
    description: string | null
    status: "active" | "archived" | "completed"
    created_at: string
    updated_at: string
    client_id: string | null // Added for ERP
    created_by?: string // Added for ERP
}

export interface ProjectMember {
    id: string
    project_id: string
    user_id: string
    role: "manager" | "member" | "viewer"
    joined_at: string
}

export interface Deliverable {
    id: string
    project_id: string
    name: string
    description?: string | null
    status: string
    phase?: string | null
    sort_order: number
    due_date?: string | null
    is_default: boolean
    is_shared: boolean // Stage 4
    approval_status: 'pending' | 'under_review' | 'approved' | 'rejected' // Stage 4
    total_price: number // Stage 5
    billing_type: 'fixed' | 'hourly' // Stage 5
    invoice_id?: string | null // Stage 5
    created_at: string
    updated_at: string
}

export interface Task {
    id: string
    title: string
    description: string | null
    status: string
    priority: "low" | "medium" | "high"
    due_date: string | null
    estimated_hours: number | null
    assigned_to: string | null
    project_id: string | null
    created_by: string
    created_at: string
    completed_at?: string | null
    completion_notes?: string | null
    is_self_created?: boolean
    approval_status?: "auto_approved" | "pending" | "approved" | "rejected"
    approved_by?: string | null
    approved_at?: string | null
    deliverable_id?: string | null // Stage 1
    assigned_by?: string | null
    time_allocated?: number | null
}

export interface TimeLog {
    id: string
    user_id: string
    task_id: string | null
    clock_in: string
    clock_out: string | null
    duration_minutes: number
    created_at: string
    is_approved?: boolean
    billable?: boolean
}

export interface UserProfile {
    id: string
    full_name: string
    email: string
    role: "admin" | "team_member" | "virtual_assistant" | "developer" | "social_media_manager" | "book_keeper" | "marketing" | "sales" | "graphic_designer"
    user_id?: string // For backward compatibility if needed, though id usually equals auth.uid
    hourly_rate?: number | null
    avatar_url?: string | null
}

export interface Invoice {
    id: string
    client_id: string
    project_id?: string | null // Added for ERP
    amount: number
    currency: string
    status: "draft" | "sent" | "paid" | "overdue"
    due_date: string | null
    created_at: string
    invoice_number?: string
    // Joined fields
    client?: Client | null
    project?: { name: string } | null
    items?: InvoiceItem[] // Added for ERP
    payments?: Payment[] // Added for ERP
    // New Fields
    order_number?: string | null
    terms?: string | null
    customer_notes?: string | null
    discount_rate?: number
    discount_amount?: number
    adjustment?: number
    is_tax_inclusive?: boolean
}

export interface InvoiceItem {
    id: string
    invoice_id: string
    description: string
    quantity: number
    unit_price: number
    total: number
    created_at: string
    tax_rate?: number
    tax_amount?: number
}

export interface Payment {
    id: string
    invoice_id: string
    amount: number
    currency: string
    method: "cash" | "bank_transfer" | "mobile_money" | "card" | "other" | null
    reference?: string | null
    paid_at: string
    received_by_user_id?: string | null
    created_at: string
    receipt_number?: string | null
}

export interface Quote {
    id: string
    client_id: string
    deal_id?: string | null
    project_id?: string | null
    quote_number?: string | null
    currency: string
    status: "draft" | "sent" | "accepted" | "rejected" | "expired"
    valid_until?: string | null
    notes?: string | null
    terms?: string | null
    created_by?: string | null
    created_at: string
    items?: QuoteItem[]
    client?: Client
    // New Fields
    reference_number?: string | null
    customer_notes?: string | null
    discount_rate?: number
    discount_amount?: number
    adjustment?: number
    amount?: number // Added
}

export interface QuoteItem {
    id: string
    quote_id: string
    description: string
    quantity: number
    unit_price: number
    total: number
    created_at: string
    tax_rate?: number
    tax_amount?: number
}

export interface ApprovalRequest {
    id: string
    entity_type: "task" | "time_log" | "expense" | "invoice" | "quote" | "meeting"
    entity_id: string
    requested_by_user_id: string
    assigned_to_user_id?: string | null
    assigned_role?: string | null
    status: "pending" | "approved" | "rejected"
    decision_note?: string | null
    decided_by_user_id?: string | null
    created_at: string
    decided_at?: string | null
}

export interface ActivityLog {
    id: string
    actor_user_id?: string | null
    action: string
    entity_type: string
    entity_id?: string | null
    metadata?: Record<string, unknown>
    created_at: string
}

export interface SOP {
    id: string
    title: string
    content: string
    category?: string
    tags?: string[]
    links?: { title: string, url: string }[]
    created_at: string
    updated_at: string
}

export interface Client {
    id: string
    name: string
    business_name: string | null
    phone: string | null
    tpin: string | null
    contact_person: string | null
    email: string | null
    location: string | null
    type: "dev" | "design" | "marketing" | "mixed"
    value_tier: "Standard" | "Premium" | "HighValue"
    status: "Lead" | "Active" | "Dormant" | "Past"
    notes: string | null
    address?: string | null
    social_links: {
        facebook?: string
        instagram?: string
        tiktok?: string
        website?: string
    }
    created_at: string
    updated_at: string
}

export interface Deal {
    id: string
    client_id: string | null
    project_id: string | null
    title: string
    stage: "NewLead" | "Qualified" | "ProposalSent" | "Negotiation" | "Won" | "Lost"
    estimated_value: number
    currency: string
    probability: number
    expected_close_date: string | null
    actual_close_date: string | null
    lost_reason: string | null
    notes: string | null
    created_at: string
    updated_at: string
    client?: Client
    project?: Project
}

export interface Meeting {
    id: string
    client_id: string | null
    project_id: string | null
    requested_by_user_id: string | null
    assigned_to_user_id: string | null
    title: string
    type: "Discovery" | "Review" | "Renewal" | "Strategy" | "General"
    mode: "InPerson" | "Zoom" | "GoogleMeet" | "PhoneCall"
    location: string | null
    date_time_start: string
    date_time_end: string | null
    status: "Proposed" | "Approved" | "Completed" | "Cancelled"
    agenda: string | null
    meeting_notes: string | null
    created_at: string
    updated_at: string
    client?: Client
    project?: Project
}

export interface Expense {
    id: string
    client_id: string | null
    project_id: string | null
    meeting_id: string | null
    submitted_by_user_id: string | null
    category: "Transport" | "Data" | "OfficeSpace" | "Meal" | "Other"
    amount: number
    currency: string
    description: string | null
    receipt_url: string | null
    status: "Pending" | "Approved" | "Rejected" | "Paid"
    created_at: string
    updated_at: string
}

export interface TaskTemplate {
    id: string
    name: string
    description: string | null
    service_type: "Dev" | "Design" | "Marketing"
    is_active: boolean
    items?: TaskTemplateItem[]
}

export interface TaskTemplateItem {
    id: string
    template_id: string
    name: string
    description: string | null
    default_assignee_role: string | null
    default_estimated_hours: number | null
    order_index: number
}

export interface Comment {
    id: string
    entity_type: "task" | "project" | "deal" | "meeting"
    entity_id: string
    author_user_id: string
    content: string
    created_at: string
    author?: UserProfile
}

export interface Stats {
    leaderboard: {
        id: string
        name: string
        completedTasks: number
        totalEarnings: number
    }[]
    bestPerformer: {
        id: string
        name: string
        completedTasks: number
        totalEarnings: number
    } | null
}
