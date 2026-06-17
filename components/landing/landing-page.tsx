"use client";

import { useState, useEffect, useRef } from "react";
import { SignIn } from "@clerk/nextjs";
import BorderGlow from "@/components/ui/BorderGlow";
import { HeroDithering } from "@/components/ui/hero-dithering-card";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { Header } from "@/components/ui/header-2";

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [showExplore, setShowExplore] = useState(true);
  const [showBlur, setShowBlur] = useState(true);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const atBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 150;
      setShowBlur(!atBottom);
      setShowExplore(scrollY < 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function openAuth(mode: "sign-in" | "sign-up") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function scrollToFeatures() {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      {/* Header */}
      <Header onLogin={() => openAuth("sign-in")} />

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-8 pb-24">
        <HeroDithering onGetStarted={() => setAuthOpen(true)} />
      </section>

      {/* Progressive blur at viewport bottom */}
      {showBlur && (
        <ProgressiveBlur
          position="bottom"
          height="20%"
          className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none transition-opacity duration-300"
        />
      )}

      {/* Explore More - fixed at bottom */}
      <div
        className={`pointer-events-none fixed bottom-6 left-0 z-40 flex w-full justify-center transition-opacity duration-300 ${showExplore ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <button
          onClick={scrollToFeatures}
          className="pointer-events-auto flex cursor-pointer flex-col items-center gap-2 opacity-60 transition-opacity hover:opacity-100"
        >
          <p
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Explore more
          </p>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)" }}
            className="animate-bounce"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Features */}
      <section id="features" ref={featuresRef} className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Capabilities
          </p>
          <h2
            className="mb-16"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist-sans)",
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Everything you need
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <BorderGlow
              backgroundColor="var(--bg-surface)"
              glowColor="180 60 60"
              glowIntensity={0.8}
              borderRadius={8}
              glowRadius={30}
              colors={["#00c8d4", "#6457f9", "#38bdf8"]}
            >
              <div className="p-6">
                <p
                  className="mb-3 text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  01
                </p>
                <h3
                  className="mb-2 text-lg"
                  style={{ color: "var(--text-primary)", fontWeight: 400 }}
                >
                  Real-time canvas
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                >
                  A shared workspace where collaborators design systems together
                  with live presence and instant updates.
                </p>
              </div>
            </BorderGlow>

            <BorderGlow
              backgroundColor="var(--bg-surface)"
              glowColor="260 60 60"
              glowIntensity={0.8}
              borderRadius={8}
              glowRadius={30}
              colors={["#6457f9", "#c084fc", "#a78bfa"]}
            >
              <div className="p-6">
                <p
                  className="mb-3 text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  02
                </p>
                <h3
                  className="mb-2 text-lg"
                  style={{ color: "var(--text-primary)", fontWeight: 400 }}
                >
                  AI generation
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                >
                  Describe your system in natural language and watch AI generate a
                  complete architecture on the canvas.
                </p>
              </div>
            </BorderGlow>

            <BorderGlow
              backgroundColor="var(--bg-surface)"
              glowColor="160 50 60"
              glowIntensity={0.8}
              borderRadius={8}
              glowRadius={30}
              colors={["#34d399", "#38bdf8", "#00c8d4"]}
            >
              <div className="p-6">
                <p
                  className="mb-3 text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-geist-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  03
                </p>
                <h3
                  className="mb-2 text-lg"
                  style={{ color: "var(--text-primary)", fontWeight: 400 }}
                >
                  Spec export
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                >
                  Convert your finished architecture into a persistent Markdown
                  technical specification, ready to share.
                </p>
              </div>
            </BorderGlow>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {authOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
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
            className="absolute top-6 right-6 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors"
            style={{
              color: "var(--text-muted)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backgroundColor: "transparent",
            }}
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
          <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
            <SignIn
              routing="hash"
              appearance={{
                variables: {
                  colorBackground: "var(--bg-surface)",
                  colorForeground: "var(--text-primary)",
                  colorInput: "var(--bg-elevated)",
                  colorInputForeground: "var(--text-primary)",
                  colorNeutral: "var(--text-secondary)",
                  colorPrimary: "var(--accent-primary)",
                  colorPrimaryForeground: "var(--bg-base)",
                  colorDanger: "var(--state-error)",
                  colorSuccess: "var(--state-success)",
                  colorWarning: "var(--state-warning)",
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
