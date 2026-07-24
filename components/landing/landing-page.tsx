"use client";

import { useState, useEffect, useRef } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { motion, useReducedMotion } from "motion/react";
import { GridBackground } from "@/components/ui/background-pattern";
import { BentoGrid } from "@/components/ui/bento-grid";
import { CtaSection } from "@/components/ui/cta-section";
import { Footer } from "@/components/ui/footer";
import { HeroDithering } from "@/components/ui/hero-dithering-card";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { Header } from "@/components/ui/header-2";

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [showBlur, setShowBlur] = useState(true);
  const featuresRef = useRef<HTMLDivElement>(null);
  const clerkContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Intercept Clerk's internal sign-up/sign-in link clicks to prevent
  // path-based navigation (which would redirect to /).
  useEffect(() => {
    const container = clerkContainerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href") || "";
      // Clerk links to /sign-up or /sign-in
      if (href.includes("/sign-up") || href.includes("/sign-in")) {
        e.preventDefault();
        e.stopPropagation();
        if (href.includes("/sign-up")) {
          setAuthMode("sign-up");
        } else {
          setAuthMode("sign-in");
        }
      }
    }

    container.addEventListener("click", handleClick, true);
    return () => container.removeEventListener("click", handleClick, true);
  }, [authOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const atBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 150;
      setShowBlur(!atBottom);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function openAuth(mode: "sign-in" | "sign-up") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <GridBackground />
      {/* Header */}
      <Header onLogin={() => openAuth("sign-in")} />

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-8 pb-24">
        <HeroDithering onGetStarted={() => openAuth("sign-up")} />
        {/* Explore More - just below hero card */}
        <div className="flex w-full justify-center pt-2">
          <button
            onClick={scrollToFeatures}
            className="flex cursor-pointer flex-col items-center gap-2 opacity-80 transition-all duration-300 hover:opacity-100 hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] hover:scale-105"
          >
            <p className="text-xs text-[var(--text-muted)] font-[var(--font-geist-mono)] tracking-[0.1em] uppercase">
              Explore more
            </p>
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--text-muted)]"
              animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </motion.svg>
          </button>
        </div>
      </section>

      {/* Progressive blur at viewport bottom */}
      {showBlur && (
        <ProgressiveBlur
          position="bottom"
          height="12.5%"
          className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none transition-opacity duration-300"
        />
      )}

      {/* Features */}
      <section id="features" ref={featuresRef} className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-sm text-[var(--text-muted)] font-[var(--font-geist-mono)] tracking-[0.1em] uppercase">
            Capabilities
          </p>
          <h2
            className="mb-16 text-[clamp(32px,4vw,48px)] leading-[1.2] tracking-[-0.02em] font-medium text-[var(--text-primary)]"
          >
            From idea to spec, in one place.
          </h2>

          <BentoGrid />
        </div>
      </section>

      <CtaSection onGetStarted={() => openAuth("sign-up")} />

      <Footer />

      {/* Auth Modal */}
      {authOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-xl"
          />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px 128px",
            }}
          />
          <button
            onClick={() => setAuthOpen(false)}
            className="absolute top-6 right-6 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] border border-white/15 bg-transparent transition-colors hover:text-[var(--text-primary)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
          <div className="relative z-10" ref={clerkContainerRef} onClick={(e) => e.stopPropagation()}>
            {authMode === "sign-in" ? (
              <SignIn
                routing="hash"
                forceRedirectUrl="/editor"
                appearance={{
                  variables: {
                    colorBackground: "var(--bg-surface)",
                    colorForeground: "var(--text-primary)",
                    colorInput: "var(--bg-elevated)",
                    colorInputForeground: "var(--text-primary)",
                    colorNeutral: "var(--text-secondary)",
                    colorPrimary: "#ffffff",
                    colorPrimaryForeground: "#080809",
                    colorDanger: "var(--state-error)",
                    colorSuccess: "var(--state-success)",
                    colorWarning: "var(--state-warning)",
                  },
                }}
              />
            ) : (
              <SignUp
                routing="hash"
                forceRedirectUrl="/editor"
                appearance={{
                  variables: {
                    colorBackground: "var(--bg-surface)",
                    colorForeground: "var(--text-primary)",
                    colorInput: "var(--bg-elevated)",
                    colorInputForeground: "var(--text-primary)",
                    colorNeutral: "var(--text-secondary)",
                    colorPrimary: "#ffffff",
                    colorPrimaryForeground: "#080809",
                    colorDanger: "var(--state-error)",
                    colorSuccess: "var(--state-success)",
                    colorWarning: "var(--state-warning)",
                  },
                }}
              />
            )}

            {/* Toggle sign-in / sign-up */}
            <p
              className="mt-4 text-center text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {authMode === "sign-in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => openAuth("sign-up")}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => openAuth("sign-in")}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
