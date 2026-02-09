"use client"

import { useRef, useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface WeeklyActivityChartProps {
  data: { date: string; hours: number }[]
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tickColor, setTickColor] = useState("#94a3b8")
  const lineColor = "#8b5cf6"
  const fillColor = "rgba(139, 92, 246, 0.15)"

  useEffect(() => {
    if (containerRef.current) {
      const styles = getComputedStyle(containerRef.current)
      const c = styles.getPropertyValue("color")
      if (c) setTickColor(c)
    }
  }, [])

  const hasData = data.some((d) => d.hours > 0)

  const labels = data.map((d) => {
    const date = new Date(d.date + "T00:00:00")
    return DAY_NAMES[date.getDay()]
  })

  if (!hasData) {
    return (
      <Card className="rounded-xl border-violet-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No data yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-violet-500/20" ref={containerRef}>
      <CardHeader>
        <CardTitle className="text-lg">Weekly Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Hours",
                data: data.map((d) => d.hours),
                borderColor: lineColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: lineColor,
                pointBorderWidth: 0,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: tickColor },
              },
              y: {
                beginAtZero: true,
                grid: { color: "rgba(148, 163, 184, 0.1)" },
                ticks: { color: tickColor },
              },
            },
          }}
          height={200}
        />
      </CardContent>
    </Card>
  )
}
