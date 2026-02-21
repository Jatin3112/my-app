import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"
import { getTimesheetEntries } from "@/lib/api/timesheet"
import { generateTimesheetCSV, generateTimesheetPDF } from "@/lib/api/export"
import { format } from "date-fns"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")
  const formatType = searchParams.get("format") || "csv"
  const startDate = searchParams.get("startDate") || undefined
  const endDate = searchParams.get("endDate") || undefined
  const workspaceName = searchParams.get("workspaceName") || "Workspace"

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  try {
    const entries = await getTimesheetEntries(workspaceId, userId, startDate, endDate)

    if (formatType === "pdf") {
      const dateRange = startDate && endDate
        ? `${format(new Date(startDate), "MMM d, yyyy")} — ${format(new Date(endDate), "MMM d, yyyy")}`
        : "All Time"
      const buffer = generateTimesheetPDF(entries, workspaceName, dateRange)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="timesheet-${startDate || "all"}-to-${endDate || "now"}.pdf"`,
        },
      })
    }

    // Default: CSV
    const csv = generateTimesheetCSV(entries)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="timesheet-${startDate || "all"}-to-${endDate || "now"}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
