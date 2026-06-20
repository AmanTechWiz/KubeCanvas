"use client"

import { useState, useRef, useEffect } from "react"
import {
  Bot,
  X,
  Send,
  FileCode,
  Download,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const STARTER_CHIPS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

/* ------------------------------------------------------------------ */
/*  AI Architect Tab                                                   */
/* ------------------------------------------------------------------ */

function AiArchitectTab() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 72), 160)}px`
  }, [input])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChipClick = (chip: string) => {
    setMessages((prev) => [...prev, { role: "user", content: chip }])
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
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
                  className="cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-white/[0.16] hover:text-foreground"
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
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)]">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your architecture…"
            rows={1}
            className="min-h-[72px] max-h-[160px] flex-1 resize-none border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            size="icon-sm"
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="shrink-0 cursor-pointer rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80 disabled:opacity-40"
          >
            <Send className="size-4" />
          </Button>
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

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
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
      <Tabs defaultValue="architect" className="flex flex-1 flex-col overflow-hidden">
        {/* Centered pill tab list */}
        <div className="flex shrink-0 justify-center px-3 pt-3">
          <TabsList
            variant="default"
            className="inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5"
          >
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

        <TabsContent value="architect" className="mt-0 flex-1 overflow-hidden">
          <AiArchitectTab />
        </TabsContent>

        <TabsContent value="specs" className="mt-0 flex-1 overflow-hidden">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
