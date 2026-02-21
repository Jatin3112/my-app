import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Clock, CreditCard } from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalWorkspaces: number
  activeTrials: number
  activeSubscriptions: number
}

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Total Workspaces", value: stats.totalWorkspaces, icon: Building2 },
    { title: "Active Trials", value: stats.activeTrials, icon: Clock },
    { title: "Active Subscriptions", value: stats.activeSubscriptions, icon: CreditCard },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
