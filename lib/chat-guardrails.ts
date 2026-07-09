// ── Chat Guardrails ──────────────────────────────────────────────────
// Deterministic, regex-based input validation for the chat agent.
// Runs BEFORE any LLM call — zero cost, zero latency overhead beyond
// the regex evaluation itself.
//
// Two layers:
//   1. Topic enforcement — blocks non-system-design queries
//   2. Security — blocks prompt injection, code injection, unicode tricks
// ─────────────────────────────────────────────────────────────────────

export interface GuardrailResult {
  safe: boolean;
  reason?: string;
  reply?: string;
}

// ── Topic Enforcement ────────────────────────────────────────────────
// KubeAI is a system design assistant. Only queries related to
// architecture, infrastructure, databases, cloud, DevOps, etc. are allowed.

const TOPIC_REJECTION_MESSAGE =
  "I'm KubeAI, a system design assistant. I can help with architecture, infrastructure, databases, cloud, DevOps, and related topics. Please ask something about system design or infrastructure.";

/**
 * Keywords and phrases that indicate a system-design-related query.
 * Matched case-insensitively against the full message text.
 * Ordered by specificity — longer phrases first.
 */
const TECH_TOPIC_PATTERNS: RegExp[] = [
  // Explicit architecture/HLD/LLD mentions
  /\b(?:hld|lld|high[\s-]level\s+design|low[\s-]level\s+design)\b/i,
  /\b(?:system\s+design|software\s+architecture|architect(?:ure)?)\b/i,
  /\b(?:design\s+(?:a|the|an)\s+(?:system|architecture|platform|service|api|app(?:lication)?))\b/i,
  /\b(?:build|create|design|generate|draw)\b.*\b(?:architecture|diagram|system|flowchart)\b/i,

  // Infrastructure and cloud
  /\b(?:aws|azure|gcp|google\s+cloud|amazon\s+web|cloudflare|vercel|netlify)\b/i,
  /\b(?:ec2|s3|rds|lambda|ecs|eks|fargate|cloudfront|route\s*53|vpc|iam)\b/i,
  /\b(?:cloud\s+(?:infrastructure|migration|native|deployment|provider))\b/i,
  /\b(?:infrastructure\s+(?:as\s+code|automation|provisioning))\b/i,

  // Containers and orchestration
  /\b(?:docker|kubernetes|k8s|container(?:ization|s)?|pod|helm|istio)\b/i,
  /\b(?:orchestrat(?:e|ion|ing)|micro[\s-]?services?\s+(?:arch|design|pattern))\b/i,

  // Databases and storage
  /\b(?:postgres(?:ql)?|mysql|mongo(?:db)?|redis|cassandra|dynamodb|couchdb|sqlite|mariadb)\b/i,
  /\b(?:elasticsearch|opensearch|solr|meilisearch|typesense)\b/i,
  /\b(?:database\s+(?:design|schema|choice|scaling|replication|sharding))\b/i,
  /\b(?:sql|nosql|newsql)\b/i,
  /\b(?:schema\s+(?:design|migration|management))\b/i,
  /\b(?:s3|gcs|azure\s+blob|minio|object\s+storage|file\s+storage|block\s+storage)\b/i,
  /\b(?:cache|caching|redis|memcached|cdn|cloudflare)\b/i,

  // Messaging and event systems
  /\b(?:kafka|rabbitmq|sqs|sns|nats|pulsar|activemq|zeroMQ)\b/i,
  /\b(?:message\s+queue|event\s+(?:bus|driven|streaming|source)|pub[\s-]?sub)\b/i,
  /\b(?:streaming|stream\s+processing|real[\s-]?time\s+(?:data|processing))\b/i,

  // Networking and load balancing
  /\b(?:load\s+balanc(?:e|er|ing)|nginx|haproxy|traefik|envoy)\b/i,
  /\b(?:api\s+gateway|rate\s+limit(?:ing|er)?|circuit\s+breaker|reverse\s+proxy)\b/i,
  /\b(?:cdn|content\s+delivery|edge\s+(?:computing|network))\b/i,
  /\b(?:dns|ssl|tls|certificate|firewall|network(?:ing)?\s+(?:security|policy|segmentation))\b/i,

  // CI/CD and DevOps
  /\b(?:ci\s*\/?\s*cd|continuous\s+(?:integration|delivery|deployment))\b/i,
  /\b(?:gitlab\s+ci|github\s+actions|jenkins|circleci|travis|argo(?:cd)?|flux)\b/i,
  /\b(?:terraform|pulumi|ansible|chef|puppet|cloudformation)\b/i,
  /\b(?:devops|sre|site\s+reliability|observability|monitoring|alerting)\b/i,
  /\b(?:prometheus|grafana|datadog|newrelic|sentry|elk\s+stack|zipkin|jaeger)\b/i,

  // Scalability and performance
  /\b(?:scal(?:e|ability|ing)|horizontal|vertical\s+scaling|auto[\s-]scal(?:e|ing))\b/i,
  /\b(?:performance|latency|throughput|bottleneck|optimization|profiling)\b/i,
  /\b(?:replic(?:a|ation)|shard(?:ing)?|partition(?:ing)?|consistency)\b/i,
  /\b(?:high\s+availability|fault\s+toleran(?:t|ce)|disaster\s+recovery|backup)\b/i,
  /\b(?:load\s+test(?:ing)?|stress\s+test(?:ing)?|capacity\s+planning)\b/i,

  // Security architecture
  /\b(?:oauth|oidc|jwt|saml|sso|single\s+sign[\s-]?on)\b/i,
  /\b(?:auth(?:entication|orization)?|rbac|abac|acl|iam|identity)\b/i,
  /\b(?:zero\s+trust|encryption|key\s+management|secret\s+management|vault)\b/i,
  /\b(?:waf|intrusion\s+detection|siem|compliance|gdpr|soc\s*2)\b/i,

  // Backend and API design
  /\b(?:rest(?:ful)?|graphql|grpc|websocket|http\/2|http\/3|quic)\b/i,
  /\b(?:api\s+(?:design|versioning|documentation|gateway|rate\s+limit))\b/i,
  /\b(?:microservice|monolith|modular\s+monolith|serverless|faas|funtion(?:s)?\s+as\s+a\s+service)\b/i,
  /\b(?:service\s+mesh|sidecar|proxy|consul|etcd|zookeeper)\b/i,

  // Frontend architecture (when discussing system design context)
  /\b(?:spa|ssr|ssg|isr|nextjs|next\.js|remix|nuxt|sveltekit)\b/i,
  /\b(?:state\s+management|rendering\s+strategy|performance\s+optimization|caching\s+strategy)\b/i,

  // Data architecture
  /\b(?:data\s+(?:pipeline|lake|warehouse|mesh|flow|modeling))\b/i,
  /\b(?:etl|elt|batch\s+processing|stream\s+processing|apache\s+spark|apache\s+flink)\b/i,
  /\b(?:olap|oltp|data\s+store|data\s+layer)\b/i,

  // General tech / software engineering
  /\b(?:architecture\s+(?:pattern|style|decision|review|diagram))\b/i,
  /\b(?:tech(?:nology)?\s+(?:stack|choice|decision|evaluation|comparison))\b/i,
  /\b(?:trade[\s-]?offs?|pros?\s+(?:and|&)\s+cons?|when\s+to\s+use)\b/i,
  /\b(?:production|deploy(?:ment)?|release|rollback|blue[\s-]?green|canary)\b/i,
  /\b(?:monorepo|polyrepo|micro[\s-]?frontend|backend[\s-]?for[\s-]?frontend|bff)\b/i,
  /\b(?:queue|worker|consumer|producer|job\s+(?:queue|scheduler)|cron|celery|bull)\b/i,
  /\b(?:websocket|socket\.io|server[\s-]?sent\s+events?|sse|long[\s-]?polling)\b/i,
];

// Short greetings and conversational fillers that should always be allowed
const GREETING_PATTERNS: RegExp[] = [
  /^(?:hi|hello|hey|yo|sup|howdy|hola|hiya|gm|gn|good\s+(?:morning|afternoon|evening))[\s!?.]*$/i,
  /^(?:thanks?|thank\s+you|ty|thx|cheers|appreciate)[\s!?.]*$/i,
  /^(?:bye|goodbye|see\s+ya|later|cya|gn|good\s+night)[\s!?.]*$/i,
  /^(?:ok|okay|cool|nice|great|awesome|perfect|got\s+it|understood|makes?\s+sense)[\s!?.]*$/i,
  /^(?:yes|no|yeah|yep|nope|nah|yup)[\s!?.]*$/i,
];

/**
 * Checks if a message is on-topic for a system design assistant.
 * Returns `safe: true` if the message is tech-related or a greeting.
 * Returns `safe: false` with a polite rejection for off-topic queries.
 */
function validateTopic(content: string): GuardrailResult {
  const trimmed = content.trim();

  // Allow empty messages
  if (!trimmed) return { safe: true };

  // Allow short greetings and conversational fillers
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: true };
    }
  }

  // Allow very short messages (likely follow-ups like "ok", "yes", "do it")
  // — the LLM's system prompt handles off-topic at the conversation level
  if (trimmed.length <= 15) {
    return { safe: true };
  }

  // Check for tech-related keywords
  for (const pattern of TECH_TOPIC_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: true };
    }
  }

  // No tech keywords found — block
  return {
    safe: false,
    reason: "off_topic",
    reply: TOPIC_REJECTION_MESSAGE,
  };
}

// ── Security Patterns ────────────────────────────────────────────────

/**
 * Prompt injection / jailbreak attempts.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|rules?|guidelines?|directions?)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /act\s+as\s+(a|an|the)\s+(?:different|new|alternate)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an|the)\s+(?:different|new|evil|unrestricted)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|prompts?)/i,
  /override\s+(your\s+)?(previous|prior|existing)\s+(instructions?|rules?|programming)/i,
  /new\s+instructions?:/i,
  /updated?\s+instructions?:/i,
  /you\s+(?:must|should|will|need\s+to)\s+(?:now\s+)?(?:obey|follow|listen\s+to)\s+(?:my|the|these)\s+(?:new\s+)?(?:commands?|instructions?|rules?)/i,
  /(?:switch|change)\s+(?:to\s+)?(?:a\s+)?(?:different|new|alternate)\s+(?:mode|persona|role|personality)/i,
  /(?:show|reveal|print|output|repeat|display|echo|tell\s+me)\s+(?:your|the)\s+(?:system\s+(?:prompt|message|instructions?)|initial\s+instructions?|original\s+prompt)/i,
  /what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
  /(?:copy|paste|dump|extract|return)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|context)/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /<\/?(?:system|prompt|instructions?|override|admin|root)\s*>/i,
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
 * Dangerous technical patterns — SQL injection, XSS, command injection.
 */
const CODE_INJECTION_PATTERNS: RegExp[] = [
  /(?:;\s*(?:DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\s)/i,
  /(?:UNION\s+(?:ALL\s+)?SELECT)/i,
  /(?:'\s*(?:OR|AND)\s+'?\d?\s*=\s*'?)/i,
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /javascript\s*:/i,
  /on(?:error|load|click|mouseover)\s*=/i,
  /(?:^|\s)(?:curl|wget|nc|netcat|bash|sh|powershell|cmd)\s+/i,
  /\$\(\s*(?:curl|wget|nc)/i,
  /`(?:curl|wget|nc)/i,
  /\.\.\/\.\.\//,
  /\.\.\\\\\.\.\\/,
  /(?:\/etc\/passwd|\/etc\/shadow|C:\\Windows\\System32)/i,
];

/**
 * Unicode / encoding tricks used to bypass text filters.
 */
const UNICODE_TRICK_PATTERNS: RegExp[] = [
  /[\u200B\u200C\u200D\uFEFF\u2060]{5,}/,
  /[\u202A-\u202E]/,
  /(?:[\u0400-\u04FF]{2,}[a-zA-Z]|[a-zA-Z]{2,}[\u0400-\u04FF])/,
];

// ── Main Guardrail Function ──────────────────────────────────────────

const SECURITY_REJECTION_MESSAGE =
  "I can't process that request. Please ask a question about your system architecture or infrastructure design.";

/**
 * Validates the LATEST user message against all guardrail checks.
 * Order: topic enforcement → security (injection, code, unicode) → length.
 */
export function validateChatInput(
  messages: { role: string; content?: string; parts?: any[] }[],
): GuardrailResult {
  const getText = (m: { role: string; content?: string; parts?: any[] }): string => {
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.parts)) {
      return m.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    }
    return "";
  };

  const userMessages = messages.filter((m) => m.role === "user");

  // Conversation length guard
  if (userMessages.length > 500) {
    return {
      safe: false,
      reason: "conversation_too_long",
      reply: SECURITY_REJECTION_MESSAGE,
    };
  }

  // Only validate the LAST user message
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (!lastUserMsg) return { safe: true };

  const content = getText(lastUserMsg);
  if (!content.trim()) return { safe: true };

  // Message too long
  if (content.length > 5000) {
    return {
      safe: false,
      reason: "message_too_long",
      reply: SECURITY_REJECTION_MESSAGE,
    };
  }

  // ── Layer 1: Topic enforcement ───────────────────────────────────
  const topicResult = validateTopic(content);
  if (!topicResult.safe) return topicResult;

  // ── Layer 2: Security — prompt injection ─────────────────────────
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `prompt_injection: ${pattern.source.slice(0, 40)}`,
        reply: SECURITY_REJECTION_MESSAGE,
      };
    }
  }

  // ── Layer 3: Security — code injection ───────────────────────────
  for (const pattern of CODE_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `code_injection: ${pattern.source.slice(0, 40)}`,
        reply: SECURITY_REJECTION_MESSAGE,
      };
    }
  }

  // ── Layer 4: Security — unicode tricks ───────────────────────────
  for (const pattern of UNICODE_TRICK_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe: false,
        reason: `unicode_trick: ${pattern.source.slice(0, 40)}`,
        reply: SECURITY_REJECTION_MESSAGE,
      };
    }
  }

  return { safe: true };
}
