"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  isSubmitting?: boolean
}

export function CommentInput({ onSubmit, isSubmitting }: CommentInputProps) {
  const [content, setContent] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    await onSubmit(content.trim())
    setContent("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        rows={2}
        className="flex-1 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()} className="self-end">
        <Send className="size-4" />
      </Button>
    </form>
  )
}
