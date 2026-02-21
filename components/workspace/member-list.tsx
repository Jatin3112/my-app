"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { getWorkspaceMembers, removeMember, updateMemberRole, transferOwnership } from "@/lib/api/members"
import type { Role } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserMinus, Shield } from "lucide-react"
import { toast } from "sonner"

type Member = {
  id: string
  user_id: string
  role: string
  joined_at: Date
  name: string | null
  email: string
}

export function MemberList() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id
  const myRole = currentWorkspace?.role

  const [members, setMembers] = useState<Member[]>([])
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [transferTarget, setTransferTarget] = useState<Member | null>(null)

  useEffect(() => {
    if (workspaceId) loadMembers()
  }, [workspaceId])

  async function loadMembers() {
    if (!workspaceId) return
    try {
      const data = await getWorkspaceMembers(workspaceId)
      setMembers(data)
    } catch (error) {
      toast.error("Failed to load members")
    }
  }

  async function handleRemove() {
    if (!removeTarget || !userId || !workspaceId) return
    try {
      await removeMember(userId, workspaceId, removeTarget.user_id)
      toast.success("Member removed")
      setRemoveTarget(null)
      await loadMembers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    }
  }

  async function handleRoleChange(targetUserId: string, newRole: string) {
    if (!userId || !workspaceId) return
    try {
      await updateMemberRole(userId, workspaceId, targetUserId, newRole as Role)
      toast.success("Role updated")
      await loadMembers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    }
  }

  async function handleTransfer() {
    if (!transferTarget || !userId || !workspaceId) return
    try {
      await transferOwnership(userId, workspaceId, transferTarget.user_id)
      toast.success("Ownership transferred")
      setTransferTarget(null)
      await loadMembers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to transfer ownership")
    }
  }

  const canManageMembers = myRole === "owner" || myRole === "admin"

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[role] || colors.member}`}>
        {role}
      </span>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            {canManageMembers && <TableHead className="w-[150px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{member.name || "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </TableCell>
              <TableCell>
                {canManageMembers && member.role !== "owner" && member.user_id !== userId ? (
                  <Select value={member.role} onValueChange={(v) => handleRoleChange(member.user_id, v)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="member">member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  roleBadge(member.role)
                )}
              </TableCell>
              {canManageMembers && (
                <TableCell>
                  {member.role !== "owner" && member.user_id !== userId && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(member)} title="Remove member">
                        <UserMinus className="size-4 text-destructive" />
                      </Button>
                      {myRole === "owner" && (
                        <Button size="sm" variant="ghost" onClick={() => setTransferTarget(member)} title="Transfer ownership">
                          <Shield className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name || removeTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access to this workspace and all its data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferTarget} onOpenChange={() => setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership to {transferTarget?.name || transferTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>You will be demoted to admin. This cannot be undone easily.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
