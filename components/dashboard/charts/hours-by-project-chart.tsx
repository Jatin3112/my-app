"use client"

import { useRef, useEffect, useState } from "react"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
]

interface HoursByProjectChartProps {
  data: { project: string; hours: number }[]
}

export function HoursByProjectChart({ data }: HoursByProjectChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tickColor, setTickColor] = useState("#94a3b8")

  useEffect(() => {
    if (containerRef.current) {
      const styles = getComputedStyle(containerRef.current)
      const c = styles.getPropertyValue("color")
      if (c) setTickColor(c)
    }
  }, [])

  if (data.length === 0) {
    return (
      <Card className="rounded-xl border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Hours by Project</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground">
          No data yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-blue-500/20" ref={containerRef}>
      <CardHeader>
        <CardTitle className="text-lg">Hours by Project</CardTitle>
      </CardHeader>
      <CardContent>
        <Bar
          data={{
            labels: data.map((d) => d.project),
            datasets: [
              {
                label: "Hours",
                data: data.map((d) => d.hours),
                backgroundColor: data.map(
                  (_, i) => CHART_COLORS[i % CHART_COLORS.length]
                ),
                borderRadius: 6,
                maxBarThickness: 40,
              },
            ],
          }}
          options={{
            indexAxis: "y",
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
                grid: { display: false },
                ticks: { color: tickColor },
              },
            },
          }}
          height={260}
        />
      </CardContent>
    </Card>
  )
}
