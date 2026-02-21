import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { authOptions } from "@/lib/auth/auth-options"
import { getWorkspacesForUser } from "@/lib/api/workspaces"
import { loadTodoPageData } from "@/lib/api/loaders"
import { AppShell } from "@/components/layout/app-shell"
import { TodoList } from "@/components/todos/todo-list"

export default async function TodosPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) redirect("/login")

  const workspaces = await getWorkspacesForUser(userId)
  if (workspaces.length === 0) redirect("/dashboard")

  const cookieStore = await cookies()
  const lastId = cookieStore.get("last-workspace-id")?.value
  const currentWorkspace = (lastId && workspaces.find((w) => w.id === lastId)) || workspaces[0]

  const initialData = await loadTodoPageData(currentWorkspace.id, userId)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <TodoList
          initialData={initialData}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
        />
      </div>
    </AppShell>
  )
}
