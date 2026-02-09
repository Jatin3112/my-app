"use client"

import { useRef, useEffect, useState } from "react"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type Plugin,
} from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

ChartJS.register(ArcElement, Tooltip, Legend)

interface TodoCompletionChartProps {
  completed: number
  pending: number
}

export function TodoCompletionChart({
  completed,
  pending,
}: TodoCompletionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [colors, setColors] = useState({
    green: "#22c55e",
    orange: "#f97316",
    fg: "#e2e8f0",
  })

  useEffect(() => {
    if (containerRef.current) {
      const styles = getComputedStyle(containerRef.current)
      const fg = styles.getPropertyValue("color")
      setColors({
        green: "#22c55e",
        orange: "#f97316",
        fg: fg || "#e2e8f0",
      })
    }
  }, [])

  const total = completed + pending
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  const centerTextPlugin: Plugin<"doughnut"> = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, width, height } = chart
      ctx.save()
      ctx.font = "bold 28px sans-serif"
      ctx.fillStyle = colors.fg
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${percent}%`, width / 2, height / 2)
      ctx.restore()
    },
  }

  if (total === 0) {
    return (
      <Card className="rounded-xl border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Task Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground">
          No tasks yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-emerald-500/20" ref={containerRef}>
      <CardHeader>
        <CardTitle className="text-lg">Task Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div className="w-full max-w-[260px]">
          <Doughnut
            data={{
              labels: ["Completed", "Pending"],
              datasets: [
                {
                  data: [completed, pending],
                  backgroundColor: [colors.green, colors.orange],
                  borderWidth: 0,
                  hoverOffset: 6,
                },
              ],
            }}
            options={{
              cutout: "70%",
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: "bottom",
                  labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    padding: 16,
                    color: colors.fg,
                  },
                },
              },
            }}
            plugins={[centerTextPlugin]}
          />
        </div>
      </CardContent>
    </Card>
  )
}
