import { getAdminStats, getWorkspaceList } from "@/lib/api/admin"
import { getAllPlans } from "@/lib/api/subscriptions"
import { AdminStatsCards } from "@/components/admin/stats-cards"
import { WorkspaceTable } from "@/components/admin/workspace-table"
import type { Plan } from "@/lib/db/schema"

export default async function AdminPage() {
  const [stats, workspaces, plans] = await Promise.all([
    getAdminStats(),
    getWorkspaceList(),
    getAllPlans(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Platform overview and workspace management.
        </p>
      </div>

      <AdminStatsCards stats={stats} />

      <div>
        <h3 className="text-lg font-semibold mb-4">All Workspaces</h3>
        <WorkspaceTable
          workspaces={workspaces}
          plans={plans.map((p: Plan) => ({ id: p.id, name: p.name, slug: p.slug }))}
        />
      </div>
    </div>
  )
}
