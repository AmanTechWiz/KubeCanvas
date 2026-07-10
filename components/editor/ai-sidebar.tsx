"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from "react"
import ReactDOM from "react-dom"
import { Bot, X, Send, Loader2, MessageSquare, StopCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { renderFormattedText } from "@/lib/format-chat"

// ── Types ───────────────────────────────────────────────────────────

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentUserId: string
}

// ── Spiral Spinner ──────────────────────────────────────────────────

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
      {[6,17,28,39,50].map(x => [6,17,28,39,50].map(y => (
        <use key={`bg-${x}-${y}`} href="#sp-bg" x={x} y={y} />
      )))}
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

// ── Architect Status Card ───────────────────────────────────────────

function ArchitectStatusCard({ runId }: { runId: string }) {
  const { run } = useRealtimeRun(runId)
  const status = run?.status
  const [cancelling, setCancelling] = useState(false)

  const isDone = status === "COMPLETED" || status === "FAILED" || status === "CANCELED"
  const isRunning = !isDone && status !== undefined

  const label = status === "COMPLETED"
    ? "Architecture complete!"
    : status === "FAILED"
    ? "Generation failed"
    : status === "CANCELED"
    ? "Cancelled"
    : "Architecting..."

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    try {
      await fetch("/api/ai/design/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerDevRunId: runId }),
      })
    } catch {
      // Ignore errors — cancel is best-effort
    }
  }, [runId])

  return (
    <div className="mx-0 mb-1 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
      {!isDone ? (
        <SpiralSpinner className="size-4 shrink-0" />
      ) : status === "COMPLETED" ? (
        <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-success)]" />
      ) : status === "CANCELED" ? (
        <span className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground" />
      ) : (
        <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-error)]" />
      )}
      <span className="text-xs font-medium text-muted-foreground flex-1">
        {label}
      </span>
      {isRunning && !cancelling && (
        <button
          onClick={handleCancel}
          className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
      {cancelling && (
        <span className="text-[10px] text-muted-foreground">Cancelling...</span>
      )}
    </div>
  )
}

// ── Chat Tab ────────────────────────────────────────────────────────

function ChatTab({
  projectId,
  currentUserId,
  chatRef,
}: {
  projectId: string
  currentUserId: string
  chatRef?: React.RefObject<{ clearChat: () => void } | null>
}) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadedProjectRef = useRef<string | null>(null)

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { projectId },
    }),
    onFinish: ({ message, messages: allMessages }) => {
      // Save to localStorage
      try {
        localStorage.setItem(
          `chat-${projectId}-${currentUserId}`,
          JSON.stringify(allMessages),
        )
      } catch {}

      // Save assistant message to Prisma
      const textParts = (message as any).parts?.filter((p: any) => p.type === "text") ?? []
      const textContent = textParts.map((p: any) => p.text).join("")
      fetch("/api/ai/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          role: message.role,
          content: textContent,
          parts: message.parts,
        }),
      }).catch(() => {})
    },
  })

  // Expose clearChat to parent via ref
  useImperativeHandle(
    chatRef,
    () => ({
      clearChat: () => {
        setMessages([])
        try {
          localStorage.removeItem(`chat-${projectId}-${currentUserId}`)
        } catch {}
        fetch("/api/ai/chat/messages", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        }).catch(() => {})
      },
    }),
    [setMessages, projectId, currentUserId],
  )

  // Load saved messages from Prisma when project changes
  useEffect(() => {
    if (loadedProjectRef.current === projectId) return
    loadedProjectRef.current = projectId

    fetch(`/api/ai/chat/messages?projectId=${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages?.length > 0) {
          const loaded = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: m.parts ?? [{ type: "text", text: m.content }],
          }))
          setMessages(loaded)
          return
        }
        // Fallback to localStorage
        const stored = localStorage.getItem(`chat-${projectId}-${currentUserId}`)
        if (stored) {
          try {
            setMessages(JSON.parse(stored))
          } catch {}
        }
      })
      .catch(() => {
        const stored = localStorage.getItem(`chat-${projectId}-${currentUserId}`)
        if (stored) {
          try {
            setMessages(JSON.parse(stored))
          } catch {}
        }
      })
  }, [projectId, currentUserId, setMessages])

  // Find latest architect runId from tool results
  const latestRunId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as any
      if (msg.role === "assistant") {
        for (const part of msg.parts ?? []) {
          if (
            part.type === "tool-generateArchitecture" &&
            part.state === "output-available" &&
            part.result?.runId
          ) {
            return part.result.runId as string
          }
        }
      }
    }
    return null
  }, [messages])

  // Whether there's an active (in-progress) tool call — used to suppress
  // the global "Thinking…" spinner so we don't show duplicate spinners.
  const hasActiveToolCall = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as any
      if (msg.role === "assistant") {
        for (const part of msg.parts ?? []) {
          if (
            part.type === "tool-generateArchitecture" &&
            (part.state === "input-streaming" || part.state === "input-available")
          ) {
            return true
          }
        }
      }
    }
    return false
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  const handleSend = useCallback(() => {
    if (!input.trim() || status === "streaming") return

    const text = input.trim()
    setInput("")

    // Save user message to Prisma
    fetch("/api/ai/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, role: "user", content: text }),
    }).catch(() => {})

    sendMessage({ text })
  }, [input, status, sendMessage, projectId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
              <Bot className="size-6 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Ask KubeAI anything
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Architecture advice, design reviews, or generate on canvas
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "Design a microservices architecture",
                "What database should I use?",
                "Review my current canvas",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setInput(chip)
                    setTimeout(() => handleSend(), 50)
                  }}
                  className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {(message as any).role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent-primary)]/15 px-3 py-2 text-sm text-foreground">
                  {renderFormattedText(
                    (message as any).parts
                      ?.filter((p: any) => p.type === "text")
                      .map((p: any) => p.text)
                      .join("") ?? "",
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {(message as any).parts?.map((part: any, i: number) => {
                  if (part.type === "text") {
                    return (
                      <div key={i} className="max-w-[85%]">
                        <div className="rounded-2xl rounded-bl-md bg-white/[0.06] px-3 py-2 text-sm text-foreground">
                          {renderFormattedText(part.text)}
                        </div>
                      </div>
                    )
                  }
                  if (part.type === "tool-generateArchitecture") {
                    switch (part.state) {
                      case "input-streaming":
                      case "input-available":
                        return (
                          <div
                            key={i}
                            className="mx-0 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2"
                          >
                            <SpiralSpinner className="size-3.5 shrink-0" />
                            <span className="text-xs text-muted-foreground">Preparing architecture...</span>
                          </div>
                        )
                      case "output-available":
                        return part.result?.runId ? (
                          <ArchitectStatusCard
                            key={`run-${part.result.runId}`}
                            runId={part.result.runId}
                          />
                        ) : null
                      case "output-error":
                        return (
                          <div key={i} className="text-xs text-[var(--state-error)] px-1">
                            Generation failed: {part.errorText}
                          </div>
                        )
                    }
                  }
                  return null
                })}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator — hidden when a tool call is active to avoid duplicate spinners */}
        {status === "streaming" && !hasActiveToolCall && (
          <div className="flex items-center gap-2 px-1">
            <SpiralSpinner className="size-4" />
            <span className="text-xs text-muted-foreground">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 focus-within:border-[var(--accent-primary)]/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your architecture..."
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ minHeight: "20px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = "auto"
                target.style.height = Math.min(target.scrollHeight, 120) + "px"
              }}
            />
          </div>
          <Button
            type="submit"
            size="icon-sm"
            variant="ghost"
            disabled={!input.trim() || status === "streaming"}
            className="cursor-pointer shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-[var(--accent-primary)] disabled:opacity-30"
          >
            {status === "streaming" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
          {status === "streaming" && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={stop}
              className="cursor-pointer shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-[var(--state-error)]"
            >
              <StopCircle className="size-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

// ── Specs Tab ───────────────────────────────────────────────────────

function SpecsTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          AI-powered spec generation is on its way.
        </p>
      </div>
    </div>
  )
}

// ── AI Sidebar ──────────────────────────────────────────────────────

export function AiSidebar({
  isOpen,
  onClose,
  projectId,
  currentUserId,
}: AiSidebarProps) {
  const chatRef = useRef<{ clearChat: () => void }>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.1] hover:text-[var(--state-error)]"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs
        defaultValue="chat"
        className="flex flex-1 flex-col overflow-hidden"
      >
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
              value="specs"
              className="rounded-full border-0 bg-transparent px-4 py-1 text-xs font-semibold text-muted-foreground data-active:bg-white/[0.1] data-active:text-foreground"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="chat"
          className="mt-0 flex-1 overflow-hidden"
        >
          <ChatTab
            projectId={projectId}
            currentUserId={currentUserId}
            chatRef={chatRef}
          />
        </TabsContent>

        <TabsContent
          value="specs"
          className="mt-0 flex-1 overflow-hidden"
        >
          <SpecsTab />
        </TabsContent>
      </Tabs>

      {/* Clear chat confirmation dialog */}
      {confirmOpen &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111114] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--state-error)]/10">
                  <Trash2 className="size-4 text-[var(--state-error)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Clear chat history?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All messages for this project will be deleted. This cannot be
                    undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmOpen(false)}
                  className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    chatRef.current?.clearChat()
                    setConfirmOpen(false)
                  }}
                  className="cursor-pointer rounded-lg bg-[var(--state-error)] text-white hover:bg-[var(--state-error)]/80"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
