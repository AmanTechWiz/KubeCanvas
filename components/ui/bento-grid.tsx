import { Bot, FileText, Users, MousePointer2 } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import BorderGlow from "@/components/ui/border-glow"

export function BentoGrid() {
  const prefersReducedMotion = useReducedMotion()
  const cursorAnimation = prefersReducedMotion ? undefined : { x: [0, 60, 0], y: [0, -20, 0] }
  const cursorAnimation2 = prefersReducedMotion ? undefined : { x: [0, -40, 0], y: [0, 30, 0] }
  const cursorAnimation3 = prefersReducedMotion ? undefined : { x: [0, 30, 0], y: [0, 40, 0] }

  const sectionRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Left column — AI generation + Collaboration (swapped) */}
      <div className="flex flex-col gap-4">
        <BorderGlow
          borderRadius={16}
          glowRadius={30}
          glowIntensity={0.6}
          fillOpacity={0.25}
          backgroundColor="#09070a"
          colors={["#ffffff", "#a1a1aa", "#52525b"]}
          animated={isInView}
          className="min-h-[280px]"
        >
          <BentoCard
            icon={<Bot className="h-5 w-5" />}
            eyebrow="AI generation"
            title="Describe it. Watch it appear."
            description="Type your system in plain language and the AI drafts nodes, connections, and a complete architecture on the canvas."
          >
            <div className="mt-auto w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-sm">
              A microservices e-commerce backend with checkout, inventory, and notifications
            </div>
          </BentoCard>
        </BorderGlow>

        <BorderGlow
          borderRadius={16}
          glowRadius={30}
          glowIntensity={0.6}
          fillOpacity={0.25}
          backgroundColor="#09070a"
          colors={["#ffffff", "#a1a1aa", "#52525b"]}
          animated={isInView}
        >
          <BentoCard
            icon={<Users className="h-5 w-5" />}
            eyebrow="Collaboration"
            title="Invite the team"
            description="Share a room, manage access, and co-edit without stepping on each other."
          >
            <div className="mt-auto flex -space-x-2">
              <img
                src="https://i.pravatar.cc/64?img=11"
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <img
                src="https://i.pravatar.cc/64?img=5"
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <img
                src="https://i.pravatar.cc/64?img=14"
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <img
                src="https://i.pravatar.cc/64?img=23"
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-medium text-white backdrop-blur-sm">
                +3
              </div>
            </div>
          </BentoCard>
        </BorderGlow>
      </div>

      {/* Right column — Spec export + Real-time canvas (swapped) */}
      <div className="flex flex-col gap-4">
        <BorderGlow
          borderRadius={16}
          glowRadius={30}
          glowIntensity={0.6}
          fillOpacity={0.25}
          backgroundColor="#09070a"
          colors={["#ffffff", "#a1a1aa", "#52525b"]}
          animated={isInView}
        >
          <BentoCard
            icon={<FileText className="h-5 w-5" />}
            eyebrow="Spec export"
            title="Export the spec"
            description="Turn any architecture into a clean Markdown technical spec files in one click. Then use it with any coding agent to start building."
          >
            <div className="mt-auto flex items-center gap-3">
              <img
                src="/claude-color.webp"
                alt="Claude"
                className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] object-contain p-1 backdrop-blur-sm"
              />
              <img
                src="/opencode.webp"
                alt="OpenCode"
                className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] object-contain p-1 backdrop-blur-sm"
              />
              <img
                src="/codex.webp"
                alt="Codex"
                className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] object-contain p-1 backdrop-blur-sm"
              />
            </div>
          </BentoCard>
        </BorderGlow>

        <BorderGlow
          borderRadius={16}
          glowRadius={30}
          glowIntensity={0.6}
          fillOpacity={0.25}
          backgroundColor="#09070a"
          colors={["#ffffff", "#a1a1aa", "#52525b"]}
          animated={isInView}
          className="min-h-[280px]"
        >
          <BentoCard
            icon={<MousePointer2 className="h-5 w-5" />}
            eyebrow="Real-time canvas"
            title="Design together, live."
            description="Shared workspace with live cursors and instant updates so the whole team stays on the same diagram."
          >
            <div className="relative mt-auto h-32 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <motion.div
                className="absolute top-1/2 left-1/4 -translate-y-1/2"
                animate={cursorAnimation}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-black">
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
                  </svg>
                  Alex
                </div>
              </motion.div>
              <motion.div
                className="absolute top-1/3 right-1/4"
                animate={cursorAnimation2}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-black">
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
                  </svg>
                  Sam
                </div>
              </motion.div>
              <motion.div
                className="absolute bottom-1/3 left-1/3"
                animate={cursorAnimation3}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-black">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </svg>
                  KubeAI
                </div>
              </motion.div>
              <div className="absolute bottom-4 left-4 right-4 top-4 rounded-lg border border-white/5" />
            </div>
          </BentoCard>
        </BorderGlow>
      </div>
    </div>
  )
}

function BentoCard({
  children,
  icon,
  eyebrow,
  title,
  description,
}: {
  children?: React.ReactNode
  icon: React.ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center gap-2 text-white">
        {icon}
        <span className="text-xs font-medium text-[var(--text-muted)] font-[var(--font-geist-mono)] uppercase tracking-[0.05em]">
          {eyebrow}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      {children}
    </div>
  )
}
