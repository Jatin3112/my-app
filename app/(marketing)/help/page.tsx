import type { Metadata } from "next"
import Link from "next/link"
import {
  Mic,
  Clock,
  FolderOpen,
  Users,
  CheckCircle,
  CreditCard,
  Sparkles,
  ArrowRight,
  ListTodo,
  Download,
  Shield,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Getting Started Guide",
  description:
    "Learn how to use VoiceTask — from setting up your workspace to managing projects with voice commands.",
}

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "voice-capture", label: "Voice Capture" },
  { id: "projects", label: "Projects" },
  { id: "todos", label: "Todos" },
  { id: "timesheets", label: "Timesheets" },
  { id: "team", label: "Team Management" },
  { id: "billing", label: "Billing & Plans" },
]

export default function HelpPage() {
  return (
    <>
      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Getting Started Guide
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Everything you need to know to get up and running with VoiceTask.
            From your first workspace to AI-powered voice capture.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="pb-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>On this page</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="grid gap-2 sm:grid-cols-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowRight className="size-4 shrink-0" />
                    {section.label}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 1. Getting Started */}
      <section id="getting-started" className="scroll-mt-20 bg-muted/50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Getting Started
            </h2>
          </div>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  Sign up for a free trial
                </CardTitle>
                <CardDescription>No credit card required</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Head to the{" "}
                  <Link href="/register" className="font-medium text-primary underline underline-offset-4">
                    registration page
                  </Link>{" "}
                  and create your account with email, or sign up instantly with
                  Google or GitHub. You will get a 14-day free trial with full
                  Agency-level features -- unlimited projects, workspaces, and
                  all AI capabilities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  Create your first workspace
                </CardTitle>
                <CardDescription>
                  Workspaces keep your work organized
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  After signing in, you will be prompted to create a workspace.
                  A workspace is a container for your projects, todos, and
                  timesheets. Freelancers typically need one workspace per
                  business. Agencies may want separate workspaces per client or
                  department.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  Invite your team
                </CardTitle>
                <CardDescription>
                  Collaborate with team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Go to your workspace settings and invite team members by
                  email. They will receive an invitation link. You can assign
                  roles -- Owner, Admin, or Member -- to control what each person
                  can do. See the{" "}
                  <a href="#team" className="font-medium text-primary underline underline-offset-4">
                    Team Management
                  </a>{" "}
                  section below for details on roles.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Voice Capture */}
      <section id="voice-capture" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Voice Capture
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            Voice capture is the core feature of VoiceTask. Instead of filling
            out forms manually, just speak naturally and let AI do the work.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>How to use voice capture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">1. Click the microphone button</strong>{" "}
                    -- you will find the floating action button (the microphone icon)
                    in the bottom-right corner of the app on any page.
                  </p>
                  <p>
                    <strong className="text-foreground">2. Speak naturally</strong>{" "}
                    -- describe what you want to log. The AI understands context
                    and extracts the relevant information automatically.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Review and confirm</strong>{" "}
                    -- the AI will parse your speech into structured fields. You
                    can review and edit any field before saving.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Example voice commands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">For timesheets:</p>
                    <p className="mt-1 text-sm text-muted-foreground italic">
                      &quot;Worked 3 hours on Acme homepage redesign&quot;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parses into: Project = Acme, Hours = 3, Task = homepage
                      redesign
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">For todos:</p>
                    <p className="mt-1 text-sm text-muted-foreground italic">
                      &quot;Call client about invoice by Friday high priority&quot;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parses into: Title = Call client about invoice, Due = this
                      Friday, Priority = High
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">Natural language:</p>
                    <p className="mt-1 text-sm text-muted-foreground italic">
                      &quot;Spent two and a half hours yesterday fixing the login bug on Project Phoenix&quot;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parses into: Project = Project Phoenix, Hours = 2.5, Date
                      = yesterday, Task = fixing the login bug
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Projects */}
      <section id="projects" className="scroll-mt-20 bg-muted/50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            Projects are the top-level way to organize your work. Each project
            can have its own todos, timesheets, and team assignments.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Creating a project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Navigate to the <strong className="text-foreground">Projects</strong> page
                  from the sidebar and click <strong className="text-foreground">New Project</strong>.
                  Give your project a name and optional description. Projects
                  are scoped to your current workspace, so team members in the
                  same workspace can see and collaborate on them.
                </p>
                <p>
                  The number of projects you can create depends on your plan:
                  Solo allows 3, Team allows 10, and Agency has unlimited
                  projects.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Managing projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  From the project list, you can edit a project name, archive
                  completed projects, or delete projects you no longer need.
                  The dashboard provides an overview of all active projects with
                  progress indicators, todo counts, and hours logged.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Todos */}
      <section id="todos" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <ListTodo className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Todos</h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            Todos are your task list. Create them manually, via voice, or set
            them up as recurring tasks.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Creating todos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Go to the <strong className="text-foreground">Todos</strong> page
                  and click <strong className="text-foreground">Add Todo</strong>,
                  or use the voice capture microphone button from anywhere in
                  the app. Each todo can be assigned to a project and includes
                  fields for title, description, priority, due date, and
                  recurrence.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority and due dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Set priority levels -- <strong className="text-foreground">High</strong> (red),{" "}
                  <strong className="text-foreground">Medium</strong> (yellow),{" "}
                  <strong className="text-foreground">Low</strong> (blue), or{" "}
                  <strong className="text-foreground">None</strong>. Add due dates
                  to track deadlines. Overdue todos are highlighted in red so
                  you never miss a deadline.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Filtering and sorting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Use the filter bar to narrow your todo list by priority,
                  due date (overdue, today, this week, no date), or project.
                  Sort by priority, due date, created date, or name to find
                  what matters most. The dashboard also shows counts for
                  overdue and due-today items at a glance.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recurring todos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  For tasks that repeat, set a recurrence rule when creating
                  a todo: Daily, Weekly, or Monthly. When you complete a
                  recurring todo, the next occurrence is automatically created.
                  Recurring todos display a recurrence icon in the list so you
                  can easily identify them.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. Timesheets */}
      <section id="timesheets" className="scroll-mt-20 bg-muted/50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Timesheets</h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            Track your billable hours by project. Log time manually or use
            voice capture, then export for client invoicing.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Logging time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Navigate to the <strong className="text-foreground">Timesheets</strong> page
                  to add entries. Select a project, enter the hours, date, and
                  a brief description of the work done. Alternatively, use
                  voice capture to say something like &quot;Worked 2 hours on
                  Acme website today&quot; and the fields fill in automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="size-5 text-primary" />
                  Exporting timesheets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Click the <strong className="text-foreground">Export</strong> button
                  on the timesheet page and choose your format:
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <strong className="text-foreground">CSV</strong> -- raw data
                    that works with Excel, Google Sheets, or any spreadsheet tool.
                  </li>
                  <li>
                    <strong className="text-foreground">PDF</strong> -- a
                    formatted report with your workspace branding, summary
                    totals, and date range. Ready to send to clients.
                  </li>
                </ul>
                <p>
                  You can filter by date range and project before exporting to
                  get exactly the data you need.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Team Management */}
      <section id="team" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Team Management
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            Invite team members, assign roles, and collaborate within shared
            workspaces.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-primary" />
                  Inviting members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  From your workspace settings, enter a team member&apos;s email
                  address and select their role. They will receive an email
                  invitation with a link to join your workspace. The number of
                  members you can invite depends on your plan.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  Roles and permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Owner
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Full control over the workspace. Can delete the workspace,
                      transfer ownership, manage billing, and do everything
                      Admins and Members can do. Each workspace has exactly one
                      Owner.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Admin
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Can manage members (invite, remove, change roles), create
                      and manage all projects and todos, and view all workspace
                      data. Cannot delete the workspace or manage billing.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Member
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Can create, edit, and complete their own todos and
                      timesheet entries. Can view projects and comment on tasks.
                      Cannot manage other members or workspace settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Billing & Plans */}
      <section id="billing" className="scroll-mt-20 bg-muted/50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="size-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Billing & Plans
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            VoiceTask offers three paid plans after your free trial, with
            pricing in both INR and USD.
          </p>

          <div className="mt-8 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Free trial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Every new workspace starts with a <strong className="text-foreground">14-day free
                  trial</strong> that includes all Agency-level features. No credit
                  card is required to start. You will see a countdown banner as
                  your trial nears its end (at days 10, 12, 13, and 14). When
                  the trial expires, you will be prompted to choose a plan to
                  continue using VoiceTask.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plans overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-semibold">Plan</th>
                        <th className="pb-3 pr-4 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Limits</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-3 pr-4 font-medium text-foreground">
                          Solo
                        </td>
                        <td className="py-3 pr-4">$9/mo or &#8377;499/mo</td>
                        <td className="py-3">
                          1 user, 3 projects, 1 workspace
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 pr-4 font-medium text-foreground">
                          Team
                        </td>
                        <td className="py-3 pr-4">$19/mo or &#8377;999/mo</td>
                        <td className="py-3">
                          5 users, 10 projects, 3 workspaces
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-medium text-foreground">
                          Agency
                        </td>
                        <td className="py-3 pr-4">$35/mo or &#8377;1,999/mo</td>
                        <td className="py-3">
                          15 users, unlimited projects, unlimited workspaces
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  View the full feature comparison on the{" "}
                  <Link href="/pricing" className="font-medium text-primary underline underline-offset-4">
                    Pricing page
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upgrading, downgrading, and canceling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You can change your plan at any time from the{" "}
                  <strong className="text-foreground">Billing</strong> page in your
                  workspace. Upgrades take effect immediately with prorated
                  billing. Downgrades apply at the start of your next billing
                  cycle. If you cancel, your subscription stays active until the
                  end of the current period.
                </p>
                <p>
                  We accept UPI, credit/debit cards, and net banking via
                  Razorpay for Indian users. International users can pay with
                  credit/debit cards via Stripe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You can export all your data (projects, todos, timesheets,
                  comments) as a JSON file from your workspace settings at any
                  time. This ensures GDPR compliance and means you always own
                  your data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
