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
  trialEnd: Date | null | undefined
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workspace</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Members</TableHead>
            <TableHead className="hidden md:table-cell">Trial End</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
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
              <TableCell className="hidden md:table-cell">
                {ws.trialEnd
                  ? new Date(ws.trialEnd).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {new Date(ws.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right"><div className="flex items-center justify-end gap-2 flex-wrap">
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
              </div></TableCell>
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
