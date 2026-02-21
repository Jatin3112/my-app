"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { getComments, createComment, deleteComment } from "@/lib/api/comments"
import { CommentInput } from "./comment-input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface CommentListProps {
  todoId: string
}

type CommentWithUser = {
  id: string
  todo_id: string
  workspace_id: string
  user_id: string | null
  content: string
  created_at: Date
  updated_at: Date
  user_name: string | null
  user_email: string
}

export function CommentList({ todoId }: CommentListProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (todoId && workspaceId) loadComments()
  }, [todoId, workspaceId])

  async function loadComments() {
    if (!workspaceId) return
    try {
      const data = await getComments(todoId, workspaceId)
      setComments(data)
    } catch (error) {
      console.error("Failed to load comments:", error)
    }
  }

  async function handleAddComment(content: string) {
    if (!userId || !workspaceId) return
    setIsSubmitting(true)
    try {
      await createComment(workspaceId, userId, todoId, content)
      await loadComments()
    } catch (error) {
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!userId || !workspaceId) return
    try {
      await deleteComment(workspaceId, userId, commentId)
      await loadComments()
      toast.success("Comment deleted")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment")
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Comments ({comments.length})</h4>

      {comments.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-md bg-muted/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.user_name || comment.user_email}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
              {(comment.user_id === userId || currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin") && (
                <Button size="sm" variant="ghost" onClick={() => handleDelete(comment.id)} className="shrink-0 self-start">
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <CommentInput onSubmit={handleAddComment} isSubmitting={isSubmitting} />
    </div>
  )
}
