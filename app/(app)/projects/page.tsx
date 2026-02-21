import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { authOptions } from "@/lib/auth/auth-options"
import { getWorkspacesForUser } from "@/lib/api/workspaces"
import { getProjects } from "@/lib/api/projects"
import { AppShell } from "@/components/layout/app-shell"
import { ProjectList } from "@/components/projects/project-list"

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) redirect("/login")

  const workspaces = await getWorkspacesForUser(userId)
  if (workspaces.length === 0) redirect("/dashboard")

  const cookieStore = await cookies()
  const lastId = cookieStore.get("last-workspace-id")?.value
  const currentWorkspace = (lastId && workspaces.find((w) => w.id === lastId)) || workspaces[0]

  const initialProjects = await getProjects(currentWorkspace.id, userId)

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <ProjectList
          initialProjects={initialProjects}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
        />
      </div>
    </AppShell>
  )
}
