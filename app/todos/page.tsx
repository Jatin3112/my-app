"use client"

import { AppShell } from "@/components/layout/app-shell"
import { TodoList } from "@/components/todos/todo-list"

export default function TodosPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <TodoList />
      </div>
    </AppShell>
  )
}
