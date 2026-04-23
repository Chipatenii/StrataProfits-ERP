import { APP_NAME } from "@/lib/config"
import { CheckCircle2 } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-700" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Check Your Email</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            We&apos;ve sent a confirmation link to your email. Click it to verify your account before logging in.
          </p>

          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
          >
            Back to Login
          </a>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-5">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
