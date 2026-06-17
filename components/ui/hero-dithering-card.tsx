"use client"

import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"
import { PointerHighlight } from "@/components/ui/pointer-highlight"
import { RadialGlowButton } from "@/components/ui/radial-glow-button"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

interface HeroDitheringProps {
  onGetStarted?: () => void
}

export function HeroDithering({ onGetStarted }: HeroDitheringProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-12 w-full flex justify-center items-center px-4 md:px-6">
      <div
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-[48px] border border-border min-h-[600px] md:min-h-[600px] flex flex-col items-center justify-center duration-500" style={{ backgroundColor: "#000000" }}>
          <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-11">
              <Dithering
                colorBack="#000000"
                colorFront="#ffffff"
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.6 : 0.2}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">

            <h1
              className="mb-6"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-geist-sans)",
                fontSize: "clamp(48px, 8vw, 96px)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.025em",
              }}
            >
              Design systems
              <br />
              <PointerHighlight
                containerClassName="mx-auto mt-4 inline-block"
                rectangleClassName="border-neutral-700 dark:border-neutral-500"
                pointerClassName="text-accent-primary"
                autoPlay
                interval={7500}
              >
                <span style={{ fontFamily: "var(--font-nanum)" }}>together</span>
              </PointerHighlight>
            </h1>

            <p
              className="mx-auto mt-4 mb-12 max-w-lg text-center text-lg"
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Start with an idea.
              <br />
              End with an architecture everyone understands.
            </p>

            <RadialGlowButton onClick={onGetStarted}>
              Get started
            </RadialGlowButton>
          </div>
        </div>
      </div>
    </section>
  )
}
