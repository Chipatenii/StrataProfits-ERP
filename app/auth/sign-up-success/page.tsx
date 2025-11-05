export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-4">
              We&apos;ve sent a confirmation link to your email. Please click it to verify your account before logging
              in.
            </p>
            <a href="/auth/login" className="btn-secondary inline-block">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
