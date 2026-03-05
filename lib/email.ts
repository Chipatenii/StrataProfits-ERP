/**
 * Email notification utility using Resend
 *
 * Usage:
 *   import { sendTaskAssignedEmail, sendProjectMemberEmail, getEmailForUser } from "@/lib/email"
 *
 * All functions are async and fire-and-forget safe — they never throw.
 */

import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { APP_CONFIG } from "@/lib/config"

// ---------------------------------------------------------------------------
// Resend client (lazy-initialised so missing key doesn't crash the import)
// ---------------------------------------------------------------------------

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (resendClient) return resendClient
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[Email] RESEND_API_KEY is not set — emails will be skipped.")
    return null
  }
  resendClient = new Resend(key)
  return resendClient
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? `${APP_CONFIG.shortName} <onboarding@resend.dev>`

// ---------------------------------------------------------------------------
// Low-level send helper
// ---------------------------------------------------------------------------

interface SendResult {
  success: boolean
  error?: string
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  const resend = getResend()
  if (!resend) return { success: false, error: "Resend not configured" }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      console.error("[Email] Resend error:", error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Sent "${subject}" → ${to}`)
    return { success: true }
  } catch (err) {
    console.error("[Email] Unexpected error:", err)
    return { success: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Resolve Supabase Auth user → email
// ---------------------------------------------------------------------------

export async function getEmailForUser(
  userId: string,
): Promise<string | null> {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) {
      console.warn(`[Email] Could not resolve email for user ${userId}:`, error)
      return null
    }
    return data.user.email
  } catch (err) {
    console.error("[Email] Error fetching user email:", err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width:560px; margin:40px auto; background:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); overflow:hidden; }
    .header { background:#18181b; padding:24px 32px; }
    .header h1 { margin:0; color:#ffffff; font-size:18px; font-weight:600; letter-spacing:-0.3px; }
    .body { padding:32px; }
    .body p { margin:0 0 16px; color:#3f3f46; font-size:15px; line-height:1.6; }
    .highlight { background:#f4f4f5; border-left:4px solid #18181b; padding:16px 20px; border-radius:0 8px 8px 0; margin:20px 0; }
    .highlight strong { color:#18181b; font-size:15px; }
    .footer { padding:20px 32px; text-align:center; border-top:1px solid #e4e4e7; }
    .footer p { margin:0; color:#a1a1aa; font-size:12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_CONFIG.shortName}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated email from ${APP_CONFIG.name}.</p>
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Task Assigned
// ---------------------------------------------------------------------------

export async function sendTaskAssignedEmail(opts: {
  recipientEmail: string
  recipientName: string
  taskTitle: string
  projectName?: string | null
  assignedByName?: string | null
}): Promise<SendResult> {
  const projectLine = opts.projectName
    ? `<p>Project: <strong>${opts.projectName}</strong></p>`
    : ""

  const assignerLine = opts.assignedByName
    ? `<p>${opts.assignedByName} has assigned you a new task:</p>`
    : `<p>You have been assigned a new task:</p>`

  const html = baseLayout(`
    <p>Hi ${opts.recipientName},</p>
    ${assignerLine}
    <div class="highlight">
      <strong>${opts.taskTitle}</strong>
    </div>
    ${projectLine}
    <p>Log in to ${APP_CONFIG.shortName} to view the details and get started.</p>
  `)

  return sendEmail(
    opts.recipientEmail,
    `New Task Assigned: ${opts.taskTitle}`,
    html,
  )
}

// ---------------------------------------------------------------------------
// Added to Project
// ---------------------------------------------------------------------------

export async function sendProjectMemberEmail(opts: {
  recipientEmail: string
  recipientName: string
  projectName: string
  role: string
  addedByName?: string | null
}): Promise<SendResult> {
  const adderLine = opts.addedByName
    ? `<p>${opts.addedByName} has added you to a project:</p>`
    : `<p>You have been added to a project:</p>`

  const html = baseLayout(`
    <p>Hi ${opts.recipientName},</p>
    ${adderLine}
    <div class="highlight">
      <strong>${opts.projectName}</strong>
    </div>
    <p>Your role: <strong>${opts.role}</strong></p>
    <p>Log in to ${APP_CONFIG.shortName} to view the project and start collaborating.</p>
  `)

  return sendEmail(
    opts.recipientEmail,
    `You've been added to ${opts.projectName}`,
    html,
  )
}
