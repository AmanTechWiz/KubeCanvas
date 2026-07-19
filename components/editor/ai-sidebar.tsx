"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from "react"
import ReactDOM from "react-dom"
import { Bot, X, Send, Loader2, Trash2, Download, FileText,  FolderOpen, Check, AlertCircle, ArrowUpRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SpiralSpinner } from "@/components/ui/spiral-spinner"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { renderFormattedText } from "@/lib/format-chat"

import {
  isFileSystemAccessSupported,
  writeProjectToDirectory,
  downloadAsZip,
  type GeneratedFile,
  type ExportProgress,
} from "@/lib/fs-export"


// ── Types ───────────────────────────────────────────────────────────

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentUserId: string
}

// ── Architect Status Card ───────────────────────────────────────────

function ArchitectStatusCard({
  runId,
  isCompleted: isCompletedProp = false,
  onComplete,
  onCancel,
  onRevert,
  onRevertRequest,
  previousCanvasJson,
}: {
  runId: string
  isCompleted?: boolean
  onComplete?: (run: any) => void
  onCancel?: () => void
  onRevert?: (previousCanvasJson: any) => void
  onRevertRequest?: (previousCanvasJson: any) => void
  previousCanvasJson?: any
}) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [cancelling, setCancelling] = useState(false)

  // Fetch a Trigger.dev public token scoped to this run
  useEffect(() => {
    if (!runId) return
    let cancelled = false
    fetch("/api/ai/design/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.token) {
          setAccessToken(data.token)
        }
      })
      .catch(() => {
        // Token fetch failure — useRealtimeRun will error cleanly
      })
    return () => {
      cancelled = true
    }
  }, [runId])

  const { run } = useRealtimeRun(runId, {
    accessToken,
    enabled: !!accessToken,
    onComplete: (completedRun, err) => {
      if (!err && completedRun?.status === "COMPLETED") {
        onComplete?.(completedRun)
      }
    },
  })
  // If we already know the run completed (persisted isCompleted flag),
  // treat it as done immediately — avoids the 1-2 s spinner flash while
  // useRealtimeRun fetches the status from Trigger.dev.
  const status = run?.status ?? (isCompletedProp ? "COMPLETED" : undefined)

  const isDone = status === "COMPLETED" || status === "FAILED" || status === "CANCELED"
  const isRunning = !isDone

  // Safety net: when Trigger.dev confirms cancellation, re-clear the cursor.
  // Handles race where agent sets cursor AFTER our initial cancel but before
  // cancellation fully propagates.
  useEffect(() => {
    if (status !== "CANCELED") return
    const timer = setTimeout(() => {
      fetch("/api/ai/design/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerDevRunId: runId }),
      }).catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [status, runId])

  const label = status === "COMPLETED"
    ? "Architecture complete!"
    : status === "FAILED"
    ? "Generation failed"
    : status === "CANCELED"
    ? "Cancelled"
    : "Architecting..."

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    // Mark as cancelled in local state immediately
    onCancel?.()

    try {
      await fetch("/api/ai/design/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerDevRunId: runId }),
      })
    } catch {
      // Ignore errors — cancel is best-effort
    }

    // Wait for cancellation to propagate through Trigger.dev before
    // reverting — otherwise the agent might still be mid-animation
    // and re-add nodes on top of the restored canvas.
    if (previousCanvasJson) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onRevert?.(previousCanvasJson)
    }
  }, [runId, onCancel, onRevert, previousCanvasJson])

  return (
    <div className="mx-0 mb-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {!isDone ? (
          <SpiralSpinner className="size-3.5 shrink-0" />
        ) : status === "COMPLETED" ? (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-success)]" />
        ) : status === "CANCELED" ? (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        ) : (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-error)]" />
        )}
        <span className="text-[12px] font-normal text-muted-foreground flex-1">
          {label}
        </span>
        {isRunning && !cancelling && (
          <button
            onClick={handleCancel}
            className="cursor-pointer rounded-full border border-white/[0.12] bg-transparent px-3 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
        {cancelling && (
          <span className="text-[11px] text-muted-foreground/60">Cancelling...</span>
        )}
        {status === "COMPLETED" && previousCanvasJson && !cancelling && (
          <button
            onClick={() => onRevertRequest?.(previousCanvasJson)}
            className="cursor-pointer rounded-full border border-white/[0.12] bg-transparent px-3 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors"
          >
            Revert
          </button>
        )}
      </div>
    </div>
  )
}

// ── Architecture Confirm Card ───────────────────────────────────────

function ArchitectureConfirmCard({
  prompt,
  messageId,
  onApply,
  onDismiss,
}: {
  prompt: string
  messageId: string
  onApply: (prompt: string, messageId: string) => void
  onDismiss: (messageId: string) => void
}) {
  const [applying, setApplying] = useState(false)

  const handleApply = useCallback(() => {
    setApplying(true)
    onApply(prompt, messageId)
  }, [prompt, messageId, onApply])

  return (
    <div className="mx-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
      <p className="text-[12px] font-normal text-amber-400/90 mb-2">
        Architecture changes cannot be undone
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground/70 mb-3 line-clamp-1">
        {prompt}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={applying}
          className="cursor-pointer rounded-full bg-amber-500/20 px-4 py-1.5 text-[12px] font-normal text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          {applying ? "Starting..." : "Apply changes"}
        </button>
        <button
          onClick={() => onDismiss(messageId)}
          disabled={applying}
          className="cursor-pointer rounded-full border border-white/[0.12] bg-transparent px-4 py-1.5 text-[12px] font-normal text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  )
}


function normalizeToolStates(parts: any[] | undefined): any[] | undefined {
  if (!parts) return parts
  return parts.map((p: any) => {
    if (
      p.type === "tool-generateArchitecture" &&
      (p.state === "input-streaming" || p.state === "input-available")
    ) {
      return {
        ...p,
        state: "output-available",
        output: p.output ?? { requiresConfirmation: true },
      }
    }
    return p
  })
}

// ── Chat Tab ───

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
  const [archRuns, setArchRuns] = useState<Map<string, string>>(new Map())
  const dismissedRef = useRef<Set<string>>(new Set())
  const [completedArchitectTexts, setCompletedArchitectTexts] = useState<
    Map<string, string>
  >(new Map())
  const [pendingRevert, setPendingRevert] = useState<any>(null)
  const archRunsRef = useRef(archRuns)
  archRunsRef.current = archRuns


  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { projectId },
    }),
    onFinish: ({ message, messages: allMessages }) => {
      // Save to localStorage (with original content including AI text)
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
          id: message.id,
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
            parts: normalizeToolStates(m.parts ?? [{ type: "text", text: m.content }]),
          }))
          setMessages(loaded)
          return
        }
        // Fallback to localStorage
        const stored = localStorage.getItem(`chat-${projectId}-${currentUserId}`)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            setMessages(parsed.map((m: any) => ({
              ...m,
              parts: normalizeToolStates(m.parts),
            })))
          } catch {}
        }
      })
      .catch(() => {
        const stored = localStorage.getItem(`chat-${projectId}-${currentUserId}`)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            setMessages(parsed.map((m: any) => ({
              ...m,
              parts: normalizeToolStates(m.parts),
            })))
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
            part.output?.runId
          ) {
            return part.output.runId as string
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
          if (part.type === "tool-generateArchitecture") {
            // During input streaming/awaiting args
            if (part.state === "input-streaming" || part.state === "input-available") return true
            // While confirmation card or status card is visible (output-available)
            if (part.state === "output-available" && part.output?.requiresConfirmation && !part.output?.dismissed && !part.output?.cancelled && !part.output?.confirmed) return true
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

  const handleApplyArchitecture = useCallback(
    async (prompt: string, messageId: string) => {
      try {
        const res = await fetch("/api/ai/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, projectId }),
        })
        if (!res.ok) throw new Error("Failed to start architecture generation")
        const data = await res.json()

        setMessages((prevMessages) => {
          const updated = prevMessages.map((m) => {
            if (m.id !== messageId) return m
            return {
              ...m,
              parts: m.parts?.map((p: any) => {
                if (p.type === "tool-generateArchitecture") {
                  return {
                    ...p,
                    output: {
                      ...p.output,
                      runId: data.runId,
                      confirmed: true,
                      previousCanvasJson: data.previousCanvasJson,
                    },
                  }
                }
                return p
              }),
            }
          })
          try {
            localStorage.setItem(
              `chat-${projectId}-${currentUserId}`,
              JSON.stringify(updated),
            )
          } catch {}

          const updatedMsg = updated.find((m) => m.id === messageId)
          if (updatedMsg?.parts) {
            fetch("/api/ai/chat/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId,
                messageId,
                parts: updatedMsg.parts,
              }),
            }).catch(() => {})
          }

          return updated
        })

        setArchRuns((prev) => {
          const next = new Map(prev)
          next.set(messageId, data.runId)
          return next
        })
      } catch {
        // Tool call stays in requiresConfirmation state; user can retry
      }
    },
    [projectId, currentUserId, setMessages],
  )

  const handleArchitectCancel = useCallback(
    (messageId: string) => {
      setMessages((prevMessages) => {
        const updated = prevMessages.map((m) => {
          if (m.id !== messageId) return m
          return {
            ...m,
            parts: m.parts?.map((p: any) => {
              if (p.type === "tool-generateArchitecture") {
                return {
                  ...p,
                  output: {
                    ...p.output,
                    cancelled: true,
                  },
                }
              }
              return p
            }),
          }
        })
        try {
          localStorage.setItem(
            `chat-${projectId}-${currentUserId}`,
            JSON.stringify(updated),
          )
        } catch {}

        const updatedMsg = updated.find((m) => m.id === messageId)
        if (updatedMsg?.parts) {
          fetch("/api/ai/chat/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              messageId,
              parts: updatedMsg.parts,
            }),
          }).catch(() => {})
        }

        return updated
      })

      setArchRuns((prev) => {
        const next = new Map(prev)
        next.delete(messageId)
        return next
      })
    },
    [projectId, currentUserId, setMessages],
  )

  const handleArchitectRevert = useCallback(
    (previousCanvasJson: any) => {
      fetch("/api/ai/design/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, previousCanvasJson }),
      }).catch(() => {})
    },
    [projectId],
  )

  const handleArchitectComplete = useCallback(
    (messageId: string, _run: any) => {
      setCompletedArchitectTexts((prev) => {
        const next = new Map(prev)
        next.set(messageId, "completed")
        return next
      })

      setMessages((prevMessages) => {
        const updated = prevMessages.map((m) => {
          if (m.id !== messageId) return m
          return {
            ...m,
            parts: m.parts?.map((p: any) => {
              if (p.type === "tool-generateArchitecture") {
                return {
                  ...p,
                  output: {
                    ...p.output,
                    isCompleted: true,
                  },
                }
              }
              return p
            }),
          }
        })
        try {
          localStorage.setItem(
            `chat-${projectId}-${currentUserId}`,
            JSON.stringify(updated),
          )
        } catch {}

        const updatedMsg = updated.find((m) => m.id === messageId)
        if (updatedMsg?.parts) {
          fetch("/api/ai/chat/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              messageId,
              parts: updatedMsg.parts,
            }),
          }).catch(() => {})
        }

        return updated
      })
    },
    [projectId, currentUserId, setMessages],
  )

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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)",
        }}
      >
        {messages.length === 0 && (
          <div className="flex h-full w-full items-center justify-center px-6">
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <Bot className="size-7 text-[var(--accent-primary)]/80" />
              </div>
              <div className="w-full">
                <p className="text-base font-normal tracking-[-0.02em] text-foreground">
                  Ask KubeAI anything
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/70">
                  Architecture advice, design reviews,
                  <br />or generate on canvas
                </p>
              </div>
              <div className="mt-2 flex w-full max-w-[360px] flex-col gap-2">
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
                    className="w-full cursor-pointer rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-left text-[12px] font-medium text-foreground/90 transition-all hover:border-white/[0.20] hover:bg-white/[0.09] hover:text-foreground hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {(message as any).role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-md bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/10 px-4 py-2.5 text-[13px] leading-relaxed text-foreground">
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
                {(() => {
                  // If this message has a tool-generateArchitecture part, skip rendering
                  // text parts during streaming to prevent a flash of "I'll build..."
                  // before the confirmation card takes over.
                  const rawMsg = message as any
                  const hasArchTool = rawMsg.parts?.some(
                    (p: any) => p.type === "tool-generateArchitecture",
                  )
                  return rawMsg.parts?.map((part: any, i: number) => {
                    if (part.type === "text") {
                      if (hasArchTool || hasActiveToolCall) {
                        const toolPart = rawMsg.parts?.find(
                          (p: any) => p.type === "tool-generateArchitecture"
                        )
                        const isCompleted = toolPart?.output?.isCompleted || completedArchitectTexts.has(message.id)
                        if (!isCompleted) return null
                      }
                      return (
                        <div key={i} className="max-w-[85%]">
                          <div className="rounded-xl rounded-bl-md bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-[13px] leading-relaxed text-foreground">
                            {renderFormattedText(part.text)}
                          </div>
                        </div>
                      );
                    }
                    if (part.type === "tool-generateArchitecture") {
                      switch (part.state) {
                        case "input-streaming":
                        case "input-available":
                          return (
                            <div
                              key={i}
                              className="mx-0 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2"
                            >
                              <SpiralSpinner className="size-3.5 shrink-0" />
                              <span className="text-xs text-muted-foreground">Preparing architecture...</span>
                            </div>
                          )
                        case "output-available":
                          // Confirmation required before triggering the design agent
                          if (part.output?.requiresConfirmation) {
                            const isDismissed = part.output.dismissed || dismissedRef.current.has(message.id)
                            if (isDismissed) return null

                            // Cancelled — card was dismissed via cancel
                            if (part.output.cancelled) return null

                            const runId = part.output.runId || archRuns.get(message.id)
                            const isConfirmed = part.output.confirmed || archRuns.has(message.id)
                            const isCompleted = part.output.isCompleted || completedArchitectTexts.has(message.id)

                            if (isConfirmed && runId) {
                              return (
                                <div key={`run-${runId}`} className="flex flex-col gap-1">
                                  <ArchitectStatusCard
                                    runId={runId}
                                    isCompleted={isCompleted}
                                    onComplete={(run) =>
                                      handleArchitectComplete(message.id, run)
                                    }
                                    onCancel={() =>
                                      handleArchitectCancel(message.id)
                                    }
                                    onRevert={(prev) =>
                                      handleArchitectRevert(prev)
                                    }
                                    onRevertRequest={(prev) =>
                                      setPendingRevert(prev)
                                    }
                                    previousCanvasJson={part.output?.previousCanvasJson}
                                  />
                                </div>
                              )
                            }

                            return (
                              <ArchitectureConfirmCard
                                key={`confirm-${message.id}`}
                                prompt={part.output.prompt}
                                messageId={message.id}
                                onApply={handleApplyArchitecture}
                                onDismiss={(id) => {
                                  // Update state & persist dismissed: true
                                  setMessages((prevMessages) => {
                                    const updated = prevMessages.map((m) => {
                                      if (m.id !== id) return m
                                      return {
                                        ...m,
                                        parts: m.parts?.map((p: any) => {
                                          if (p.type === "tool-generateArchitecture") {
                                            return {
                                              ...p,
                                              output: {
                                                ...p.output,
                                                dismissed: true,
                                              },
                                            }
                                          }
                                          return p
                                        }),
                                      }
                                    })
                                    try {
                                      localStorage.setItem(
                                        `chat-${projectId}-${currentUserId}`,
                                        JSON.stringify(updated),
                                      )
                                    } catch {}

                                    const updatedMsg = updated.find((m) => m.id === id)
                                    if (updatedMsg?.parts) {
                                      fetch("/api/ai/chat/messages", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          projectId,
                                          messageId: id,
                                          parts: updatedMsg.parts,
                                        }),
                                      }).catch(() => {})
                                    }

                                    return updated
                                  })

                                  const next = new Set(dismissedRef.current)
                                  next.add(id)
                                  dismissedRef.current = next
                                  setArchRuns(new Map(archRuns))
                                }}
                              />
                            )
                          }
                          // Legacy: tool already triggered the agent (fallback)
                          return part.output?.runId ? (
                            <ArchitectStatusCard
                              key={`run-${part.output.runId}`}
                              runId={part.output.runId}
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
                  })
                })()}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator — hidden when a tool call is active to avoid duplicate spinners */}
        {status === "streaming" && !hasActiveToolCall && (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <SpiralSpinner className="size-4" />
            <span className="text-[12px] text-muted-foreground/70">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/30">
            <textarea
              data-ai-chat-input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your architecture..."
              rows={1}
              className="w-full resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
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
            className="cursor-pointer shrink-0 rounded-full bg-white/[0.06] border border-white/[0.08] text-muted-foreground hover:text-[var(--accent-primary)] hover:bg-white/[0.1] disabled:opacity-30"
          >
            {status === "streaming" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Revert confirmation dialog */}
      {pendingRevert &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs"
            onClick={() => setPendingRevert(null)}
          >
            <div
              className="mx-4 w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#111114] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--state-error)]/10">
                  <RotateCcw className="size-4 text-[var(--state-error)]" />
                </div>
                <div>
                  <p className="text-sm font-normal tracking-[-0.01em] text-foreground">
                    Revert changes?
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Canvas will be restored to its previous state. This cannot be
                    undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingRevert(null)}
                  className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleArchitectRevert(pendingRevert)
                    setPendingRevert(null)
                  }}
                  className="cursor-pointer rounded-lg bg-[var(--state-error)] text-white hover:bg-[var(--state-error)]/80"
                >
                  Revert
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

// ── Spec Export Status Card ────────────────────────────────────────

// ── Polled metadata fallback hook ──────────────────────────────────
// useRun doesn't support `enabled`, so we extract the polling into a
// separate hook that conditionally calls useRun via SWR's null-key skip.
function usePolledMetadata(runId: string, accessToken: string | undefined) {
  const [phase, setPhase] = useState("")

  useEffect(() => {
    if (!accessToken || !runId) return
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchRun = async () => {
      try {
        const res = await fetch(
          `https://api.trigger.dev/api/v3/runs/${runId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        if (!res.ok || cancelled) return
        const data = await res.json()
        const p = String(data?.metadata?.phase ?? "")
        if (p) setPhase(p)
        // Stop polling once the run is done
        if (data?.isCompleted && interval) {
          clearInterval(interval)
          interval = null
        }
      } catch {
        // Ignore — realtime is primary
      }
    }

    // Initial fetch after a short delay to let the task start
    const timeout = setTimeout(fetchRun, 1500)
    // Then poll every 2s
    interval = setInterval(fetchRun, 2000)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [runId, accessToken])

  return { phase }
}

function SpecExportStatusCard({
  runId,
  onComplete,
  onTerminal,
}: {
  runId: string
  onComplete?: (exportId: string) => void
  onTerminal?: (status: string) => void
}) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined)
  const [cancelling, setCancelling] = useState(false)

  // Fetch a Trigger.dev public token scoped to this run
  useEffect(() => {
    if (!runId) return
    let cancelled = false
    fetch("/api/ai/export-spec/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.token) {
          setAccessToken(data.token)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [runId])

  // Primary: realtime subscription for status + output
  const { run } = useRealtimeRun(runId, {
    accessToken,
    enabled: !!accessToken,
    onComplete: (completedRun, err) => {
      if (!err && completedRun?.status === "COMPLETED") {
        const output = completedRun.output as any
        if (output?.exportId) {
          onComplete?.(output.exportId)
        }
      }
    },
  })

  // Fallback: poll via REST API for metadata when realtime doesn't deliver it.
  // useRun doesn't support `enabled`, so we gate it behind accessToken availability.
  const polledMetadata = usePolledMetadata(runId, accessToken)

  const status = run?.status
  const isDone = status === "COMPLETED" || status === "FAILED" || status === "CANCELED"
  const isRunning = !isDone && status !== undefined

  // Notify parent when run reaches a terminal state (cancelled / failed)
  useEffect(() => {
    if (isDone && status !== "COMPLETED") {
      onTerminal?.(status!)
    }
  }, [isDone, status, onTerminal])

  // Prefer realtime metadata, fall back to polled metadata
  const realtimePhase = String((run as any)?.metadata?.phase ?? "")
  const phase = realtimePhase || polledMetadata.phase

  const phaseLabel =
    phase === "reading"
      ? "Reading Architecture..."
      : phase === "analyzing"
      ? "Analyzing Components..."
      : phase === "generating"
      ? "Generating Specifications..."
      : phase === "packaging"
      ? "Packaging Files..."
      : phase === "complete"
      ? "Complete"
      : isDone
      ? status === "COMPLETED"
        ? "Complete"
        : "Failed"
      : "Starting..."

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    try {
      await fetch("/api/ai/design/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerDevRunId: runId }),
      })
    } catch {}
  }, [runId])

  return (
    <div className="mx-0 mb-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {!isDone ? (
          <SpiralSpinner className="size-3.5 shrink-0" />
        ) : status === "COMPLETED" ? (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-success)]" />
        ) : status === "CANCELED" ? (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground" />
        ) : (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--state-error)]" />
        )}
        <span className="text-[12px] font-normal text-muted-foreground flex-1">
          {phaseLabel}
        </span>
        {isRunning && !cancelling && (
          <button
            onClick={handleCancel}
            className="cursor-pointer rounded-full border border-white/[0.12] bg-transparent px-3 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
        {cancelling && (
          <span className="text-[11px] text-muted-foreground/60">Cancelling...</span>
        )}
      </div>
    </div>
  )
}

// ── Specs Tab ───────────────────────────────────────────────────────

function SpecsTab({ projectId }: { projectId: string }) {
  const [runId, setRunId] = useState<string | null>(null)
  const [exportId, setExportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState("")

  // Load saved description from DB on mount
  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.project?.description) {
          setDescription(data.project.description)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId])

  // Save-to-disk state
  const [saveProgress, setSaveProgress] = useState<ExportProgress | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleExport = useCallback(async () => {
    setError(null)
    setExportId(null)
    setSavedPath(null)
    setSaveError(null)
    setSaveProgress(null)

    try {
      const res = await fetch("/api/ai/export-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, description: description.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to start export")
      }

      const data = await res.json()
      setRunId(data.runId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start export"
      setError(msg)
    }
  }, [projectId, description])

  const handleComplete = useCallback((id: string) => {
    setExportId(id)
  }, [])

  // Fetch files from API as JSON, then write to disk or download ZIP
  const fetchExportFiles = useCallback(async (): Promise<{ projectName: string; files: GeneratedFile[] } | null> => {
    if (!exportId) return null
    try {
      const res = await fetch(`/api/ai/export-spec/${exportId}?format=json`, {
        credentials: "same-origin",
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      const data = await res.json() as { projectName: string; files: Record<string, string> }
      const generatedFiles: GeneratedFile[] = Object.entries(data.files).map(
        ([name, content]) => ({
          path: (name === "AGENTS.md" || name === "CLAUDE.md") ? name : `.ai-spec/${name}`,
          content,
        })
      )
      return { projectName: data.projectName, files: generatedFiles }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch export data"
      throw new Error(msg)
    }
  }, [exportId])

  const handleSaveProject = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    setSavedPath(null)
    setSaveProgress(null)

    try {
      const data = await fetchExportFiles()
      if (!data) return

      if (isFileSystemAccessSupported()) {
        // Direct-to-disk via File System Access API
        const result = await writeProjectToDirectory(
          data.projectName,
          data.files,
          (progress) => setSaveProgress({ ...progress }),
        )

        if (!result.success && result.filesWritten === 0 && result.filesFailed.length === 0) {
          // User cancelled the picker
          setSaving(false)
          setSaveProgress(null)
          return
        }

        if (result.filesFailed.length > 0) {
          setSaveError(`${result.filesFailed.length} file(s) failed to write: ${result.filesFailed.join(", ")}`)
        }

        setSavedPath(result.savedPath ?? data.projectName)
      } else {
        // Fallback: client-side ZIP download
        setSaveProgress({ phase: "writing", current: 0, total: data.files.length })
        await downloadAsZip(data.projectName, data.files)
        setSaveProgress({ phase: "complete", current: data.files.length, total: data.files.length })
        setSavedPath("downloaded")
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed"
      setSaveError(msg)
      setSaveProgress({ phase: "error", current: 0, total: 0, error: msg })
    } finally {
      setSaving(false)
    }
  }, [fetchExportFiles])

  // Legacy ZIP-only fallback download
  const handleDownloadZip = useCallback(async () => {
    if (!exportId) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await fetchExportFiles()
      if (!data) return
      await downloadAsZip(data.projectName, data.files)
      setSavedPath("downloaded")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Download failed"
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }, [exportId, fetchExportFiles])

  const handleReset = useCallback(() => {
    setRunId(null)
    setExportId(null)
    setError(null)
    setSaveProgress(null)
    setSavedPath(null)
    setSaveError(null)
    setSaving(false)
  }, [])

  const fsSupported = isFileSystemAccessSupported()

  return (
    <div
      className="flex h-full flex-col p-4"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)",
      }}
    >
      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-balance text-foreground mb-1.5">
            AI Spec Export
          </h2>
          <p className="text-sm font-normal leading-relaxed text-pretty text-foreground/40">
            Structured implementation package ready to work with coding agents.
          </p>
        </div>

        {/* Initial state — file list + export button */}
        {!runId && !exportId && (
          <div className="flex flex-1 flex-col px-5 pb-5">
            <div className="flex-1" />

            <div className="space-y-1.5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-foreground/60">
                Generated files
              </p>
              {[
                { name: "architecture.json", desc: "Canonical source of truth" },
                { name: "SPEC.md", desc: "Architecture specification" },
                { name: "IMPLEMENTATION_PLAN.md", desc: "Phased build guide" },
                { name: "IMPLEMENTATION_QUESTIONS.md", desc: "Developer interview" },
                { name: "IMPLEMENTATION_GUARDRAILS.md", desc: "Architectural invariants" },
              ].map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.025] px-3.5 py-2.5 transition-colors hover:bg-white/[0.045]"
                >
                  <FileText className="size-3.5 shrink-0 text-foreground/20" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-normal font-[family-name:var(--font-geist-mono)] text-foreground/70">
                      {file.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] leading-snug text-foreground/30">
                      {file.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-foreground/60">
                App description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Real-time collaborative design tool for teams"
                rows={2}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs leading-relaxed text-foreground/70 placeholder:text-foreground/25 focus:outline-none focus:border-white/[0.15] transition-colors"
              />
            </div>

            <button
              onClick={handleExport}
              disabled={!description.trim()}
              className="group mt-4 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-sm font-medium tracking-tight leading-none text-foreground/65 transition-all duration-200 hover:bg-white/[0.10] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/[0.05] disabled:hover:text-foreground/65"
            >
              <span>Export AI Spec</span>
              <ArrowUpRight className="size-3.5 opacity-50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-90" />
            </button>
          </div>
        )}

        {/* In-progress state — generation running */}
        {runId && !exportId && (
          <div className="flex-1 px-5 pb-5">
            <div className="space-y-3">
              <SpecExportStatusCard
                runId={runId}
                onComplete={handleComplete}
                onTerminal={() => {
                  setRunId(null)
                  setExportId(null)
                }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mx-5 mb-5 rounded-lg bg-white/[0.03] px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="size-3 shrink-0 text-foreground/40" />
              <span className="text-xs text-foreground/60">Export failed</span>
            </div>
            <p className="text-[11px] text-foreground/25 text-pretty leading-snug">{error}</p>
            <button
              onClick={handleReset}
              className="mt-1.5 text-[11px] text-foreground/20 hover:text-foreground/50 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {/* Complete state — ready to save */}
        {exportId && (
          <div className="flex-1 flex flex-col px-5 pb-5 min-h-0">
            {/* Write progress */}
            {saveProgress && saveProgress.phase === "writing" && (
              <div className="rounded-lg bg-white/[0.03] px-3.5 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="size-3 shrink-0 animate-spin text-foreground/40" />
                  <span className="text-xs text-foreground/60">
                    Writing {saveProgress.current}/{saveProgress.total}
                  </span>
                </div>
                <div className="h-0.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/20 transition-all duration-200"
                    style={{ width: `${saveProgress.total > 0 ? (saveProgress.current / saveProgress.total) * 100 : 0}%` }}
                  />
                </div>
                {saveProgress.currentFile && (
                  <p className="mt-1.5 text-[11px] text-foreground/25 font-[family-name:var(--font-geist-mono)] truncate leading-snug">
                    {saveProgress.currentFile}
                  </p>
                )}
              </div>
            )}

            {/* Saved confirmation */}
            {savedPath && !saveError && (
              <div className="rounded-lg bg-white/[0.03] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Check className="size-3 shrink-0 text-foreground/50" />
                  <span className="text-xs text-foreground/60">
                    {savedPath === "downloaded" ? "Downloaded" : "Saved"}
                  </span>
                  {savedPath !== "downloaded" && (
                    <span className="text-[11px] text-foreground/25 font-[family-name:var(--font-geist-mono)] truncate">
                      …/{savedPath}
                    </span>
                  )}
                  <button
                    onClick={handleReset}
                    className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground/30 transition-all hover:bg-white/[0.06] hover:text-foreground/60 active:scale-90"
                    title="Generate another"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Save error */}
            {saveError && (
              <div className="rounded-lg bg-white/[0.03] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-3 shrink-0 text-foreground/40" />
                  <span className="text-xs text-foreground/60">Save failed</span>
                </div>
                <p className="mt-1 text-[11px] text-foreground/25 font-[family-name:var(--font-geist-mono)] truncate leading-snug">
                  {saveError}
                </p>
              </div>
            )}

            {/* Primary action */}
            {!savedPath && (
              <button
                onClick={handleSaveProject}
                disabled={saving}
                className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/[0.07] text-xs font-medium text-foreground/70 transition-colors hover:bg-white/[0.10] hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Saving
                  </>
                ) : fsSupported ? (
                  <>
                    <FolderOpen className="size-3" />
                    Save to disk
                  </>
                ) : (
                  <>
                    <Download className="size-3" />
                    Download ZIP
                  </>
                )}
              </button>
            )}

            {/* Secondary action */}
            {!savedPath && fsSupported && (
              <button
                onClick={handleDownloadZip}
                disabled={saving}
                className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[11px] text-foreground/30 transition-colors hover:text-foreground/60 disabled:opacity-40"
              >
                <Download className="size-3" />
                or download ZIP
              </button>
            )}

            {/* Steps — fill remaining space after download */}
            {savedPath && !saveError && (
              <div className="mt-3 flex-1 flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="px-4 pt-4 pb-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/45">
                    How to use
                  </p>
                </div>

                <div className="flex-1 flex flex-col justify-between px-4 pb-4">
                  {[
                    {
                      num: "1",
                      title: "Extract the ZIP",
                      desc: "Unzip the downloaded file into your project folder.",
                    },
                    {
                      num: "2",
                      title: "Open in your IDE",
                      desc: "Open the extracted folder in VS Code, Cursor, or your editor.",
                    },
                    {
                      num: "3",
                      title: "Start your agent & type:",
                      logos: ["/claude-color.webp", "/codex.webp", "/opencode.webp"],
                      code: "@AGENTS.md",
                    },
                    {
                      num: "4",
                      title: "Let it work",
                      desc: "The agent reads your spec, asks questions, then builds.",
                    },
                    {
                      num: "5",
                      title: "Ship it",
                      desc: "Review, iterate and track progress!",
                    },
                  ].map((step, i) => (
                    <div key={step.num} className="flex gap-3 relative">
                      {/* Vertical connector */}
                      {i < 4 && (
                        <div className="absolute left-[10px] top-[20px] bottom-[-6px] w-px bg-white/[0.06]" />
                      )}
                      {/* Number */}
                      <div className="relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-medium text-foreground/50 tabular-nums">
                        {step.num}
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1 pt-px">
                        <p className="text-[13px] font-medium leading-snug text-foreground/70">
                          {step.title}
                        </p>
                        {step.desc && (
                          <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/35">
                            {step.desc}
                          </p>
                        )}
                        {step.logos && (
                          <div className="mt-2 flex items-center gap-2">
                            {step.logos.map((src) => (
                              <img
                                key={src}
                                src={src}
                                alt=""
                                className="size-[18px] rounded-[3px] object-contain opacity-60"
                              />
                            ))}
                          </div>
                        )}
                        {step.code && (
                          <code className="mt-2 inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11.5px] font-[family-name:var(--font-geist-mono)] text-foreground/60">
                            {step.code}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState<"chat" | "specs">("chat")
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  // Animate open on first mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true))
    } else {
      setMounted(false)
      setClosing(false)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    // Let the slide-out animation finish, then unmount
    setTimeout(() => {
      closingRef.current = false
      setClosing(false)
      onClose()
    }, 260)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className={`fixed right-2 top-[56px] bottom-2 z-50 flex w-80 max-w-[calc(100vw-1rem)] flex-col rounded-xl border border-white/[0.08] bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        mounted && !closing
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-[calc(100%+12px)] opacity-0 scale-95"
      }`}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
        <div className="flex flex-col">
          <span className="text-[13px] font-normal tracking-[-0.01em] leading-tight text-foreground">
            KubeAI
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground/50">
            AI can make mistakes
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.1] hover:text-[var(--state-error)]"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "chat" | "specs")}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex shrink-0 justify-center px-3 pt-3">
          <TabsList
            variant="default"
            className="inline-flex w-fit rounded-full border border-white/[0.06] bg-white/[0.03] p-0.5"
          >
            <TabsTrigger
              value="chat"
              className="rounded-full border-0 bg-transparent px-4 py-1.5 text-[11px] font-normal tracking-wide text-muted-foreground transition-all duration-200 data-active:bg-white/[0.08] data-active:text-foreground"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-full border-0 bg-transparent px-4 py-1.5 text-[11px] font-normal tracking-wide text-muted-foreground transition-all duration-200 data-active:bg-white/[0.08] data-active:text-foreground"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="relative mt-0 flex-1 overflow-hidden">
          <div
            className={`absolute inset-0 h-full transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,filter] motion-reduce:transition-none ${
              activeTab === "chat"
                ? "pointer-events-auto translate-y-0 opacity-100 blur-0"
                : "pointer-events-none translate-y-3 opacity-0 blur-[2px]"
            }`}
          >
            <ChatTab
              projectId={projectId}
              currentUserId={currentUserId}
              chatRef={chatRef}
            />
          </div>

          <div
            className={`absolute inset-0 h-full transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,filter] motion-reduce:transition-none ${
              activeTab === "specs"
                ? "pointer-events-auto translate-y-0 opacity-100 blur-0"
                : "pointer-events-none translate-y-3 opacity-0 blur-[2px]"
            }`}
          >
            <SpecsTab projectId={projectId} />
          </div>
        </div>
      </Tabs>

      {/* Clear chat confirmation dialog */}
      {confirmOpen &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="mx-4 w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#111114] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--state-error)]/10">
                  <Trash2 className="size-4 text-[var(--state-error)]" />
                </div>
                <div>
                  <p className="text-sm font-normal tracking-[-0.01em] text-foreground">
                    Clear chat history?
                  </p>
                  <p className="text-xs text-muted-foreground/80">
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
