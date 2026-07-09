// ── Chat Text Formatting ─────────────────────────────────────────────
// Rich formatting for AI chat responses: lists, code blocks, headings,
// bold/italic, and highlighted tech keywords.
// ──────────────────────────────────────────────────────────────────────

import React from "react";

// ── Segment types ─────────────────────────────────────────────────

export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  codeBlock: boolean;
  heading: boolean;
  bulletItem: boolean;
  numberedItem: boolean;
  itemNumber?: number;
  techHighlight: boolean;
}

function seg(overrides: Partial<TextSegment> & { text: string }): TextSegment {
  return {
    bold: false,
    italic: false,
    code: false,
    codeBlock: false,
    heading: false,
    bulletItem: false,
    numberedItem: false,
    techHighlight: false,
    ...overrides,
  };
}

// ── Tech keyword highlight list ────────────────────────────────────

const TECH_KEYWORDS = [
  // Databases
  /\b(PostgreSQL|Postgres|MySQL|MongoDB|Redis|DynamoDB|Cassandra|CouchDB|SQLite|MariaDB|Supabase|Firebase|Elasticsearch|OpenSearch|Neo4j)\b/gi,
  // Cloud
  /\b(AWS|Azure|GCP|Google Cloud|Cloudflare|Vercel|Netlify|EC2|S3|RDS|Lambda|ECS|EKS|Fargate|CloudFront|Route 53|VPC|IAM)\b/gi,
  // Containers & Orchestration
  /\b(Docker|Kubernetes|K8s|Helm|Istio|Podman)\b/gi,
  // Messaging
  /\b(Kafka|RabbitMQ|SQS|SNS|NATS|Pulsar|Redis Streams)\b/gi,
  // Backend
  /\b(Node\.?js|Express|NestJS|FastAPI|Django|Flask|Spring|Go|Rust|Bun|GraphQL|gRPC|REST)\b/gi,
  // Frontend
  /\b(React|Next\.?js|Angular|Vue\.?js|Svelte|TypeScript|Tailwind|Vite)\b/gi,
  // Auth
  /\b(Auth0|Clerk|OAuth|JWT|SAML|SSO)\b/gi,
  // AI/ML
  /\b(OpenAI|Anthropic|Gemini|LangChain|TensorFlow|PyTorch|Hugging Face)\b/gi,
  // DevOps
  /\b(Terraform|Pulumi|Ansible|GitHub Actions|GitLab CI|Jenkins|ArgoCD|Prometheus|Grafana|Datadog|Sentry)\b/gi,
  // Networking
  /\b(Nginx|HAProxy|Traefik|Envoy|CDN|Load Balancer|API Gateway)\b/gi,
];

// ── Strip markdown formatting ──────────────────────────────────────

export function stripMarkdown(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.+?)__/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1");
  cleaned = cleaned.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/~~(.+?)~~/g, "$1");
  cleaned = cleaned.replace(/^\s*[-*_]{3,}\s*$/gm, "");
  cleaned = cleaned.replace(/^[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^\d+\.\s+/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

// ── Parse into styled segments ─────────────────────────────────────

function parseInlineFormatting(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|~~(.+?)~~|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push(seg({ text: line.slice(lastIndex, match.index) }));
    }
    if (match[1] || match[2]) {
      segments.push(seg({ text: match[1] || match[2], bold: true }));
    } else if (match[3]) {
      segments.push(seg({ text: match[3], code: true }));
    } else if (match[4]) {
      segments.push(seg({ text: match[4] }));
    } else if (match[5]) {
      segments.push(seg({ text: match[5], italic: true }));
    } else if (match[6]) {
      segments.push(seg({ text: match[6], italic: true }));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push(seg({ text: line.slice(lastIndex) }));
  }
  if (segments.length === 0 && line.length > 0) {
    segments.push(seg({ text: line }));
  }

  return segments;
}

/**
 * Parse markdown text into structured segments.
 * Supports: headings, code blocks, bullet lists, numbered lists,
 * bold, italic, inline code, strikethrough, horizontal rules.
 */
export function parseMarkdownSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle (``` ... ```)
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        segments.push(seg({ text: codeLines.join("\n"), codeBlock: true }));
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty line → spacer
    if (line.trim() === "") {
      segments.push(seg({ text: "\n" }));
      continue;
    }

    // Horizontal rule
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      segments.push(seg({ text: "" }));
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      segments.push(seg({ text: headingMatch[2], heading: true }));
      continue;
    }

    // Bullet list item: - item or * item
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)/);
    if (bulletMatch) {
      const inlineSegs = parseInlineFormatting(bulletMatch[1]);
      segments.push(seg({ text: "\u2022 ", bulletItem: true }));
      segments.push(...inlineSegs);
      segments.push(seg({ text: "\n" }));
      continue;
    }

    // Numbered list item: 1. item
    const numMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const inlineSegs = parseInlineFormatting(numMatch[2]);
      segments.push(seg({ text: `${num}. `, numberedItem: true, itemNumber: num }));
      segments.push(...inlineSegs);
      segments.push(seg({ text: "\n" }));
      continue;
    }

    // Normal line with inline formatting
    const inlineSegs = parseInlineFormatting(line);
    segments.push(...inlineSegs);
    if (i < lines.length - 1) {
      segments.push(seg({ text: "\n" }));
    }
  }

  // Flush unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    segments.push(seg({ text: codeLines.join("\n"), codeBlock: true }));
  }

  return segments;
}

// ── React rendering helper ─────────────────────────────────────────

/**
 * Highlight tech keywords in a plain-text string.
 * Splits text around keyword matches and returns styled spans.
 */
function highlightTechKeywords(text: string, key: string): React.ReactNode {
  // Build a combined regex from all patterns
  const combined = TECH_KEYWORDS.map((r) => r.source).join("|");
  const re = new RegExp(combined, "gi");
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index));
    }
    parts.push(
      <span key={`${key}-tw-${m.index}`} className="text-[var(--accent-primary)] font-medium">
        {m[0]}
      </span>,
    );
    lastIdx = re.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Render parsed markdown segments as React elements.
 */
export function renderFormattedText(text: string): React.ReactNode {
  const segments = parseMarkdownSegments(text);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < segments.length) {
    const s = segments[i];

    // Code block → render as a <pre><code> block
    if (s.codeBlock) {
      blocks.push(
        <pre
          key={`cb-${i}`}
          className="my-1.5 rounded-lg bg-black/30 border border-white/[0.06] p-2.5 text-xs font-mono text-[var(--accent-primary)] overflow-x-auto whitespace-pre-wrap"
        >
          <code>{s.text}</code>
        </pre>,
      );
      i++;
      continue;
    }

    // Heading
    if (s.heading) {
      blocks.push(
        <div key={`h-${i}`} className="mt-2 mb-1 text-sm font-bold text-foreground">
          {s.text}
        </div>,
      );
      i++;
      continue;
    }

    // Blank line spacer
    if (s.text === "\n" && !s.bulletItem && !s.numberedItem) {
      blocks.push(<div key={`sp-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // Horizontal rule
    if (!s.text && !s.bold && !s.italic && !s.code) {
      blocks.push(<hr key={`hr-${i}`} className="my-2 border-white/[0.08]" />);
      i++;
      continue;
    }

    // Collect contiguous bullet or numbered items into a list
    const listItems: React.ReactNode[] = [];
    let isBulletList = false;
    let isNumberedList = false;

    while (i < segments.length) {
      const cur = segments[i];
      if (cur.bulletItem) {
        isBulletList = true;
        // Gather inline segments until next newline segment
        const itemParts: React.ReactNode[] = [];
        i++;
        while (i < segments.length && segments[i].text !== "\n" && !segments[i].bulletItem && !segments[i].numberedItem && !segments[i].heading && !segments[i].codeBlock) {
          itemParts.push(renderSegment(segments[i], `li-${i}`));
          i++;
        }
        // Skip trailing newline
        if (i < segments.length && segments[i].text === "\n") i++;

        listItems.push(
          <li key={`li-${listItems.length}`} className="flex gap-1.5 leading-relaxed">
            <span className="text-[var(--accent-primary)] mt-px select-none">•</span>
            <span>{itemParts}</span>
          </li>,
        );
      } else if (cur.numberedItem) {
        isNumberedList = true;
        const num = cur.itemNumber ?? listItems.length + 1;
        const itemParts: React.ReactNode[] = [];
        i++;
        while (i < segments.length && segments[i].text !== "\n" && !segments[i].bulletItem && !segments[i].numberedItem && !segments[i].heading && !segments[i].codeBlock) {
          itemParts.push(renderSegment(segments[i], `oli-${i}`));
          i++;
        }
        if (i < segments.length && segments[i].text === "\n") i++;

        listItems.push(
          <li key={`oli-${listItems.length}`} className="flex gap-1.5 leading-relaxed">
            <span className="text-[var(--accent-primary)] font-medium mt-px select-none min-w-[1.2em] text-right">
              {num}.
            </span>
            <span>{itemParts}</span>
          </li>,
        );
      } else {
        break;
      }
    }

    if (listItems.length > 0) {
      const Tag = isBulletList || isNumberedList ? "ol" : "ul";
      blocks.push(
        <Tag key={`lst-${blocks.length}`} className="my-1 space-y-0.5 pl-0 list-none">
          {listItems}
        </Tag>,
      );
      continue;
    }

    // Default: inline paragraph text
    blocks.push(
      <span key={`p-${blocks.length}`} className="text-sm leading-relaxed">
        {highlightTechKeywords(s.text, `pk-${i}`)}
      </span>,
    );
    i++;
  }

  return <>{blocks}</>;
}

/**
 * Render a single inline segment as a React element.
 */
function renderSegment(seg: TextSegment, key: string): React.ReactNode {
  if (seg.code) {
    return (
      <code key={key} className="rounded bg-white/[0.08] px-1 py-0.5 text-xs font-mono text-[var(--accent-primary)]">
        {seg.text}
      </code>
    );
  }
  if (seg.bold) {
    return <strong key={key} className="font-bold text-foreground">{seg.text}</strong>;
  }
  if (seg.italic) {
    return <em key={key} className="italic">{seg.text}</em>;
  }
  return <span key={key}>{seg.text}</span>;
}
