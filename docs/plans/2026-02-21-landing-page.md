# Sprint 4.1: Landing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a compelling marketing landing page with pricing, features, and CTA — while reorganizing the app's routing into `(marketing)` and `(app)` route groups.

**Architecture:** Use Next.js route groups to separate marketing pages (no sidebar, public) from the authenticated app (AppShell, requires login). The current `app/page.tsx` (dashboard) moves into `(app)` route group. Marketing pages get their own layout with a navbar and footer.

**Tech Stack:** Next.js App Router (route groups), Tailwind CSS 4, shadcn/ui, Lucide icons, existing components.

## Context

**Current state:** `app/page.tsx` = dashboard (authenticated, wrapped in AppShell). All pages are either auth-protected or public (login/register).

**Target state:**
- `app/(marketing)/page.tsx` = landing page (public, marketing layout)
- `app/(marketing)/pricing/page.tsx` = pricing page (public)
- `app/(app)/page.tsx` = dashboard (authenticated, AppShell layout — moved from current `app/page.tsx`)
- `app/(app)/todos/page.tsx`, etc. = all authenticated pages moved into `(app)` group
- Middleware updated to protect `/(app)` routes instead of bare `/`

## Dependency Graph

```
Task 1: Route group restructure + middleware update
    ↓
Task 2: Marketing layout (navbar + footer)
    ↓
Task 3: Landing page (hero, features, how-it-works)
    ↓
Task 4: Pricing page (INR/USD toggle, plan cards, FAQ)
    ↓
Task 5: Component tests
    ↓
Task 6: Verification
```

---

## Task 1: Route Group Restructure

**Goal:** Move authenticated pages into `(app)` route group, create `(marketing)` group for public pages. Update middleware.

**Files:**
- Move: `app/page.tsx` → `app/(app)/page.tsx`
- Move: `app/todos/page.tsx` → `app/(app)/todos/page.tsx`
- Move: `app/timesheet/page.tsx` → `app/(app)/timesheet/page.tsx`
- Move: `app/projects/page.tsx` → `app/(app)/projects/page.tsx`
- Move: `app/billing/` → `app/(app)/billing/`
- Move: `app/workspace/` → `app/(app)/workspace/`
- Move: `app/invite/` → `app/(app)/invite/`
- Create: `app/(marketing)/page.tsx` (placeholder)
- Create: `app/(marketing)/layout.tsx`
- Modify: `middleware.ts`

**Step 1:** Create the route group directories:

```bash
mkdir -p app/(app) app/(marketing) app/(marketing)/pricing
```

**Step 2:** Move all authenticated pages into `(app)`:

```bash
# Move files — route groups don't affect URLs
mv app/page.tsx app/(app)/page.tsx
mv app/todos app/(app)/todos
mv app/timesheet app/(app)/timesheet
mv app/projects app/(app)/projects
mv app/billing app/(app)/billing
mv app/workspace app/(app)/workspace
mv app/invite app/(app)/invite
```

**Step 3:** Create placeholder landing page `app/(marketing)/page.tsx`:

```tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">VoiceTask</h1>
    </div>
  )
}
```

**Step 4:** Update `middleware.ts` — change matcher from `/` to protected paths under the `(app)` group. Route groups are transparent in URLs, so `/todos` still matches `(app)/todos`. But `/` now needs to NOT be protected (it's the landing page). Update:

```typescript
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/todos/:path*",
    "/timesheet/:path*",
    "/projects/:path*",
    "/billing/:path*",
    "/invite/:path*",
    "/workspace/:path*",
  ],
}
```

Remove `/` from matcher since landing page is public. The dashboard moves to a new URL — we need a dedicated `/dashboard` route OR keep the old `(app)/page.tsx` at `/` but with client-side auth check (redirect unauthenticated to landing).

**Decision:** Create `app/(app)/dashboard/page.tsx` for the dashboard at `/dashboard`, keep `app/(marketing)/page.tsx` as landing at `/`. Update the `(app)/page.tsx` to redirect:

- Move `app/(app)/page.tsx` → `app/(app)/dashboard/page.tsx`
- The old root `/` is now the marketing landing page
- Update sidebar links if they point to `/` for dashboard → `/dashboard`
- Add `/dashboard` to middleware matcher

**Step 5:** Check sidebar/nav links that point to `/` and update them to `/dashboard`.

**Files to check:**
- `components/layout/sidebar.tsx` — navigation links
- Any `router.push("/")` calls → change to `/dashboard`

**Step 6:** Verify the app runs: `npm run dev` — navigate to `/` (should show placeholder landing), `/dashboard` (should show dashboard with auth), `/todos` (should still work).

**Commit.**

---

## Task 2: Marketing Layout

**Goal:** Create a shared layout for marketing pages with navbar and footer — no sidebar, different nav.

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `components/marketing/navbar.tsx`
- Create: `components/marketing/footer.tsx`

**Step 1:** Create `components/marketing/navbar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { CheckSquare } from "lucide-react"

export function MarketingNavbar() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <CheckSquare className="size-6 text-primary" />
          VoiceTask
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
        </nav>
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
```

**Step 2:** Create `components/marketing/footer.tsx`:

```tsx
import Link from "next/link"
import { CheckSquare } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <CheckSquare className="size-5 text-primary" />
              VoiceTask
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Voice-powered project management for freelancers and small agencies.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground transition-colors">Log In</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Sign Up</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} VoiceTask. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

**Step 3:** Create `app/(marketing)/layout.tsx`:

```tsx
import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
```

**Commit.**

---

## Task 3: Landing Page

**Goal:** Build the hero section, features grid, and "how it works" section.

**Files:**
- Modify: `app/(marketing)/page.tsx`

Build the full landing page with these sections:

**Step 1: Hero Section**
- Headline: "Manage Projects with Your Voice"
- Subheadline: value prop for freelancers
- Two CTA buttons: "Start Free Trial" → /register, "See Pricing" → /pricing
- Simple gradient or pattern background

**Step 2: Features Grid**
- 6 feature cards in 3x2 grid (md:grid-cols-3)
- Features: Voice Capture, Smart Timesheets, Project Management, Team Collaboration, Dashboard Analytics, Notifications
- Each card: icon + title + description

**Step 3: "How it Works" Section**
- 3-step flow: Speak → AI Parses → Auto-fills
- Numbered steps with icons
- Brief description for each

**Step 4: Social Proof Section**
- "Trusted by freelancers and agencies" placeholder
- Stats: "X projects managed", "X hours tracked" (placeholder numbers)

**Step 5: Bottom CTA**
- "Ready to get started?" with trial CTA button

**Commit.**

---

## Task 4: Pricing Page

**Goal:** Dedicated pricing page with INR/USD toggle, 3 plan cards, feature comparison, and FAQ.

**Files:**
- Create: `app/(marketing)/pricing/page.tsx`

**Step 1: Currency Toggle**
- State: `currency` ("inr" | "usd")
- Auto-detect via `navigator.language` — if `en-IN` or `hi`, default to INR; else USD
- Toggle switch or segmented control

**Step 2: Plan Cards**
- 3 cards: Solo, Team, Agency
- Highlight "Team" as "Most Popular"
- Price display switches between ₹ and $ based on currency
- Feature list per plan
- CTA: "Start Free Trial" → /register

**Step 3: Feature Comparison Matrix**
- Table: rows = features, columns = plans
- Check/cross marks for included features
- Limits shown as numbers (e.g., "3 projects", "Unlimited")

**Step 4: FAQ Section**
- 8-10 questions in accordion (Radix Accordion from shadcn/ui)
- Questions: trial, payment methods, cancellation, data export, team size, etc.
- Install accordion if not present: `npx shadcn@latest add accordion`

**Commit.**

---

## Task 5: Component Tests

**Files:**
- Create: `__tests__/components/marketing/landing-page.test.tsx`
- Create: `__tests__/components/marketing/pricing-page.test.tsx`

**Step 1: Landing page tests:**
1. Hero renders headline and CTA buttons
2. Features section renders all 6 feature cards
3. "How it Works" renders 3 steps
4. CTA links point to correct routes (/register, /pricing)

**Step 2: Pricing page tests:**
1. Renders 3 plan cards (Solo, Team, Agency)
2. Shows INR prices by default when locale matches
3. Shows USD prices when toggled
4. FAQ section renders questions
5. CTA buttons link to /register

**Commit.**

---

## Task 6: Final Verification

1. Run `npm run test` — all tests pass
2. Run `npm run build` — build succeeds
3. Manual check: navigate to `/` (landing), `/pricing`, `/dashboard`, `/todos`
4. Update CLAUDE.md Sprint 4.1 checkboxes (14/14)
5. Final commit

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Route groups | `(marketing)` + `(app)` | Clean URL separation, shared root layout |
| Dashboard URL | `/dashboard` (not `/`) | `/` becomes landing page for SEO |
| Marketing layout | Server component | No client interactivity needed in layout shell |
| Navbar | Client component | Needs `useSession()` for "Go to Dashboard" vs "Login" |
| Currency detection | `navigator.language` | Auto-detect for Indian vs international users |
| FAQ | shadcn Accordion | Consistent with existing UI components |
| Landing content | Single page file | Simple, all sections in one component |

## Files Changed Summary

**New files (6-8):**
- `app/(marketing)/layout.tsx`
- `app/(marketing)/page.tsx`
- `app/(marketing)/pricing/page.tsx`
- `components/marketing/navbar.tsx`
- `components/marketing/footer.tsx`
- `__tests__/components/marketing/landing-page.test.tsx`
- `__tests__/components/marketing/pricing-page.test.tsx`

**Moved files (7):**
- `app/page.tsx` → `app/(app)/dashboard/page.tsx`
- `app/todos/` → `app/(app)/todos/`
- `app/timesheet/` → `app/(app)/timesheet/`
- `app/projects/` → `app/(app)/projects/`
- `app/billing/` → `app/(app)/billing/`
- `app/workspace/` → `app/(app)/workspace/`
- `app/invite/` → `app/(app)/invite/`

**Modified files (2-3):**
- `middleware.ts` — update matcher
- `components/layout/sidebar.tsx` — update `/` → `/dashboard`
- Any other nav links pointing to `/`
