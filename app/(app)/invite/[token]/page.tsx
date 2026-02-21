"use client"

import { use, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { acceptInvitation } from "@/lib/api/invitations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const router = useRouter()

  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [workspaceName, setWorkspaceName] = useState("")

  useEffect(() => {
    if (status === "loading") return

    if (!userId) {
      router.push(`/login?invite=${token}`)
      return
    }

    acceptInvitation(token, userId)
      .then((result) => {
        setState("success")
        setWorkspaceName(result.workspaceName)
      })
      .catch((err) => {
        setState("error")
        setMessage(err.message || "Failed to accept invitation")
      })
  }, [userId, token, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {state === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <CardTitle>Accepting invitation...</CardTitle>
              <CardDescription>Please wait while we add you to the workspace.</CardDescription>
            </>
          )}
          {state === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="size-8 text-green-500" />
              </div>
              <CardTitle>Welcome to {workspaceName}!</CardTitle>
              <CardDescription>You have been added to the workspace.</CardDescription>
            </>
          )}
          {state === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="size-8 text-destructive" />
              </div>
              <CardTitle>Invitation Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {state !== "loading" && (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
