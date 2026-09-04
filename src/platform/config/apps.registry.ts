import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, Salad, Settings } from "lucide-react"

export type AppDefinition = {
  id: string
  name: string
  description: string
  href: string
  icon: LucideIcon
  enabled: boolean
  navOrder: number
}

export const platformNav = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "settings",
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const

export const appsRegistry: AppDefinition[] = [
  {
    id: "diet",
    name: "Diet",
    description: "Weekly dish planner and meal guide",
    href: "/diet",
    icon: Salad,
    enabled: true,
    navOrder: 1,
  },
]

export const getEnabledApps = () =>
  appsRegistry
    .filter((app) => app.enabled)
    .sort((a, b) => a.navOrder - b.navOrder)
