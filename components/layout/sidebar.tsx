"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CheckSquare, Clock, FolderOpen, Settings, CreditCard, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"
import { PlanBadge } from "@/components/billing/plan-badge"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todos", label: "Todos", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/timesheet", label: "Timesheet", icon: Clock },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/workspace/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn("flex items-center border-b h-14 px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">Task Manager</span>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <div className="p-2 border-b">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {!collapsed && <PlanBadge />}

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function MobileSidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <div className="p-2 border-b">
        <WorkspaceSwitcher />
      </div>
      <PlanBadge />
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
