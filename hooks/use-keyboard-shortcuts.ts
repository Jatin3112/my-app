"use client"

import { useEffect } from "react"

interface ShortcutHandlers {
  onNew?: () => void
  onSearch?: () => void
  onSelectAll?: () => void
  onDelete?: () => void
  onEscape?: () => void
}

function isTyping(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement
  const tag = target.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || target.isContentEditable
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrlOrCmd = e.ctrlKey || e.metaKey

      // Escape always works
      if (e.key === "Escape") {
        handlers.onEscape?.()
        return
      }

      // Ctrl/Cmd shortcuts work even when typing
      if (ctrlOrCmd && e.key === "k") {
        e.preventDefault()
        handlers.onSearch?.()
        return
      }

      if (ctrlOrCmd && e.key === "a" && !isTyping(e)) {
        e.preventDefault()
        handlers.onSelectAll?.()
        return
      }

      // Non-modifier shortcuts only when not typing
      if (isTyping(e)) return

      if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        handlers.onNew?.()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handlers.onDelete?.()
        return
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handlers])
}
