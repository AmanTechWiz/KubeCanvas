"use client"

import React, { useCallback, useState, useRef, useEffect, useMemo } from "react"
import {
  Bot,
  X,
  Send,
  Square,
  FileCode,
  Download,
  Plus,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { FeedContext } from "@/app/editor/[roomId]/canvas-editor"
import type { AiStatusFeedMessageData, AiChatFeedMessageData } from "@/types/tasks"
import { renderFormattedText } from "@/lib/format-chat"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentUserId: string
}

const STARTER_CHIPS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

const CHAT_STARTER_CHIPS = [
  "What DB should I use for a real-time chat app?",
  "Compare event-driven vs request-response architectures",
  "How do I design a rate limiter?",
]

/* ------------------------------------------------------------------ */
/*  Spiral Spinner (animated SVG from design spec)                     */
/* ------------------------------------------------------------------ */

function SpiralSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      role="img"
      aria-label="Thinking"
      className={className}
    >
      <defs>
        <circle id="sp-bg" r="2.4" fill="#ffffff" opacity="0.07" />
        <circle id="sp-dot" r="3.1" />
      </defs>
      <style>{`
        .sp{fill:#ffffff;opacity:0;animation:sp-k 2800ms cubic-bezier(0.25,1,0.5,1) infinite both;}
        @keyframes sp-k{0%{opacity:0;}4%{opacity:1;}26%{opacity:0.08;}100%{opacity:0;}}
        @media(prefers-reduced-motion:reduce){.sp{animation:none;opacity:0.45;}}
        .d00{animation-delay:2221ms;}.d01{animation-delay:2317ms;}.d02{animation-delay:869ms;}.d03{animation-delay:966ms;}.d04{animation-delay:1062ms;}
        .d10{animation-delay:2124ms;}.d11{animation-delay:772ms;}.d12{animation-delay:97ms;}.d13{animation-delay:193ms;}.d14{animation-delay:1159ms;}
        .d20{animation-delay:2028ms;}.d21{animation-delay:676ms;}.d22{animation-delay:0ms;}.d23{animation-delay:290ms;}.d24{animation-delay:1255ms;}
        .d30{animation-delay:1931ms;}.d31{animation-delay:579ms;}.d32{animation-delay:483ms;}.d33{animation-delay:386ms;}.d34{animation-delay:1352ms;}
        .d40{animation-delay:1834ms;}.d41{animation-delay:1738ms;}.d42{animation-delay:1641ms;}.d43{animation-delay:1545ms;}.d44{animation-delay:1448ms;}
      `}</style>
      {/* background grid */}
      {[6,17,28,39,50].map(x => [6,17,28,39,50].map(y => (
        <use key={`bg-${x}-${y}`} href="#sp-bg" x={x} y={y} />
      )))}
      {/* animated dots */}
      {[
        [6,6,"d00"],[17,6,"d01"],[28,6,"d02"],[39,6,"d03"],[50,6,"d04"],
        [6,17,"d10"],[17,17,"d11"],[28,17,"d12"],[39,17,"d13"],[50,17,"d14"],
        [6,28,"d20"],[17,28,"d21"],[28,28,"d22"],[39,28,"d23"],[50,28,"d24"],
        [6,39,"d30"],[17,39,"d31"],[28,39,"d32"],[39,39,"d33"],[50,39,"d34"],
        [6,50,"d40"],[17,50,"d41"],[28,50,"d42"],[39,50,"d43"],[50,50,"d44"],
      ].map(([x, y, cls]) => (
        <use key={`d-${x}-${y}`} className={`sp ${cls}`} href="#sp-dot" x={x} y={y} />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Run Tracker (subscribes to Trigger.dev realtime updates)          */
/* ------------------------------------------------------------------ */

function RunTracker({
  runId,
  token,
  onComplete,
  onError,
  onPhaseChange,
}: {
  runId: string
  token: string
  onComplete: (run: any) => void
  onError: (error: Error) => void
  onPhaseChange?: (phase: string | null) => void
}) {
  const completedRef = useRef(false)
  const stableComplete = useCallback(
    (run: any) => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete(run)
      }
    },
    [onComplete],
  )

  const { run, error } = useRealtimeRun(runId, {
    accessToken: token,
    onComplete: stableComplete,
  })

  // Report phase changes from task metadata to parent
  useEffect(() => {
    const phase = run?.metadata?.phase
    onPhaseChange?.(phase != null ? String(phase) : null)
  }, [run?.metadata?.phase, onPhaseChange])

  // Fallback 1: detect terminal status via run object
  useEffect(() => {
    if (
      !completedRef.current &&
      run &&
      (run.status === "COMPLETED" ||
        run.status === "FAILED" ||
        run.status === "CANCELED")
    ) {
      completedRef.current = true
      onComplete(run)
    }
  }, [run, onComplete])

  // Fallback 2: poll every 1s (fast) for 10s, then every 3s (slow)
  // Catches missed completion events from the realtime subscription
  useEffect(() => {
    if (completedRef.current) return
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let pollCount = 0

    const poll = async () => {
      if (completedRef.current) {
        if (intervalId) clearInterval(intervalId)
        return
      }
      try {
        const res = await fetch(`/api/ai/design/poll/${runId}`)
        if (!res.ok) return
        const data = await res.json()
        if (
          data.status === "COMPLETED" ||
          data.status === "FAILED" ||
          data.status === "CANCELED"
        ) {
          if (intervalId) clearInterval(intervalId)
          if (timeoutId) clearTimeout(timeoutId)
          if (!completedRef.current) {
            completedRef.current = true
            onComplete({ status: data.status })
          }
        }
      } catch {
        // Ignore polling errors — retry next tick
      }
    }

    // Fast polling: every 1s for the first 10 seconds
    intervalId = setInterval(() => {
      pollCount++
      poll()
      // After 10 polls (~10s), slow down to 3s
      if (pollCount >= 10 && intervalId) {
        clearInterval(intervalId)
        intervalId = setInterval(poll, 3000)
      }
    }, 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [runId, onComplete])

  useEffect(() => {
    if (error) onError(error)
  }, [error, onError])

  return null
}

/* ------------------------------------------------------------------ */
/*  AI Architect Tab                                                   */
/* ------------------------------------------------------------------ */

function AiArchitectTab({
  projectId,
  currentUserId,
  sendFeedMessage,
}: {
  projectId: string
  currentUserId: string
  sendFeedMessage: (data: AiStatusFeedMessageData) => void
}) {
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<{
    runId: string
    triggerDevRunId: string
    token: string
  } | null>(null)
  const [runPhase, setRunPhase] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Chat feed from Liveblocks (architect-only feed)
  const feedCtx = React.useContext(FeedContext)
  const chatMessages = feedCtx?.architectMessages ?? []
  const sendChatMessage = feedCtx?.sendArchitectMessage
  const statusLabel = feedCtx?.statusLabel ?? null
  const currentUserName = feedCtx?.currentUserName ?? "You"

  // Dynamic phase label from task metadata
  const phaseLabel = useMemo(() => {
    if (!runPhase || runPhase === "complete") return null
    switch (runPhase) {
      case "reading": return "Reading your canvas..."
      case "generating": return "Generating architecture..."
      case "patching": return "Building operations..."
      case "applying": return "Applying changes to canvas..."
      default: return "Thinking..."
    }
  }, [runPhase])

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 72), 160)}px`
  }, [input])

  // Clear chat error after 3 seconds
  useEffect(() => {
    if (!chatError) return
    const timer = setTimeout(() => setChatError(null), 3000)
    return () => clearTimeout(timer)
  }, [chatError])

  // Safety net: if isGenerating is true for > 5 minutes, force-clear it
  useEffect(() => {
    if (!isGenerating) return
    const timer = setTimeout(() => {
      setIsGenerating(false)
      setActiveRun(null)
    }, 300_000)
    return () => clearTimeout(timer)
  }, [isGenerating])

  const completedRunRef = useRef(false)

  const handleRunComplete = useCallback(
    (run: any) => {
      // Guard against double-fire (realtime + polling or re-mount races)
      if (completedRunRef.current) return
      completedRunRef.current = true

      setRunPhase(null)
      setIsGenerating(false)
      setActiveRun(null)

      if (run.status === "COMPLETED" && run.output) {
        const { thinking } = run.output
        const chatMsg = thinking || "Design complete. Your canvas has been updated."

        sendFeedMessage({ kind: "status", status: "complete" })
        sendChatMessage?.({
          kind: "chat",
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender: "KubeAI",
          role: "assistant",
          content: chatMsg,
          timestamp: Date.now(),
        })
      } else if (run.status === "COMPLETED") {
        // Completed but no output data — fallback
        sendFeedMessage({ kind: "status", status: "complete" })
        sendChatMessage?.({
          kind: "chat",
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender: "KubeAI",
          role: "assistant",
          content:
            "Design complete. Your canvas has been updated.",
          timestamp: Date.now(),
        })
      } else if (
        run.status === "FAILED" ||
        run.status === "CRASHED" ||
        run.status === "TIMED_OUT"
      ) {
        const chatMsg = run.error
          ? `Design generation failed: ${run.error}`
          : "Design generation failed. Please try again."
        setChatError(chatMsg)
        sendFeedMessage({ kind: "status", status: "failed" })
        sendChatMessage?.({
          kind: "chat",
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender: "KubeAI",
          role: "assistant",
          content: chatMsg,
          timestamp: Date.now(),
        })
      } else {
        // Stale or unknown status (safety timeout path)
        setChatError(
          "Design generation is taking longer than expected. It may still be processing — check your canvas to see if changes appeared.",
        )
        sendFeedMessage({ kind: "status", status: "idle" })
      }
    },
    [sendFeedMessage, sendChatMessage],
  )

  const handleRunError = useCallback(
    (error: Error) => {
      setIsGenerating(false)
      setActiveRun(null)
      sendFeedMessage({ kind: "status", status: "failed", text: error.message })
      sendChatMessage?.({
        kind: "chat",
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: "KubeAI",
        role: "assistant",
        content: `Connection error: ${error.message}`,
        timestamp: Date.now(),
      })
    },
    [sendFeedMessage, sendChatMessage],
  )

  const triggerDesign = async (prompt: string) => {
    // Send user message to chat feed for collaborative visibility
    if (sendChatMessage) {
      sendChatMessage({
        kind: "chat",
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: currentUserName,
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      })
    }
    // User message goes to the feed — no local state needed
    setInput("")
    setIsGenerating(true)
    sendFeedMessage({ kind: "status", status: "thinking", text: prompt })

    // Build conversation history from feed for the design agent
    const historyForAgent = chatMessages.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    try {
      const res = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId, history: historyForAgent }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to start design generation")
      }

      const { runId, triggerDevRunId } = await res.json()

      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })

      if (!tokenRes.ok) {
        throw new Error("Failed to get access token")
      }

      const { token } = await tokenRes.json()

      setActiveRun({ runId, triggerDevRunId, token })
      completedRunRef.current = false
      sendFeedMessage({ kind: "status", status: "analyzing" })
    } catch (error) {
      setIsGenerating(false)
      const errMsg =
        error instanceof Error ? error.message : "Something went wrong"
      sendFeedMessage({ kind: "status", status: "failed", text: errMsg })
      sendChatMessage?.({
        kind: "chat",
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: "KubeAI",
        role: "assistant",
        content: `${errMsg}`,
        timestamp: Date.now(),
      })
    }
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return
    triggerDesign(trimmed)
  }

  const handleCancel = useCallback(async () => {
    if (!activeRun) {
      setIsGenerating(false)
      return
    }
    try {
      await fetch("/api/ai/design/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerDevRunId: activeRun.triggerDevRunId }),
      })
    } catch {
      // Cancel is best-effort
    }
    setIsGenerating(false)
    setActiveRun(null)
    setRunPhase(null)
    sendFeedMessage({ kind: "status", status: "failed", text: "Cancelled by user" })
    sendChatMessage?.({
      kind: "chat",
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: "KubeAI",
      role: "assistant",
      content: "Design generation was stopped.",
      timestamp: Date.now(),
    })
  }, [activeRun, sendFeedMessage, sendChatMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChipClick = (chip: string) => {
    if (isGenerating) return
    triggerDesign(chip)
  }

  // Format timestamp: "2:30 PM" or "now" for messages < 1 minute old
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60_000) return "now"
    return new Date(ts).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // Chat: feed messages only — no intermediate local assistant messages
  // Only user messages and final AI responses appear in chat
  const allMessages = useMemo(() => {
    return chatMessages.map((m) => ({
      key: m.id,
      role: m.role,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp,
    }))
  }, [chatMessages])

  return (
    <div className="flex h-full flex-col">
      {/* Realtime run subscription */}
      {activeRun && (
        <RunTracker
          runId={activeRun.triggerDevRunId}
          token={activeRun.token}
          onComplete={handleRunComplete}
          onError={handleRunError}
          onPhaseChange={setRunPhase}
        />
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {allMessages.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
              <Bot className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                How can I help?
              </p>
              <p className="mt-1 text-xs font-medium text-secondary-foreground">
                Describe your architecture and I&apos;ll help design it.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  disabled={isGenerating}
                  className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-white/[0.16] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="flex flex-col gap-3">
            {allMessages.map((msg) => (
              <div
                key={msg.key}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-medium leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md border-2 border-[var(--accent-primary)]/50 bg-[var(--accent-primary-dim)] text-foreground"
                      : "rounded-bl-md border border-white/[0.08] bg-white/[0.04] text-secondary-foreground"
                  }`}
                >
                  {msg.role !== "user" && msg.sender && (
                    <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                      {msg.sender}
                    </p>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(msg.content)}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Thinking indicator — spiral spinner while a run is active */}
      {isGenerating && (
        <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
          <div className="flex items-center gap-3">
            <SpiralSpinner className="size-8 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                {phaseLabel ?? "Thinking"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Updating your canvas...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        {chatError && (
          <div className="mb-2 rounded-lg border border-[var(--state-error)]/20 bg-[var(--state-error)]/10 px-3 py-1.5 text-xs font-medium text-[var(--state-error)]">
            {chatError}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)]">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? "Generating design\u2026"
                : "Describe your architecture\u2026"
            }
            rows={1}
            disabled={isGenerating}
            className="min-h-[72px] max-h-[160px] flex-1 resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
          />
          {isGenerating ? (
            <Button
              size="icon-sm"
              onClick={handleCancel}
              className="shrink-0 cursor-pointer rounded-xl bg-[var(--state-error)] text-white hover:bg-[var(--state-error)]/80"
            >
              <Square className="size-3.5" fill="currentColor" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="shrink-0 cursor-pointer rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80 disabled:opacity-40"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Chat Tab                                                        */
/* ------------------------------------------------------------------ */

function AiChatTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Seed messages from Liveblocks feed for cross-session memory
  const feedCtx = React.useContext(FeedContext)
  const feedChatMessages = feedCtx?.chatMessages ?? []
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (feedChatMessages.length === 0) return
    seededRef.current = true
    const seeded = feedChatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    setMessages(seeded)
  }, [feedChatMessages])

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading, isStreaming, streamingText])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 72), 160)}px`
  }, [input])

  // Clear chat error after 4 seconds
  useEffect(() => {
    if (!chatError) return
    const timer = setTimeout(() => setChatError(null), 4000)
    return () => clearTimeout(timer)
  }, [chatError])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg = { role: "user", content: trimmed }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)
    setIsStreaming(false)
    setStreamingText("")
    setChatError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, projectId }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to get response")
      }

      // Check if response is streaming (SSE) or plain JSON
      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/plain") || contentType.includes("text/event-stream")) {
        // Plain text stream from AI SDK — raw text chunks
        setIsStreaming(true)
        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          setStreamingText(accumulated)
        }

        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }])
        setStreamingText("")
      } else {
        // Plain JSON response (fallback)
        const { reply } = await res.json()
        setMessages((prev) => [...prev, { role: "assistant", content: reply }])
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      const errMsg = error instanceof Error ? error.message : "Something went wrong"
      setChatError(errMsg)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingText("")
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsLoading(false)
    setIsStreaming(false)
    setStreamingText("")
    abortRef.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChipClick = (chip: string) => {
    if (isLoading) return
    setInput(chip)
    textareaRef.current?.focus()
  }

  // Active thinking state — show spinner while loading or streaming
  const showThinking = isLoading || isStreaming

  return (
    <div className="flex h-full flex-col">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && !showThinking ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
              <MessageSquare className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ask about architecture
              </p>
              <p className="mt-1 text-xs font-medium text-secondary-foreground">
                Databases, cloud, scalability, and system design.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CHAT_STARTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  disabled={isLoading}
                  className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-white/[0.16] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-medium leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md border-2 border-[var(--accent-primary)]/50 bg-[var(--accent-primary-dim)] text-foreground"
                      : "rounded-bl-md border border-white/[0.08] bg-white/[0.04] text-secondary-foreground"
                  }`}
                >
                  {msg.role !== "user" && (
                    <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                      KubeAI
                    </p>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming response — tokens appearing in realtime */}
            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-medium text-secondary-foreground">
                  <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                    KubeAI
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(streamingText)}
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator — spiral spinner while waiting for first token */}
            {isLoading && !isStreaming && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.04] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <SpiralSpinner className="size-8 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        Thinking
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Reading your canvas...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        {chatError && (
          <div className="mb-2 rounded-lg border border-[var(--state-error)]/20 bg-[var(--state-error)]/10 px-3 py-1.5 text-xs font-medium text-[var(--state-error)]">
            {chatError}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)]">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? "Waiting for response\u2026"
                : "Ask about system design, databases, cloud\u2026"
            }
            rows={1}
            disabled={isLoading}
            className="min-h-[72px] max-h-[160px] flex-1 resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
          />
          {isLoading ? (
            <Button
              size="icon-sm"
              onClick={handleStop}
              className="shrink-0 cursor-pointer rounded-xl bg-[var(--state-error)] text-white hover:bg-[var(--state-error)]/80"
            >
              <Square className="size-3.5" fill="currentColor" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 cursor-pointer rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80 disabled:opacity-40"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Specs Tab                                                          */
/* ------------------------------------------------------------------ */

function SpecsTab() {
  return (
    <div className="flex h-full flex-col p-3">
      <Button className="mb-4 w-full cursor-pointer bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80">
        <Plus className="size-4" />
        Generate Spec
      </Button>

      {/* Demo spec card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
            <FileCode className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              Architecture Spec
            </p>
            <p className="text-xs text-muted-foreground">Generated 2 min ago</p>
          </div>
        </div>
        <p className="mb-3 text-xs font-medium leading-relaxed text-secondary-foreground">
          System architecture for the application including authentication
          flow, API design, and database schema…
        </p>
        <Button
          variant="outline"
          size="xs"
          disabled
          className="cursor-not-allowed gap-1.5 opacity-50"
        >
          <Download className="size-3" />
          Download
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Sidebar                                                         */
/* ------------------------------------------------------------------ */

export function AiSidebar({ isOpen, onClose, projectId, currentUserId }: AiSidebarProps) {
  // Consume feed data from FeedProvider (inside RoomProvider in FlowCanvas)
  const feed = React.useContext(FeedContext)

  if (!isOpen) return null

  return (
    <div
      className="fixed right-2 top-[56px] bottom-2 z-50 flex w-80 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_2px_24px_rgba(0,0,0,0.3),inset_0_0.5px_0_rgba(255,255,255,0.06)]"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-[var(--accent-primary)]" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground">
              KubeAI
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              stuck somewhere? Try me!
            </span>
          </div>

        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabbed content */}
        <Tabs defaultValue="chat" className="flex flex-1 flex-col overflow-hidden">
        {/* Centered pill tab list */}
        <div className="flex shrink-0 justify-center px-3 pt-3">
          <TabsList
            variant="default"
            className="inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5"
          >
            <TabsTrigger
              value="chat"
              className="rounded-full border-0 bg-transparent px-4 py-1 text-xs font-semibold text-muted-foreground data-active:bg-white/[0.1] data-active:text-foreground"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="architect"
              className="rounded-full border-0 bg-transparent px-4 py-1 text-xs font-semibold text-muted-foreground data-active:bg-white/[0.1] data-active:text-foreground"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-full border-0 bg-transparent px-4 py-1 text-xs font-semibold text-muted-foreground data-active:bg-white/[0.1] data-active:text-foreground"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
          <AiChatTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="architect" className="mt-0 flex-1 overflow-hidden">
          <AiArchitectTab
            projectId={projectId}
            currentUserId={currentUserId}
            sendFeedMessage={feed?.sendFeedMessage ?? (() => {})}
          />
        </TabsContent>

        <TabsContent value="specs" className="mt-0 flex-1 overflow-hidden">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
