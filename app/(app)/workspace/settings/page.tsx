"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/hooks/use-workspace"
import { updateWorkspace, deleteWorkspace } from "@/lib/api/workspaces"
import { leaveWorkspace } from "@/lib/api/members"
import { AppShell } from "@/components/layout/app-shell"
import { MemberList } from "@/components/workspace/member-list"
import { InviteDialog } from "@/components/workspace/invite-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Download } from "lucide-react"

export default function WorkspaceSettingsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const workspaceId = currentWorkspace?.id
  const myRole = currentWorkspace?.role

  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isLeaveOpen, setIsLeaveOpen] = useState(false)

  // Sync name when workspace changes
  useEffect(() => {
    if (currentWorkspace) setWorkspaceName(currentWorkspace.name)
  }, [currentWorkspace])

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !workspaceId || !workspaceName.trim()) return
    setIsSaving(true)
    try {
      await updateWorkspace(userId, workspaceId, { name: workspaceName.trim() })
      await refreshWorkspaces()
      toast.success("Workspace name updated")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update workspace")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!userId || !workspaceId) return
    try {
      await deleteWorkspace(userId, workspaceId)
      await refreshWorkspaces()
      toast.success("Workspace deleted")
      router.push("/dashboard")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace")
    }
    setIsDeleteOpen(false)
  }

  async function handleLeave() {
    if (!userId || !workspaceId) return
    try {
      await leaveWorkspace(userId, workspaceId)
      await refreshWorkspaces()
      toast.success("Left workspace")
      router.push("/dashboard")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to leave workspace")
    }
    setIsLeaveOpen(false)
  }

  const canManage = myRole === "owner" || myRole === "admin"

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Workspace Settings</h1>

        {/* Workspace Name */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Workspace Name</CardTitle>
              <CardDescription>Update your workspace display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateName} className="flex gap-3">
                <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required className="max-w-sm" />
                <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage workspace members and their roles.</CardDescription>
            </div>
            {canManage && <InviteDialog />}
          </CardHeader>
          <CardContent>
            <MemberList />
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle>Your Data</CardTitle>
            <CardDescription>Download all your data as a JSON file (GDPR compliance).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/api/export/data")
                  if (!response.ok) throw new Error("Export failed")
                  const blob = await response.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `voicetask-data-export-${new Date().toISOString().split("T")[0]}.json`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  toast.success("Data exported successfully")
                } catch {
                  toast.error("Failed to export data")
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {myRole && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myRole !== "owner" && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Leave workspace</p>
                    <p className="text-sm text-muted-foreground">You will lose access to this workspace.</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsLeaveOpen(true)}>Leave</Button>
                </div>
              )}
              {myRole === "owner" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Leave workspace</p>
                      <p className="text-sm text-muted-foreground">Transfer ownership before leaving, or delete the workspace.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete workspace</p>
                      <p className="text-sm text-muted-foreground">Permanently delete this workspace and all its data.</p>
                    </div>
                    <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>Delete</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the workspace and all its data including todos, projects, and timesheet entries. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave workspace?</AlertDialogTitle>
            <AlertDialogDescription>You will lose access to this workspace. You can only rejoin if someone invites you again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
