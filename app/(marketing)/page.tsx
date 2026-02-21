import Link from "next/link"
import {
  Mic,
  Clock,
  FolderOpen,
  Users,
  BarChart3,
  Bell,
  Sparkles,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Mic,
    title: "Voice Capture",
    description:
      "Speak naturally and let AI parse your input into structured tasks, time entries, and project updates.",
  },
  {
    icon: Clock,
    title: "Smart Timesheets",
    description:
      "Log hours effortlessly. Track time by project with automatic date and duration parsing.",
  },
  {
    icon: FolderOpen,
    title: "Project Management",
    description:
      "Organize work across projects with drag-and-drop task boards, priorities, and due dates.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, assign roles, and collaborate with real-time notifications.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description:
      "Visual charts and metrics to track productivity, project progress, and team performance.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Stay informed with customizable alerts for task updates, comments, and deadlines.",
  },
]

const steps = [
  {
    icon: Mic,
    number: 1,
    title: "Speak",
    description:
      "Just say what you did. \"Worked 3 hours on Acme redesign\" or \"Call client by Friday, high priority\"",
  },
  {
    icon: Sparkles,
    number: 2,
    title: "AI Parses",
    description:
      "Our AI understands context, matches projects, extracts dates, priorities, and durations automatically.",
  },
  {
    icon: CheckCircle,
    number: 3,
    title: "Done",
    description:
      "Review the parsed result, make any edits, and save. Your data is organized instantly.",
  },
]

const stats = [
  { value: "500+", label: "Projects Managed" },
  { value: "10,000+", label: "Hours Tracked" },
  { value: "98%", label: "Time Saved on Data Entry" },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Manage Projects with{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Your Voice
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The AI-powered project manager that turns your voice into organized
            tasks, timesheets, and project updates. Built for freelancers and
            small agencies.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage your work
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="size-7 text-primary" />
                </div>
                <div className="mt-4 inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by freelancers and agencies
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-card p-8 text-center shadow-sm"
              >
                <p className="text-4xl font-extrabold text-primary">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
