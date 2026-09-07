import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Phone,
  Salad,
  Settings,
} from "lucide-react"

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
    id: "chat",
    name: "Chat",
    description: "Central AI for your personal OS",
    href: "/chat",
    icon: MessageSquare,
    enabled: true,
    navOrder: 1,
  },
  {
    id: "call",
    name: "Call",
    description: "Live voice call with My OS",
    href: "/call",
    icon: Phone,
    enabled: true,
    navOrder: 2,
  },
  {
    id: "diet",
    name: "Diet",
    description: "Weekly dish planner and meal guide",
    href: "/diet",
    icon: Salad,
    enabled: true,
    navOrder: 3,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Simple personal notes and ideas",
    href: "/notes",
    icon: NotebookPen,
    enabled: true,
    navOrder: 4,
  },
]

export const getEnabledApps = () =>
  appsRegistry
    .filter((app) => app.enabled)
    .sort((a, b) => a.navOrder - b.navOrder)
