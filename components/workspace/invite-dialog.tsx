"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { inviteMember } from "@/lib/api/invitations"
import type { Role } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Copy, Check } from "lucide-react"
import { toast } from "sonner"

export function InviteDialog() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [inviteLink, setInviteLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !workspaceId || !email.trim()) return

    setIsLoading(true)
    try {
      const { token } = await inviteMember(userId, workspaceId, { email: email.trim(), role: role as Role })
      const link = `${window.location.origin}/invite/${token}`
      setInviteLink(link)
      toast.success("Invitation created")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setIsOpen(false)
    setEmail("")
    setRole("member")
    setInviteLink("")
    setCopied(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true) }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!inviteLink ? (
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
              <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Sending..." : "Send Invitation"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created!</DialogTitle>
              <DialogDescription>Share this link with {email} to join the workspace.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
