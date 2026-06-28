// ── Chat Text Formatting ─────────────────────────────────────────────
// Cleans up raw AI-generated text for display in the chat UI.
// Removes markdown artifacts like **bold**, # headings, *italic* etc.
// Returns JSX-ready content split into styled segments.
// ──────────────────────────────────────────────────────────────────────

import React from "react";

// ── Strip markdown formatting ──────────────────────────────────────

/**
 * Remove common markdown formatting markers from text.
 * Handles both normal and bold variants of:
 *   - **bold** and __bold__
 *   - *italic* and _italic_
 *   - # ## ### headings
 *   - `inline code`
 *   - ~~strikethrough~~
 */
export function stripMarkdown(text: string): string {
  let cleaned = text;

  // Remove heading markers: ### Heading → Heading
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove bold markers: **text** or __text__
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.+?)__/g, "$1");

  // Remove italic markers: *text* or _text_ (but not inside words)
  cleaned = cleaned.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

  // Remove inline code: `code`
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove strikethrough: ~~text~~
  cleaned = cleaned.replace(/~~(.+?)~~/g, "$1");

  // Remove horizontal rules: --- or *** or ___
  cleaned = cleaned.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // Clean up excessive blank lines (more than 2 → 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

// ── Parse into styled segments ─────────────────────────────────────

export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  heading: boolean;
}

/**
 * Parse markdown text into an array of styled segments for rendering.
 * Preserves structure (line breaks, bold, italic, code) while
 * removing raw markers.
 */
export function parseMarkdownSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      segments.push({ text: headingMatch[2], bold: false, italic: false, code: false, heading: true });
      if (i < lines.length - 1) segments.push({ text: "\n", bold: false, italic: false, code: false, heading: false });
      continue;
    }

    // Check if line is a horizontal rule
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      segments.push({ text: "", bold: false, italic: false, code: false, heading: false });
      if (i < lines.length - 1) segments.push({ text: "\n", bold: false, italic: false, code: false, heading: false });
      continue;
    }

    // Parse inline formatting within the line
    const inlineSegments = parseInlineFormatting(line);
    segments.push(...inlineSegments);

    // Add line break (except for the last line)
    if (i < lines.length - 1) {
      segments.push({ text: "\n", bold: false, italic: false, code: false, heading: false });
    }
  }

  return segments;
}

/**
 * Parse inline markdown formatting within a single line.
 * Handles **bold**, *italic*, `code`, ~~strikethrough~~.
 */
function parseInlineFormatting(line: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Pattern matches: **bold**, *italic*, `code`, ~~strike~~, or plain text
  const regex = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|~~(.+?)~~|\*(.+?)\*|_(.+?)_/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    // Add any plain text before this match
    if (match.index > lastIndex) {
      segments.push({
        text: line.slice(lastIndex, match.index),
        bold: false,
        italic: false,
        code: false,
        heading: false,
      });
    }

    if (match[1] || match[2]) {
      // Bold: **text** or __text__
      segments.push({
        text: match[1] || match[2],
        bold: true,
        italic: false,
        code: false,
        heading: false,
      });
    } else if (match[3]) {
      // Code: `text`
      segments.push({
        text: match[3],
        bold: false,
        italic: false,
        code: true,
        heading: false,
      });
    } else if (match[4]) {
      // Strikethrough: ~~text~~
      segments.push({
        text: match[4],
        bold: false,
        italic: false,
        code: false,
        heading: false,
      });
    } else if (match[5]) {
      // Italic: *text*
      segments.push({
        text: match[5],
        bold: false,
        italic: true,
        code: false,
        heading: false,
      });
    } else if (match[6]) {
      // Italic: _text_
      segments.push({
        text: match[6],
        bold: false,
        italic: true,
        code: false,
        heading: false,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining plain text
  if (lastIndex < line.length) {
    segments.push({
      text: line.slice(lastIndex),
      bold: false,
      italic: false,
      code: false,
      heading: false,
    });
  }

  // If no matches were found, the entire line is plain text
  if (segments.length === 0 && line.length > 0) {
    segments.push({
      text: line,
      bold: false,
      italic: false,
      code: false,
      heading: false,
    });
  }

  return segments;
}

// ── React rendering helper ─────────────────────────────────────────

/**
 * Render parsed markdown segments as React elements.
 * Used in chat message bubbles for clean, formatted output.
 */
export function renderFormattedText(text: string): React.ReactNode {
  const segments = parseMarkdownSegments(text);

  return segments.map((seg, i) => {
    // Line breaks
    if (seg.text === "\n") {
      return <br key={i} />;
    }

    // Empty (horizontal rule or spacing)
    if (!seg.text) {
      return <span key={i} className="my-1 block" />;
    }

    // Heading
    if (seg.heading) {
      return (
        <span key={i} className="mt-2 block text-sm font-bold text-foreground">
          {seg.text}
        </span>
      );
    }

    // Bold
    if (seg.bold) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {seg.text}
        </strong>
      );
    }

    // Italic
    if (seg.italic) {
      return (
        <em key={i} className="italic">
          {seg.text}
        </em>
      );
    }

    // Code
    if (seg.code) {
      return (
        <code
          key={i}
          className="rounded bg-white/[0.08] px-1 py-0.5 text-xs font-mono text-[var(--accent-primary)]"
        >
          {seg.text}
        </code>
      );
    }

    // Plain text
    return <span key={i}>{seg.text}</span>;
  });
}
