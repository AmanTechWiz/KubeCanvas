// ── Chat Guardrails ──────────────────────────────────────────────────
// Deterministic, regex-based input validation for the chat agent.
// Runs BEFORE any LLM call — zero cost, zero latency overhead beyond
// the regex evaluation itself. Returns a rejection result with a
// standard user-facing message when something looks dangerous.
// ─────────────────────────────────────────────────────────────────────

export interface GuardrailResult {
  safe: boolean;
  reason?: string;
  reply?: string;
}

// ── Pattern Definitions ──────────────────────────────────────────────

/**
 * Prompt injection / jailbreak attempts.
 * Covers common English phrases, XML/HTML-style tags used for
 * instruction smuggling, and ChatML-style markers.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // English instruction overrides
  /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|rules?|guidelines?|directions?)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /act\s+as\s+(a|an|the)\s+(?:different|new|alternate)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an|the)\s+(?:different|new|evil|unrestricted)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|prompts?)/i,
  /override\s+(your\s+)?(previous|prior|existing)\s+(instructions?|rules?|programming)/i,
  /new\s+instructions?:/i,
  /updated?\s+instructions?:/i,

  // Role hijacking
  /you\s+(?:must|should|will|need\s+to)\s+(?:now\s+)?(?:obey|follow|listen\s+to)\s+(?:my|the|these)\s+(?:new\s+)?(?:commands?|instructions?|rules?)/i,
  /(?:switch|change)\s+(?:to\s+)?(?:a\s+)?(?:different|new|alternate)\s+(?:mode|persona|role|personality)/i,

  // System prompt extraction
  /(?:show|reveal|print|output|repeat|display|echo|tell\s+me)\s+(?:your|the)\s+(?:system\s+(?:prompt|message|instructions?)|initial\s+instructions?|original\s+prompt)/i,
  /what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
  /(?:copy|paste|dump|extract|return)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|context)/i,

  // Delimiter-based injection (ChatML, XML, special tokens)
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /<\/?(?:system|prompt|instructions?|override|admin|root)\s*>/i,

  // Embedded instruction overrides
  /```\s*\n?(?:system|override|ADMIN|ROOT):/i,
  /---\s*\n(?:SYSTEM|ADMIN|OVERRIDE):/i,
  /\[SYSTEM\]/i,
  /\[ADMIN\]/i,
  /\[OVERRIDE\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\/<SYS>>/i,
];

/**
 * Dangerous technical patterns — SQL injection, XSS, command injection,
 * path traversal, and file system access attempts.
 */
const CODE_INJECTION_PATTERNS: RegExp[] = [
  // SQL injection
  /(?:;\s*(?:DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\s)/i,
  /(?:UNION\s+(?:ALL\s+)?SELECT)/i,
  /(?:'\s*(?:OR|AND)\s+'?\d?\s*=\s*'?)/i,

  // XSS / script injection
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /javascript\s*:/i,
  /on(?:error|load|click|mouseover)\s*=/i,

  // Command injection
  /(?:^|\s)(?:curl|wget|nc|netcat|bash|sh|powershell|cmd)\s+/i,
  /\$\(\s*(?:curl|wget|nc)/i,
  /`(?:curl|wget|nc)/i,

  // Path traversal
  /\.\.\/\.\.\//,
  /\.\.\\\\\.\.\\/,
  /(?:\/etc\/passwd|\/etc\/shadow|C:\\Windows\\System32)/i,
];

/**
 * Unicode / encoding tricks used to bypass text filters.
 */
const UNICODE_TRICK_PATTERNS: RegExp[] = [
  // Excessive zero-width characters (potential steganography or bypass)
  /[\u200B\u200C\u200D\uFEFF\u2060]{5,}/,

  // RTL override / LTR override abuse
  /[\u202A-\u202E]/,

  // Homoglyph attacks (Cyrillic characters that look like Latin)
  // Only flag when mixed with Latin in suspicious context
  /(?:[\u0400-\u04FF]{2,}[a-zA-Z]|[a-zA-Z]{2,}[\u0400-\u04FF])/,
];

// ── Main Guardrail Function ──────────────────────────────────────────

const REJECTION_MESSAGE =
  "I can't process that request. Please ask a question about your system architecture or infrastructure design.";

/**
 * Validates the LATEST user message against all guardrail patterns.
 * Only checks the most recent user message — previous messages were
 * already validated when first sent. This avoids false positives from
 * injection attempts that remain in conversation history.
 *
 * Returns early on first match — patterns are checked in priority order
 * (prompt injection first, then code injection, then unicode tricks).
 */
export function validateChatInput(
  messages: { role: string; content: string }[],
): GuardrailResult {
  const userMessages = messages.filter((m) => m.role === "user");

  // Conversation length abuse (50 user messages is plenty for arch chat)
  if (userMessages.length > 50) {
    return {
      safe: false,
      reason: "conversation_too_long",
      reply: REJECTION_MESSAGE,
    };
  }

  // Only validate the LAST user message — the one actually being sent now.
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (!lastUserMsg) return { safe: true };

  const content = lastUserMsg.content;

  if (!content.trim()) return { safe: true };

  // Message too long
  if (content.length > 5000) {
    return {
      safe: false,
      reason: "message_too_long",
      reply: REJECTION_MESSAGE,
    };
  }

  // Prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `prompt_injection: ${pattern.source.slice(0, 40)}`,
        reply: REJECTION_MESSAGE,
      };
    }
  }

  // Code injection
  for (const pattern of CODE_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `code_injection: ${pattern.source.slice(0, 40)}`,
        reply: REJECTION_MESSAGE,
      };
    }
  }

  // Unicode tricks
  for (const pattern of UNICODE_TRICK_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `unicode_trick: ${pattern.source.slice(0, 40)}`,
        reply: REJECTION_MESSAGE,
      };
    }
  }

  return { safe: true };
}
