"use client"

import type React from "react"
import { useRef, useState, useId } from "react"

type Point = { date: string; revenue: number; orderCount?: number }

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k"
  return n.toFixed(0)
}

export default function SimpleChart({
  data,
  type = "line",
  height = 160,
}: {
  data: Point[]
  type?: "line" | "bar"
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const id = useId()

  if (!data || !data.length) return <div className="text-sm text-slate-600">No data to display</div>

  const values = data.map((d) => d.revenue)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const padding = 8
  const vw = 1200
  const vwInner = vw - padding * 2
  const stepX = vwInner / Math.max(1, data.length - 1)

  const yFor = (v: number) => {
    if (max === min) return height / 2
    const pct = (v - min) / (max - min)
    return height - padding - pct * (height - padding * 2)
  }

  const points = data.map((d, i) => ({ x: padding + i * stepX, y: yFor(d.revenue) }))

  const gradientId = `gradient-${id}`
  const pathData =
    type === "line"
      ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`
      : ""

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = vw / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX

    let nearest = 0
    let nearestDist = Number.POSITIVE_INFINITY
    points.forEach((p, idx) => {
      const d = Math.abs(p.x - mouseX)
      if (d < nearestDist) {
        nearestDist = d
        nearest = idx
      }
    })

    setHoverIndex(nearest)

    if (containerRef.current) {
      const parentRect = containerRef.current.getBoundingClientRect()
      const tooltipX = parentRect.left + (points[nearest].x / vw) * parentRect.width
      const tooltipY = parentRect.top + (points[nearest].y / height) * parentRect.height
      setTooltipPos({ x: tooltipX, y: tooltipY })
    }
  }

  const handleLeave = () => {
    setHoverIndex(null)
    setTooltipPos(null)
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <svg
        viewBox={`0 0 ${vw} ${height}`}
        width="100%"
        height={height}
        className="block"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g stroke="#e5e7eb" strokeWidth={0.8} strokeDasharray="2,2">
          <line x1={padding} x2={vw - padding} y1={padding} y2={padding} />
          <line x1={padding} x2={vw - padding} y1={height / 2} y2={height / 2} />
          <line x1={padding} x2={vw - padding} y1={height - padding} y2={height - padding} />
        </g>

        {type === "bar" &&
          data.map((d, i) => {
            const barWidth = Math.max(6, stepX * 0.5)
            const x = padding + i * stepX - barWidth / 2
            const y = yFor(d.revenue)
            const h = Math.max(2, height - padding - y)
            const isHovered = hoverIndex === i
            return (
              <rect
                key={d.date}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill={isHovered ? "#0ea5e9" : "#3b82f6"}
                rx={3}
                className="transition-colors"
              />
            )
          })}

        {type === "line" && (
          <>
            <path fill={`url(#${gradientId})`} d={pathData} />
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.5}
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {type === "line" &&
          data.map((d, i) => (
            <circle
              key={d.date}
              cx={points[i].x}
              cy={points[i].y}
              r={hoverIndex === i ? 5 : 3}
              fill={hoverIndex === i ? "#0ea5e9" : "#ffffff"}
              stroke={hoverIndex === i ? "#0ea5e9" : "#3b82f6"}
              strokeWidth={2}
              className="transition-all duration-150"
            />
          ))}

        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={Math.max(0, p.x - stepX / 2)}
            y={0}
            width={stepX}
            height={height}
            fill="transparent"
            pointerEvents="auto"
          />
        ))}
      </svg>

      {hoverIndex !== null && tooltipPos && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 12,
            transform: "translateY(-100%)",
            zIndex: 50,
          }}
        >
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl px-4 py-3 text-xs text-slate-900 backdrop-blur-sm whitespace-nowrap">
            <div className="font-bold text-slate-900 mb-2">{data[hoverIndex].date}</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Revenue:</span>
                <span className="font-semibold text-blue-600">
                  $
                  {Number(data[hoverIndex].revenue || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {typeof data[hoverIndex].orderCount !== "undefined" && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Orders:</span>
                  <span className="font-semibold text-slate-900">{data[hoverIndex].orderCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-600 mt-4 px-1">
        <div className="flex gap-4 min-w-0">
          {data[0] && <span className="text-slate-700 font-medium truncate">{data[0].date}</span>}
          {data[data.length - 1] && (
            <>
              <span className="text-slate-400">to</span>
              <span className="text-slate-700 font-medium truncate">{data[data.length - 1].date}</span>
            </>
          )}
        </div>
        <div className="flex gap-4 text-slate-700 font-medium shrink-0 ml-4">
          <div>
            <span className="text-slate-500 text-xs mr-1">min:</span>
            {formatNumber(min)}
          </div>
          <div>
            <span className="text-slate-500 text-xs mr-1">max:</span>
            {formatNumber(max)}
          </div>
        </div>
      </div>
    </div>
  )
}
