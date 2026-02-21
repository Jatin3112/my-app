# Admin Dashboard UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an internal admin dashboard UI at `app/(admin)/admin/page.tsx` that displays global stats, workspace list with plan/subscription info, and controls to extend trials and change plans. Protected by email whitelist.

**Architecture:** Server component route group `(admin)` with its own layout that checks `getServerSession` + `isAdmin()`. The page calls existing server actions (`getAdminStats`, `getWorkspaceList`) for data. Client components handle interactive bits (extend trial dialog, change plan dropdown). Leverages existing shadcn/ui components (card, table, badge, dialog, select, button).

**Tech Stack:** Next.js App Router (server components), existing `lib/api/admin.ts` server actions, shadcn/ui, Tailwind CSS 4

---

### Task 1: Create admin layout with auth guard

**Files:**
- Create: `app/(admin)/layout.tsx`

**Step 1: Write the layout**

```tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"
import { isAdmin } from "@/lib/api/admin"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email || !isAdmin(email)) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">VoiceTask Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">{email}</p>
      </header>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
```

**Step 2: Verify it renders (manual)**

Visit `/admin` in browser while logged in with an admin email (set `ADMIN_EMAILS=your@email.com` in `.env`). Should redirect non-admins to `/dashboard`.

**Step 3: Commit**

```bash
git add app/(admin)/layout.tsx
git commit -m "feat: add admin layout with email whitelist auth guard"
```

---

### Task 2: Create admin stats cards component

**Files:**
- Create: `components/admin/stats-cards.tsx`

**Step 1: Write the component**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Clock, CreditCard } from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalWorkspaces: number
  activeTrials: number
  activeSubscriptions: number
}

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Total Workspaces", value: stats.totalWorkspaces, icon: Building2 },
    { title: "Active Trials", value: stats.activeTrials, icon: Clock },
    { title: "Active Subscriptions", value: stats.activeSubscriptions, icon: CreditCard },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/stats-cards.tsx
git commit -m "feat: add admin stats cards component"
```

---

### Task 3: Create workspace table component with actions

**Files:**
- Create: `components/admin/workspace-table.tsx`

**Step 1: Write the component**

This is a client component with interactive elements (extend trial button, change plan select).

```tsx
"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extendTrial, changeWorkspacePlan } from "@/lib/api/admin"
import { toast } from "sonner"

interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string | null
  created_at: Date
  memberCount: number
  planName: string
  status: string
  trialEnd: Date | null
}

interface Plan {
  id: string
  name: string
  slug: string
}

export function WorkspaceTable({
  workspaces: initialWorkspaces,
  plans,
}: {
  workspaces: Workspace[]
  plans: Plan[]
}) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [extendDays, setExtendDays] = useState("7")
  const [extendingId, setExtendingId] = useState<string | null>(null)
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null)

  async function handleExtendTrial(workspaceId: string) {
    try {
      const result = await extendTrial(workspaceId, parseInt(extendDays))
      if (result.success) {
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === workspaceId
              ? { ...ws, trialEnd: result.newTrialEnd, status: "trialing" }
              : ws
          )
        )
        toast.success(`Trial extended by ${extendDays} days`)
        setExtendingId(null)
      }
    } catch {
      toast.error("Failed to extend trial")
    }
  }

  async function handleChangePlan(workspaceId: string, planId: string) {
    try {
      const result = await changeWorkspacePlan(workspaceId, planId)
      if (result.success) {
        const plan = plans.find((p) => p.id === planId)
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === workspaceId ? { ...ws, planName: plan?.name || "Unknown" } : ws
          )
        )
        toast.success("Plan changed successfully")
        setChangingPlanId(null)
      }
    } catch {
      toast.error("Failed to change plan")
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case "active": return "default"
      case "trialing": return "secondary"
      case "canceled": return "destructive"
      default: return "outline"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workspace</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Trial End</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((ws) => (
            <TableRow key={ws.id}>
              <TableCell className="font-medium">{ws.name}</TableCell>
              <TableCell>{ws.planName}</TableCell>
              <TableCell>
                <Badge variant={statusColor(ws.status)}>{ws.status}</Badge>
              </TableCell>
              <TableCell>{ws.memberCount}</TableCell>
              <TableCell>
                {ws.trialEnd
                  ? new Date(ws.trialEnd).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell>
                {new Date(ws.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Dialog
                  open={extendingId === ws.id}
                  onOpenChange={(open) => setExtendingId(open ? ws.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Extend Trial
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Extend Trial — {ws.name}</DialogTitle>
                      <DialogDescription>
                        Add extra days to this workspace&apos;s trial period.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="days">Days to add</Label>
                      <Input
                        id="days"
                        type="number"
                        min="1"
                        max="90"
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => handleExtendTrial(ws.id)}>
                        Extend
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={changingPlanId === ws.id}
                  onOpenChange={(open) =>
                    setChangingPlanId(open ? ws.id : null)
                  }
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Plan — {ws.name}</DialogTitle>
                      <DialogDescription>
                        Select a new plan for this workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Plan</Label>
                      <Select
                        onValueChange={(planId) =>
                          handleChangePlan(ws.id, planId)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
          {workspaces.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No workspaces found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/admin/workspace-table.tsx
git commit -m "feat: add admin workspace table with extend trial and change plan actions"
```

---

### Task 4: Create admin page (server component)

**Files:**
- Create: `app/(admin)/admin/page.tsx`

**Step 1: Write the page**

```tsx
import { getAdminStats, getWorkspaceList } from "@/lib/api/admin"
import { getAllPlans } from "@/lib/api/subscriptions"
import { AdminStatsCards } from "@/components/admin/stats-cards"
import { WorkspaceTable } from "@/components/admin/workspace-table"

export default async function AdminPage() {
  const [stats, workspaces, plans] = await Promise.all([
    getAdminStats(),
    getWorkspaceList(),
    getAllPlans(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Platform overview and workspace management.
        </p>
      </div>

      <AdminStatsCards stats={stats} />

      <div>
        <h3 className="text-lg font-semibold mb-4">All Workspaces</h3>
        <WorkspaceTable
          workspaces={workspaces}
          plans={plans.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
        />
      </div>
    </div>
  )
}
```

**Step 2: Verify (manual)**

Visit `/admin` as an admin user. Should see 4 stats cards + workspace table.

**Step 3: Commit**

```bash
git add app/(admin)/admin/page.tsx
git commit -m "feat: add admin dashboard page with stats and workspace management"
```

---

### Task 5: Write component tests for admin stats cards

**Files:**
- Create: `__tests__/components/admin/stats-cards.test.tsx`

**Step 1: Write the tests**

```tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AdminStatsCards } from "@/components/admin/stats-cards"

describe("AdminStatsCards", () => {
  const stats = {
    totalUsers: 42,
    totalWorkspaces: 5,
    activeTrials: 3,
    activeSubscriptions: 2,
  }

  it("renders all four stat cards", () => {
    render(<AdminStatsCards stats={stats} />)
    expect(screen.getByText("Total Users")).toBeInTheDocument()
    expect(screen.getByText("Total Workspaces")).toBeInTheDocument()
    expect(screen.getByText("Active Trials")).toBeInTheDocument()
    expect(screen.getByText("Active Subscriptions")).toBeInTheDocument()
  })

  it("displays correct values", () => {
    render(<AdminStatsCards stats={stats} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("handles zero values", () => {
    render(
      <AdminStatsCards
        stats={{ totalUsers: 0, totalWorkspaces: 0, activeTrials: 0, activeSubscriptions: 0 }}
      />
    )
    const zeros = screen.getAllByText("0")
    expect(zeros).toHaveLength(4)
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run __tests__/components/admin/stats-cards.test.tsx`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add __tests__/components/admin/stats-cards.test.tsx
git commit -m "test: add admin stats cards component tests"
```

---

### Task 6: Write component tests for workspace table

**Files:**
- Create: `__tests__/components/admin/workspace-table.test.tsx`

**Step 1: Write the tests**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { WorkspaceTable } from "@/components/admin/workspace-table"

// Mock server actions
vi.mock("@/lib/api/admin", () => ({
  extendTrial: vi.fn().mockResolvedValue({ success: true, newTrialEnd: new Date() }),
  changeWorkspacePlan: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockPlans = [
  { id: "plan-1", name: "Solo", slug: "solo" },
  { id: "plan-2", name: "Team", slug: "team" },
  { id: "plan-3", name: "Agency", slug: "agency" },
]

const mockWorkspaces = [
  {
    id: "ws-1",
    name: "Acme Corp",
    slug: "acme-corp",
    owner_id: "user-1",
    created_at: new Date("2026-01-15"),
    memberCount: 3,
    planName: "Team",
    status: "active",
    trialEnd: null,
  },
  {
    id: "ws-2",
    name: "Freelancer Inc",
    slug: "freelancer-inc",
    owner_id: "user-2",
    created_at: new Date("2026-02-01"),
    memberCount: 1,
    planName: "Solo",
    status: "trialing",
    trialEnd: new Date("2026-03-01"),
  },
]

describe("WorkspaceTable", () => {
  it("renders table headers", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("Workspace")).toBeInTheDocument()
    expect(screen.getByText("Plan")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Members")).toBeInTheDocument()
  })

  it("renders workspace rows", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    expect(screen.getByText("Freelancer Inc")).toBeInTheDocument()
    expect(screen.getByText("Team")).toBeInTheDocument()
    expect(screen.getByText("Solo")).toBeInTheDocument()
  })

  it("shows status badges", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("trialing")).toBeInTheDocument()
  })

  it("shows member counts", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("renders Extend Trial and Change Plan buttons for each workspace", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    const extendButtons = screen.getAllByText("Extend Trial")
    const changeButtons = screen.getAllByText("Change Plan")
    expect(extendButtons).toHaveLength(2)
    expect(changeButtons).toHaveLength(2)
  })

  it("shows empty state when no workspaces", () => {
    render(<WorkspaceTable workspaces={[]} plans={mockPlans} />)
    expect(screen.getByText("No workspaces found")).toBeInTheDocument()
  })

  it("displays trial end date for trialing workspaces", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    // Freelancer Inc has a trial end date, Acme Corp shows "—"
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run __tests__/components/admin/workspace-table.test.tsx`
Expected: 7 tests PASS

**Step 3: Commit**

```bash
git add __tests__/components/admin/workspace-table.test.tsx
git commit -m "test: add admin workspace table component tests"
```

---

### Task 7: Run full test suite + build verification

**Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Update CLAUDE.md checkboxes**

Mark T-6.1.6, T-6.1.7, T-6.1.8, T-6.1.9, T-6.1.14 as `[x]` in CLAUDE.md.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete admin dashboard UI (Sprint 6.1)"
```
