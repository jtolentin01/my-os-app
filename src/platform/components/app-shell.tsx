import { Sidebar } from "@/platform/components/sidebar"

type AppShellProps = {
  children: React.ReactNode
  userEmail?: string | null
  displayName?: string | null
}

export const AppShell = ({ children, userEmail, displayName }: AppShellProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userEmail={userEmail} displayName={displayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
