import Link from "next/link"
import { TimesheetList } from "@/components/timesheet/timesheet-list"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TimesheetPage() {
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

          <TimesheetList />
        </div>
      </div>
    </div>
  )
}
