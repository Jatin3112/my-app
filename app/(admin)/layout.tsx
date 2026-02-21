import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"
import { isAdmin } from "@/lib/api/admin"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email || !(await isAdmin(email))) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">VoiceTask Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">{email}</p>
      </header>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
