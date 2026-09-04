import { SignupForm } from "@/platform/auth/components/signup-form"

const SignupPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/60 via-background to-background px-4">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          My OS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your system</h1>
      </div>
      <SignupForm />
    </div>
  )
}

export default SignupPage
