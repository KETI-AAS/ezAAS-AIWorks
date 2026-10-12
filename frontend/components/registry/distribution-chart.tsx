"use client"

import { useEffect, useRef, useState } from "react"
import { Cell, Label, Pie, PieChart } from "recharts"
import { ChevronDown, ChevronUp } from "lucide-react"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import type { DatasetClass } from "@/lib/registry-data"

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

type DistributionChartProps = {
  data: DatasetClass[]
  collapsibleLegend?: boolean
  collapsedLegendHeight?: number
  collapsedLegendRows?: number
}

export function DistributionChart({
  data,
  collapsibleLegend = false,
  collapsedLegendHeight = 160,
  collapsedLegendRows = 4,
}: DistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const chartData = data.map((d, i) => ({
    ...d,
    fill: palette[i % palette.length],
  }))

  const config: ChartConfig = data.reduce((acc, d, i) => {
    acc[d.label] = { label: d.label, color: palette[i % palette.length] }
    return acc
  }, {} as ChartConfig)

  const listRef = useRef<HTMLUListElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [collapsedHeight, setCollapsedHeight] = useState(collapsedLegendHeight)

  useEffect(() => {
    if (!collapsibleLegend) {
      return
    }

    const listEl = listRef.current
    if (!listEl) {
      return
    }

      const updateOverflowState = () => {
      const fullHeight = listEl.scrollHeight
      setContentHeight(fullHeight)

      const rowEls = Array.from(listEl.querySelectorAll<HTMLLIElement>("li"))
      const rowsToMeasure = rowEls.slice(0, collapsedLegendRows)
      const rowHeightTotal = rowsToMeasure.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0)
      const gap = Number(getComputedStyle(listEl).rowGap.replace("px", "")) || 0
      const targetHeight = rowHeightTotal > 0 ? rowHeightTotal + gap * Math.max(rowsToMeasure.length - 1, 0) : collapsedLegendHeight
      setCollapsedHeight(targetHeight)

      const overflow = fullHeight > targetHeight
      setIsOverflowing(overflow)
      if (!overflow) {
        setExpanded(false)
      }
    }

    updateOverflowState()

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState()
    })
    resizeObserver.observe(listEl)

    return () => resizeObserver.disconnect()
  }, [collapsibleLegend, collapsedLegendHeight, collapsedLegendRows, data])

  const legendStyle = collapsibleLegend && isOverflowing
    ? {
        maxHeight: expanded ? `${contentHeight}px` : `${collapsedHeight}px`,
        transition: "max-height 180ms ease",
      }
    : undefined

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={config} className="mx-auto aspect-square max-h-[240px] w-full">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={62} strokeWidth={3}>
            {chartData.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-semibold"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 22}
                        className="fill-muted-foreground text-xs"
                      >
                        전체 샘플
                      </tspan>
                    </text>
                  )
                }
                return null
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="relative flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_92px_64px] items-center rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>클래스명</span>
          <span className="text-right">클래스별 개수</span>
          <span className="text-right">분포 비율</span>
        </div>

        <ul
          ref={listRef}
          className="flex flex-col overflow-hidden"
          style={legendStyle}
        >
          {chartData.map((d) => (
            <li
              key={d.label}
              className="grid grid-cols-[minmax(0,1fr)_92px_64px] items-center border-b border-border/60 px-3 py-2.5 text-sm last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="truncate text-foreground">{d.label}</span>
              </span>

              <span className="text-right tabular-nums text-foreground">
                {d.value.toLocaleString()}
              </span>

              <span className="text-right tabular-nums text-muted-foreground">
                {total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </li>
          ))}
        </ul>

        {collapsibleLegend && isOverflowing ? (
          <>
            {!expanded ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-10 h-12 bg-gradient-to-t from-card via-card/70 to-transparent" />
            ) : null}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-label={expanded ? "클래스 분포 접기" : "클래스 분포 전체 보기"}
              >
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
