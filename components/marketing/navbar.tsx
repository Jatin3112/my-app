"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <CheckSquare className="size-6 text-primary" />
          <span className="text-xl font-bold">VoiceTask</span>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/help"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Help
          </Link>
        </nav>

        {/* Right side — auth-dependent */}
        <div className="flex items-center gap-3">
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Start Free Trial</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
