"use client"

import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { WorkspaceProvider } from "@/hooks/use-workspace"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider refetchOnWindowFocus={false}>
        <WorkspaceProvider>
          {children}
          <Toaster />
        </WorkspaceProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
