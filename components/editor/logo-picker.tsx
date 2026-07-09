"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import StackIcon from "tech-stack-icons";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { LOGO_CATEGORIES, type LogoDefinition, serializeLogoDragToCanvas } from "@/lib/logo-data";

// ── Logo picker context ───────────────────────────────────────────────
export interface LogoAddPayload {
  icon: string;
  label: string;
  flowX: number;
  flowY: number;
  customSvg?: string;
}

// ── Props ─────────────────────────────────────────────────────────────
interface LogoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLogo: (payload: LogoAddPayload) => void;
}

// ── Component ─────────────────────────────────────────────────────────
export function LogoPicker({ isOpen, onClose, onAddLogo }: LogoPickerProps) {
  const [activeTab, setActiveTab] = useState(LOGO_CATEGORIES[0].id);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Tabs scroll arrow logic ──────────────────────────────────────
  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, isOpen]);

  const scrollTabs = useCallback((dir: -1 | 1) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 120, behavior: "smooth" });
  }, []);

  // Filter icons by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return LOGO_CATEGORIES;

    const q = search.toLowerCase();
    return LOGO_CATEGORIES.map((cat) => ({
      ...cat,
      icons: cat.icons.filter(
        (icon) =>
          icon.label.toLowerCase().includes(q) ||
          icon.id.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.icons.length > 0);
  }, [search]);

  // Current category
  const currentCategory = useMemo(() => {
    if (search.trim()) return null; // search mode shows all
    return LOGO_CATEGORIES.find((c) => c.id === activeTab) ?? LOGO_CATEGORIES[0];
  }, [activeTab, search]);

  const handleLogoClick = useCallback(
    (logo: LogoDefinition) => {
      // Place at center of canvas (approximate)
      onAddLogo({
        icon: logo.icon ?? "",
        label: logo.label,
        flowX: 400 + Math.random() * 200,
        flowY: 300 + Math.random() * 200,
        customSvg: logo.customSvg,
      });
      onClose();
    },
    [onAddLogo, onClose],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        // If there's a search result, select the first one
        if (search.trim() && filteredCategories.length > 0) {
          const firstIcon = filteredCategories[0].icons[0];
          if (firstIcon) handleLogoClick(firstIcon);
        }
      }
    },
    [search, filteredCategories, handleLogoClick],
  );

  // Close on outside click (replaces backdrop to avoid blocking drag-and-drop)
  const outsideClickRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (outsideClickRef.current && !outsideClickRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use mousedown so it fires before dragstart
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null;

  const iconsToShow = search.trim()
    ? filteredCategories.flatMap((c) => c.icons)
    : currentCategory?.icons ?? [];

  return (
    <>
      {/* Panel — no backdrop so drag-and-drop reaches the canvas */}
      <div
        ref={outsideClickRef}
        className="absolute bottom-16 left-1/2 z-[100] w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 pointer-events-auto"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#111114] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_4px_40px_rgba(0,0,0,0.6),inset_0_0.5px_0_rgba(255,255,255,0.06)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Technology Logos
            </span>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 text-sm text-foreground placeholder:text-faint outline-none transition-colors focus:border-white/[0.16] focus:bg-white/[0.06]"
              />
            </div>
          </div>

          {/* Tabs with scroll arrows (hidden during search) */}
          {!search.trim() && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1.5">
                {/* Left arrow */}
                <button
                  onClick={() => scrollTabs(-1)}
                  disabled={!canScrollLeft}
                  className="flex h-6 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-0 disabled:cursor-default"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {/* Tabs row */}
                <div
                  ref={tabsRef}
                  className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                >
                  {LOGO_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveTab(cat.id);
                        const el = document.getElementById(`logo-tab-${cat.id}`);
                        el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                      }}
                      id={`logo-tab-${cat.id}`}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        activeTab === cat.id
                          ? "bg-white/[0.1] text-foreground"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Right arrow */}
                <button
                  onClick={() => scrollTabs(1)}
                  disabled={!canScrollRight}
                  className="flex h-6 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-0 disabled:cursor-default"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Icon grid */}
          <div
            className="max-h-[300px] overflow-y-auto px-3 pb-3"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
          >
            {search.trim() && filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No icons found</p>
                <p className="text-xs text-faint mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {iconsToShow.map((logo) => {
                  const handleDragStart = (e: React.DragEvent) => {
                    try {
                      const serialized = serializeLogoDragToCanvas({
                        icon: logo.icon ?? "",
                        label: logo.label,
                        w: 120,
                        h: 80,
                        customSvg: logo.customSvg,
                      });
                      e.dataTransfer.setData("application/x-kubecanvas-logo", serialized);
                      e.dataTransfer.setData("text/plain", serialized);
                      e.dataTransfer.effectAllowed = "copy";

                      // Suppress browser default ghost
                      const ghost = document.createElement("div");
                      ghost.style.cssText = "width:1px;height:1px;position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 0, 0);
                      setTimeout(() => ghost.remove(), 0);
                    } catch {
                      // Defensive
                    }
                  };

                  return (
                    <button
                      key={logo.id}
                      draggable
                      onDragStart={handleDragStart}
                      onClick={() => handleLogoClick(logo)}
                      title={logo.label}
                      className="group flex flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-white/[0.06] cursor-grab active:cursor-grabbing pointer-events-auto"
                    >
                      <div className="flex h-8 w-8 items-center justify-center">
                        {logo.customSvg ? (
                          <span
                            className="h-8 w-8 [&_svg]:h-full [&_svg]:w-full"
                            dangerouslySetInnerHTML={{ __html: logo.customSvg }}
                          />
                        ) : logo.icon ? (
                          <StackIcon
                            name={logo.icon as any}
                            variant="dark"
                            className="h-8 w-8"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
                        )}
                      </div>
                      <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground group-hover:text-foreground">
                        {logo.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
