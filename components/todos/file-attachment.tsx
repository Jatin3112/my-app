"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, Upload, Trash2, FileText, Image, File as FileIcon, Download } from "lucide-react"
import { toast } from "sonner"
import { getAttachments, deleteAttachment } from "@/lib/api/attachments"
import { useWorkspace } from "@/hooks/use-workspace"
import { useSession } from "next-auth/react"
import type { Attachment } from "@/lib/db/schema"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return <FileText className="w-4 h-4" />
  return <FileIcon className="w-4 h-4" />
}

export function FileAttachment({ todoId }: { todoId: string }) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (todoId && workspaceId && userId) {
      loadAttachments()
    }
  }, [todoId, workspaceId, userId])

  async function loadAttachments() {
    if (!workspaceId || !userId) return
    try {
      const data = await getAttachments(todoId, workspaceId, userId)
      setAttachments(data)
    } catch (error) {
      console.error("Failed to load attachments:", error)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", workspaceId)
      formData.append("todoId", todoId)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      toast.success("File uploaded")
      await loadAttachments()
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!workspaceId || !userId) return
    try {
      await deleteAttachment(attachmentId, workspaceId, userId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      toast.success("File deleted")
    } catch (error) {
      toast.error("Failed to delete file")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="w-4 h-4" />
          Attachments ({attachments.length})
        </h4>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm"
            >
              {getFileIcon(attachment.mime_type)}
              <a
                href={`/${attachment.file_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate hover:underline"
              >
                {attachment.file_name}
              </a>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatFileSize(attachment.file_size)}
              </span>
              <a
                href={`/${attachment.file_key}`}
                download={attachment.file_name}
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => handleDelete(attachment.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
