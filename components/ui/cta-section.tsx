import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CtaSectionProps {
  onGetStarted?: () => void
}

export function CtaSection({ onGetStarted }: CtaSectionProps) {
  return (
    <section className="relative px-6 py-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px]"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="mb-4 text-xs text-[var(--text-muted)] font-[var(--font-geist-mono)] tracking-[0.1em] uppercase">
          Ready to start?
        </p>
        <h2 className="mb-6 text-[clamp(32px,5vw,56px)] leading-[1.1] tracking-[-0.02em] font-medium text-[var(--text-primary)]">
          Build systems everyone understands.
        </h2>
        <p className="mb-10 max-w-lg text-lg text-[var(--text-secondary)] leading-relaxed">
          From the first idea to a shared architecture spec — KubeCanvas keeps your team aligned.
        </p>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="h-11 gap-2 rounded-xl bg-white px-7 text-[15px] font-medium text-black hover:bg-white/90 cursor-pointer"
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
