"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { getEnabledApps, platformNav } from "@/platform/config/apps.registry"
import { signOut } from "@/platform/auth/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type SidebarProps = {
  userEmail?: string | null
  displayName?: string | null
}

const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname()
  const apps = getEnabledApps()
  const primary = platformNav.filter((item) => item.id === "dashboard")
  const secondary = platformNav.filter((item) => item.id === "settings")

  const linkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`)
    return cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {primary.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={linkClass(item.href)}
            >
              <Icon className="size-4" />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Apps
        </p>
        <div className="flex flex-col gap-1">
          {apps.map((app) => {
            const Icon = app.icon
            return (
              <Link
                key={app.id}
                href={app.href}
                onClick={onNavigate}
                className={linkClass(app.href)}
              >
                <Icon className="size-4" />
                {app.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {secondary.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={linkClass(item.href)}
            >
              <Icon className="size-4" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export const Sidebar = ({ userEmail, displayName }: SidebarProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center px-5">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            My OS
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-medium">{displayName || "User"}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <form action={signOut} className="mt-3">
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          My OS
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon-sm" aria-label="Open menu" />}
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>My OS</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t p-4">
              <p className="truncate text-sm font-medium">{displayName || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              <form action={signOut} className="mt-3">
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  Sign out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
