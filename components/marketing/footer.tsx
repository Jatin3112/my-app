import Link from "next/link"
import { CheckSquare } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Column 1: Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <CheckSquare className="size-5 text-primary" />
              <span className="text-lg font-bold">VoiceTask</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Voice-powered project management for freelancers and small agencies.
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Account */}
          <div>
            <h3 className="text-sm font-semibold">Account</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log In
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-10 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VoiceTask. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
