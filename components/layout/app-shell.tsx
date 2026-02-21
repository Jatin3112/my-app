"use client"

import { useState } from "react"
import { Sidebar, MobileSidebarContent } from "./sidebar"
import { Topbar } from "./topbar"
import { QuickCaptureButton } from "@/components/quick-capture"
import { TrialBanner } from "@/components/billing/trial-banner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 h-14 flex justify-center">
            <SheetTitle className="text-sm font-semibold">Task Manager</SheetTitle>
          </SheetHeader>
          <MobileSidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to main content
        </a>
        <TrialBanner />
        <Topbar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main id="main-content" role="main" className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      <QuickCaptureButton />
    </div>
  )
}
