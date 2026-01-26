import Link from "next/link"
import { ProjectManager } from "@/components/todos/project-manager"
import { TodoList } from "@/components/todos/todo-list"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TodosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <ProjectManager />
          <TodoList />
        </div>
      </div>
    </div>
  )
}
