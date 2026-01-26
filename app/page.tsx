import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Task Manager
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your todos and track your time efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/todos" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <CheckSquare className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">Todos</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Organize your tasks with projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Create and manage todos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Organize by projects
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Track completion status
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link href="/timesheet" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Clock className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">Timesheet</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Track your work hours by date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Log daily work entries
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Track hours per task
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Add detailed notes
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
