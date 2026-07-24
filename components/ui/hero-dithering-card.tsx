"use client"

import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy, useRef, useEffect } from "react"
import { useReducedMotion } from "motion/react"
import BlurText from "@/components/ui/blur-text"
import { PointerHighlight } from "@/components/ui/pointer-highlight"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Underline } from "@/components/ui/underline"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

interface HeroDitheringProps {
  onGetStarted?: () => void
}

export function HeroDithering({ onGetStarted }: HeroDitheringProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [firstDone, setFirstDone] = useState(false)
  const [showPointer, setShowPointer] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  const shaderSpeed =
    prefersReducedMotion || !isVisible ? 0 : isHovered ? 0.6 : 0.2

  return (
    <section className="py-12 w-full flex justify-center items-center px-4 md:px-6">
      <div
        ref={cardRef}
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] min-h-[520px] md:min-h-[540px] flex flex-col items-center justify-center duration-500 bg-black">
          <Suspense fallback={<div className="absolute inset-0 bg-[var(--bg-subtle)]/20" />}>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.11]">
              <Dithering
                colorBack="#000000"
                colorFront="#ffffff"
                shape="warp"
                type="4x4"
                speed={shaderSpeed}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            <h1
              className="mb-6 text-[clamp(48px,8vw,96px)] leading-none tracking-[-0.025em] font-medium text-[var(--text-primary)]"
            >
              <BlurText
                text="Design systems"
                delay={150}
                stepDuration={0.3}
                className="justify-center text-[clamp(48px,8vw,96px)] leading-none tracking-[-0.025em] font-medium text-[var(--text-primary)]"
                onAnimationComplete={() => setFirstDone(true)}
              />
              <br />
              <span className="relative inline-block pt-2">
                <span
                  aria-hidden
                  className="invisible inline-block text-[1.1em] [font-family:var(--font-gochi-hand)]"
                >
                  together
                </span>
                {firstDone && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    {!showPointer && (
                      <BlurText
                        text="together"
                        delay={200}
                        stepDuration={0.3}
                        className="translate-y-2 justify-center text-[clamp(48px,8vw,96px)] leading-none tracking-[-0.025em] font-medium text-[var(--text-primary)] [font-family:var(--font-gochi-hand)]"
                        onAnimationComplete={() => {
                          setTimeout(() => {
                            setShowPointer(true)
                          }, 1500)
                        }}
                      />
                    )}
                    {showPointer && (
                      <PointerHighlight
                        containerClassName="inline-block"
                        rectangleClassName="border-white/25"
                        pointerClassName="text-white"
                        autoPlay={!prefersReducedMotion}
                        interval={7500}
                      >
                        <Underline delay={500} duration={600}>
                          <span className="text-[clamp(48px,8vw,96px)] leading-none tracking-[-0.025em] font-medium text-[var(--text-primary)] [font-family:var(--font-gochi-hand)]">
                            together
                          </span>
                        </Underline>
                      </PointerHighlight>
                    )}
                  </span>
                )}
              </span>
            </h1>

            <p
              className="mx-auto mt-4 mb-12 max-w-lg text-center text-lg text-[var(--text-secondary)] leading-relaxed"
            >
              Start with an idea.
              <br />
              End with an architecture everyone understands.
            </p>

            <ShimmerButton
              onClick={onGetStarted}
              className="h-11 gap-2 px-7 text-[15px] font-medium"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </ShimmerButton>
          </div>
        </div>
      </div>
    </section>
  )
}
