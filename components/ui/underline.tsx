"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface UnderlineProps {
  children: ReactNode
  color?: string
  strokeWidth?: number
  duration?: number
  delay?: number
  className?: string
}

export function Underline({
  children,
  color = "#ffffff",
  strokeWidth = 3,
  duration = 700,
  delay = 0,
  className = "",
}: UnderlineProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      setWidth(el.getBoundingClientRect().width)
    }
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(el)

    const timeout = setTimeout(() => setAnimate(true), delay)
    return () => {
      ro.disconnect()
      clearTimeout(timeout)
    }
  }, [delay])

  const pathLength = width
  const cy = 8

  const d = `M 0 ${cy} C ${width * 0.18} ${cy + 10}, ${width * 0.32} ${cy + 10}, ${width * 0.5} ${cy} C ${width * 0.68} ${cy - 8}, ${width * 0.82} ${cy - 8}, ${width} ${cy}`

  return (
    <span
      ref={ref}
      className={`relative inline-block bg-transparent ${className}`}
    >
      {children}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 w-full overflow-visible"
        style={{ bottom: "-6px" }}
        height="14"
        viewBox={`0 0 ${Math.max(width, 1)} 14`}
        preserveAspectRatio="none"
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.9}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: animate ? 0 : pathLength,
            transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 0.6}
          strokeLinecap="round"
          opacity={0.35}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: animate ? 0 : pathLength,
            transition: `stroke-dashoffset ${duration + 200}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
      </svg>
    </span>
  )
}
