import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const HomePage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_55%)]" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <p className="text-sm font-semibold tracking-tight">My OS</p>
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get started
          </Link>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24 md:px-10">
        <p className="text-sm font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Personal operating system
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          My OS
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Your life. Your system. Start with a weekly diet planner, then grow into money, goals,
          habits, and more — all in one personal space.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            Create your system
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  )
}

export default HomePage
