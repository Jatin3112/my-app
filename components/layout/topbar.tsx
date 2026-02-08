"use client"

import { useSession, signOut } from "next-auth/react"
import { Menu, LogOut, User, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TopbarProps {
  onMobileMenuToggle: () => void
}

const shortcuts = [
  { keys: "Ctrl + K", action: "Focus search" },
  { keys: "N", action: "New item" },
  { keys: "Escape", action: "Close / Clear" },
  { keys: "Ctrl + A", action: "Select all" },
  { keys: "Delete", action: "Delete selected" },
]

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="size-4" />
        </Button>
        <span className="font-semibold text-sm md:hidden">Task Manager</span>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" title="Keyboard shortcuts">
              <Keyboard className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
              <div className="space-y-1.5">
                {shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.action}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs font-mono">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <NotificationBell />

        <ThemeToggle />

        {session && (
          <>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              <User className="size-3.5" />
              <span className="max-w-[120px] truncate">{session.user?.name || session.user?.email}</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => signOut()} title="Logout">
              <LogOut className="size-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
