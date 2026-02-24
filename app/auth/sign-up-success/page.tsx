import { APP_NAME } from "@/lib/config"
import { CheckCircle } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Check Your Email</h1>
          <p className="text-white/60 mb-6 leading-relaxed">
            We&apos;ve sent a confirmation link to your email. Please click it to verify your account before logging in.
          </p>

          <a
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all duration-200 min-h-[48px]"
          >
            Back to Login
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-6">
          © 2024 {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
