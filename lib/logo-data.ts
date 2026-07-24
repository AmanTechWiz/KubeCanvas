import type { IconName } from "tech-stack-icons";

// ── Logo category type ─────────────────────────────────────────────────
export interface LogoDefinition {
  id: string;
  label: string;
  /** tech-stack-icons package name (null = custom/fallback) */
  icon: IconName | null;
  /** Inline SVG markup for icons not in tech-stack-icons */
  customSvg?: string;
}

export interface LogoCategory {
  id: string;
  label: string;
  icons: LogoDefinition[];
}

// ── Category definitions ──────────────────────────────────────────────
export const LOGO_CATEGORIES: LogoCategory[] = [
  {
    id: "cloud",
    label: "Cloud",
    icons: [
      { id: "aws", label: "AWS", icon: "aws" },
      { id: "google-cloud", label: "Google Cloud", icon: "gcloud" },
      { id: "azure", label: "Azure", icon: "azure" },
      { id: "cloudflare", label: "Cloudflare", icon: "cloudflare" },
      { id: "vercel", label: "Vercel", icon: "vercel" },
      { id: "netlify", label: "Netlify", icon: "netlify" },
      { id: "ec2", label: "EC2", icon: "ec2" },
      { id: "kong", label: "Kong", icon: null, customSvg: "<svg role='img' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path fill='currentColor' d='M7.88 18.96h4.405l2.286 2.876-.393.979h-5.69l.139-.979-1.341-2.117.594-.759Zm3.152-12.632 2.36-.004L24 18.97l-.824 3.845h-4.547l.283-1.083L99.912l2.032-3.584Zm4.17-5.144 4.932 3.876-.632.651.855 1.191v1.273l-2.458 2.004-4.135-4.884h-2.407l.969-1.777 2.876-2.334ZM4.852 13.597l3.44-2.989 4.565 5.494-1.296 2.012h-4.21l-2.912 3.822-.665.879H0v-4.689l3.517-4.529h1.335Z'/></svg>" },

    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    icons: [
      { id: "react", label: "React", icon: "react" },
      { id: "nextjs", label: "Next.js", icon: "nextjs" },
      { id: "angular", label: "Angular", icon: "angular" },
      { id: "vue", label: "Vue.js", icon: "vuejs" },
      { id: "svelte", label: "Svelte", icon: "sveltejs" },
      { id: "typescript", label: "TypeScript", icon: "typescript" },
      { id: "tailwindcss", label: "Tailwind CSS", icon: "tailwindcss" },
      { id: "vite", label: "Vite", icon: "vitejs" },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    icons: [
      { id: "nodejs", label: "Node.js", icon: "nodejs" },
      { id: "express", label: "Express", icon: "expressjs" },
      { id: "nestjs", label: "NestJS", icon: "nestjs" },
      { id: "fastapi", label: "FastAPI", icon: null, customSvg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><path d='M56.813 127.586c-1.903-.227-3.899-.52-4.434-.652a48.078 48.078 0 00-2.375-.5 36.042 36.042 0 01-2.703-.633c-4.145-1.188-4.442-1.285-7.567-2.563-2.875-1.172-8.172-3.91-9.984-5.156-.496-.344-.96-.621-1.031-.621-.07 0-1.23-.816-2.578-1.813-8.57-6.343-15.004-14.043-19.653-23.527-.8-1.629-1.453-3.074-1.453-3.21 0-.134-.144-.505-.32-.817-.363-.649-.88-2.047-1.297-3.492a20.047 20.047 0 00-.625-1.813c-.195-.46-.352-1.02-.352-1.246 0-.227-.195-.965-.433-1.645-.238-.675-.43-1.472-.43-1.77 0-.296-.187-1.32-.418-2.276C.598 73.492 0 67.379 0 63.953c0-3.422.598-9.535 1.16-11.894.23-.957.418-2 .418-2.32 0-.321.145-.95.32-1.4.18-.448.41-1.253.516-1.788.11-.535.36-1.457.563-2.055l.59-1.726c.433-1.293.835-2.387 1.027-2.813.11-.238.539-1.21.957-2.16.676-1.535 2.125-4.43 2.972-5.945.309-.555.426-.739 2.098-3.352 2.649-4.148 7.176-9.309 11.39-12.988 1.485-1.297 6.446-5.063 6.669-5.063.062 0 .53-.281 1.043-.625 1.347-.902 2.668-1.668 4.39-2.531a53.06 53.06 0 001.836-.953c.285-.164.82-.41 3.567-1.64.605-.27 1.257-.516 3.136-1.173.414-.144 1.246-.449 1.84-.672.598-.222 1.301-.406 1.563-.406.258 0 .937-.18 1.508-.402.57-.223 1.605-.477 2.304-.563.696-.082 1.621-.277 2.055-.43.43-.148 1.61-.34 2.621-.425a72.572 72.572 0 003.941-.465c2.688-.394 8.532-.394 11.192 0a75.02 75.02 0 003.781.445c.953.079 2.168.278 2.703.442.535.16 1.461.36 2.055.433.594.079 1.594.325 2.222.551.63.23 1.344.414 1.59.414s.754.137 1.125.309c.375.168 1.168.449 1.766.625.594.18 1.613.535 2.27.797.652.261 1.527.605 1.945.761.77.29 6.46 3.137 7.234 3.622 6.281 3.917 9.512 6.476 13.856 10.964 5.238 5.414 8.715 10.57 12.254 18.16.25.536.632 1.329.851 1.758.215.434.395.942.395 1.13 0 .19.18.76.402 1.269.602 1.383 1.117 2.957 1.36 4.16.12.59.343 1.32.495 1.621.153.3.332 1.063.403 1.688.07.624.277 1.648.453 2.269 1.02 3.531 1.527 13.934.91 18.535-.183 1.367-.39 3.02-.46 3.672-.118 1.117-.708 4.004-1.212 5.945l-.52 2.055c-.98 3.957-3.402 9.594-6.359 14.809-1.172 2.07-5.101 7.668-5.843 8.324-.067.058-.399.45-.735.863-.336.418-1.414 1.586-2.39 2.594-4.301 4.441-7.77 7.187-13.86 10.969-.722.449-6.847 3.441-7.992 3.906-.594.238-1.586.64-2.203.89-.613.247-1.297.454-1.512.458-.215.003-.781.195-1.258.425-.476.23-1.082.422-1.351.426-.266.004-1.043.192-1.727.418-.683.23-1.633.477-2.11.55-.476.075-1.495.278-2.269.45-.773.172-3.11.508-5.187.746a59.06 59.06 0 01-13.945-.031zm4.703-12.5c.3-.234.609-.7.691-1.027.18-.723 29.234-58.97 29.781-59.7.461-.617.504-1.605.082-1.953-.222-.187-3.004-.246-10.43-.234-5.57.012-10.253.016-10.406.012-.226-.008-.273-3.73-.25-19.672.016-10.817-.035-19.766-.113-19.89-.078-.126-.383-.227-.68-.227-.418 0-.613.18-.87.808-.485 1.168-1.825 3.82-8.348 16.485a3554.569 3554.569 0 00-4.055 7.89c-1.156 2.262-2.98 5.813-4.047 7.89a8751.248 8751.248 0 00-8.598 16.759c-4.933 9.636-5.53 10.785-5.742 11.039-.41.496-.633 1.64-.402 2.07.21.394.629.41 11.043.394 5.953-.007 10.863.024 10.914.07.137.141.086 37.31-.055 38.196-.093.582-.031.89.235 1.156.46.461.586.457 1.25-.066zm0 0' fill='currentColor'/></svg>" },
      { id: "django", label: "Django", icon: "django" },
      { id: "spring", label: "Spring Boot", icon: "spring" },
      { id: "go", label: "Go", icon: "go" },
      { id: "rust", label: "Rust", icon: "rust" },
      { id: "bun", label: "Bun", icon: "bunjs" },
      { id: "graphql", label: "GraphQL", icon: "graphql" },
    ],
  },
  {
    id: "database",
    label: "Database",
    icons: [
      { id: "postgresql", label: "PostgreSQL", icon: "postgresql" },
      { id: "mysql", label: "MySQL", icon: "mysql" },
      { id: "mongodb", label: "MongoDB", icon: "mongodb" },
      { id: "redis", label: "Redis", icon: "redis" },
      { id: "firebase", label: "Firebase", icon: "firebase" },
      { id: "supabase", label: "Supabase", icon: "supabase" },
      { id: "sqlite", label: "SQLite", icon: "sqlite" },

    ],
  },
  {
    id: "auth",
    label: "Auth",
    icons: [
      { id: "clerk", label: "Clerk", icon: "clerk" },
      { id: "auth0", label: "Auth0", icon: "auth0" },
      { id: "firebase-auth", label: "Firebase Auth", icon: "firebase" },
      { id: "oauth", label: "OAuth", icon: "oauth" },

    ],
  },
  {
    id: "ai",
    label: "AI",
    icons: [
      { id: "openai", label: "OpenAI", icon: "openai" },
      { id: "anthropic", label: "Anthropic", icon: "anthropic" },
      { id: "google-ai", label: "Gemini", icon: "gemini" },
      { id: "huggingface", label: "Hugging Face", icon: "huggingface" },
      { id: "langchain", label: "LangChain", icon: "langchain" },
      { id: "ollama", label: "Ollama", icon: "ollama" },
      { id: "vercel-ai", label: "Vercel AI", icon: "vercel" },
      { id: "tensorflow", label: "TensorFlow", icon: "tensorflow" },
      { id: "pytorch", label: "PyTorch", icon: "pytorch" },
    ],
  },
  {
    id: "messaging",
    label: "Messaging",
    icons: [

      { id: "kafka", label: "Kafka", icon: null, customSvg: "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMidYMid' viewBox='0 0 256 416'><path fill='currentColor' d='M201.816 230.216c-16.186 0-30.697 7.171-40.634 18.461l-25.463-18.026c2.703-7.442 4.255-15.433 4.255-23.797 0-8.219-1.498-16.076-4.112-23.408l25.406-17.835c9.936 11.233 24.409 18.365 40.548 18.365 29.875 0 54.184-24.305 54.184-54.184s-24.309-54.184-54.184-54.184-54.184 24.305-54.184 54.184c0 5.348.808 10.505 2.258 15.389l-25.423 17.844c-10.62-13.175-25.911-22.374-43.333-25.182v-30.64c24.544-5.155 43.037-26.962 43.037-53.019C124.171 24.305 99.862 0 69.987 0S15.803 24.305 15.803 54.184c0 25.708 18.014 47.246 42.067 52.769v31.038C25.044 143.753 0 172.401 0 206.854c0 34.621 25.292 63.374 58.355 68.94v32.774c-24.299 5.341-42.552 27.011-42.552 52.894 0 29.879 24.309 54.184 54.184 54.184s54.184-24.305 54.184-54.184c0-25.883-18.253-47.553-42.552-52.894v-32.775a69.97 69.97 0 0 0 42.6-24.776l25.633 18.143c-1.423 4.84-2.22 9.946-2.22 15.24 0 29.879 24.309 54.184 54.184 54.184S256 314.279 256 284.4s-24.309-54.184-54.184-54.184m0-126.695c14.487 0 26.27 11.788 26.27 26.271s-11.783 26.27-26.27 26.27-26.27-11.787-26.27-26.27 11.783-26.271 26.27-26.271m-158.1-49.337c0-14.483 11.784-26.27 26.271-26.27s26.27 11.787 26.27 26.27-11.783 26.27-26.27 26.27-26.271-11.787-26.271-26.27m52.541 307.278c0 14.483-11.783 26.27-26.27 26.27s-26.271-11.787-26.271-26.27 11.784-26.27 26.271-26.27 26.27 11.787 26.27 26.27m-26.272-117.97c-20.205 0-36.642-16.434-36.642-36.638 0-20.205 16.437-36.642 36.642-36.642 20.204 0 36.641 16.437 36.641 36.642 0 20.204-16.437 36.638-36.641 36.638m131.831 67.179c-14.487 0-26.27-11.788-26.27-26.271s11.783-26.27 26.27-26.27 26.27 11.787 26.27 26.27-11.783 26.271-26.27 26.271'/></svg>" },
      { id: "rabbitmq", label: "RabbitMQ", icon: "rabbitmq" },
      { id: "redis-pubsub", label: "Redis Pub/Sub", icon: "redis" },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icons: [
      { id: "grafana", label: "Grafana", icon: "grafana" },
      { id: "prometheus", label: "Prometheus", icon: "prometheus" },
      { id: "sentry", label: "Sentry", icon: "sentry" },
      { id: "datadog", label: "Datadog", icon: "datadog" },
      { id: "newrelic", label: "New Relic", icon: "newrelic" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icons: [
      { id: "stripe", label: "Stripe", icon: "stripe" },

    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icons: [
      { id: "twilio", label: "Twilio", icon: "twilio" },
      { id: "resend", label: "Resend", icon: "resend" },

    ],
  },
  {
    id: "devops",
    label: "DevOps",
    icons: [
      { id: "docker", label: "Docker", icon: "docker" },
      { id: "kubernetes", label: "Kubernetes", icon: "kubernetes" },
      { id: "terraform", label: "Terraform", icon: "terraform" },
    ],
  },
  {
    id: "search",
    label: "Search",
    icons: [
      { id: "elasticsearch", label: "Elasticsearch", icon: "elastic" },
    ],
  },
  {
    id: "realtime",
    label: "Realtime",
    icons: [
      { id: "socketio", label: "Socket.IO", icon: "socketio" },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icons: [
      { id: "github", label: "GitHub", icon: "github" },
      { id: "figma", label: "Figma", icon: "figma" },
      { id: "gitlab", label: "GitLab", icon: "gitlab" },
      { id: "bitbucket", label: "Bitbucket", icon: "bitbucket" },
    ],
  },
  {
    id: "networking",
    label: "Networking",
    icons: [
      { id: "nginx", label: "Nginx", icon: "nginx" },
    ],
  },
  {
    id: "other",
    label: "Other",
    icons: [
      { id: "git", label: "Git", icon: "git" },
      { id: "linux", label: "Linux", icon: "linux" },
      { id: "bash", label: "Bash", icon: "bash" },
      { id: "webpack", label: "Webpack", icon: "webpack" },
      { id: "pnpm", label: "pnpm", icon: "pnpm" },
    ],
  },
];

// ── Logo drag payload ─────────────────────────────────────────────────
export interface LogoDragPayload {
  logoId: string;
  label: string;
  icon: string;
  customSvg?: string;
}

export function serializeLogoDrag(payload: LogoDragPayload): string {
  return JSON.stringify(payload);
}

export interface LogoDragToCanvas {
  icon: string;
  label: string;
  w: number;
  h: number;
  customSvg?: string;
}

export function serializeLogoDragToCanvas(payload: LogoDragToCanvas): string {
  return JSON.stringify(payload);
}

export function parseLogoDragToCanvas(raw: string): LogoDragToCanvas | null {
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      typeof data.icon === "string" &&
      typeof data.label === "string" &&
      typeof data.w === "number" &&
      typeof data.h === "number"
    ) {
      return data as LogoDragToCanvas;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseLogoDrag(raw: string): LogoDragPayload | null {
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      typeof data.logoId === "string" &&
      typeof data.label === "string" &&
      typeof data.icon === "string"
    ) {
      return data as LogoDragPayload;
    }
    return null;
  } catch {
    return null;
  }
}

const ICON_SHAPE_MAP: Record<string, "rectangle" | "diamond" | "circle" | "cylinder" | "hexagon"> = {
  aws: "hexagon",
  "google-cloud": "hexagon",
  azure: "hexagon",
  cloudflare: "hexagon",
  vercel: "hexagon",
  netlify: "hexagon",
  ec2: "hexagon",
  nodejs: "rectangle",
  express: "rectangle",
  nestjs: "rectangle",
  fastapi: "rectangle",
  django: "rectangle",
  spring: "rectangle",
  go: "rectangle",
  rust: "rectangle",
  bun: "rectangle",
  graphql: "rectangle",
  react: "rectangle",
  nextjs: "rectangle",
  angular: "rectangle",
  vuejs: "rectangle",
  sveltejs: "rectangle",
  typescript: "rectangle",
  tailwindcss: "rectangle",
  vitejs: "rectangle",
  postgresql: "cylinder",
  mysql: "cylinder",
  mongodb: "cylinder",
  redis: "cylinder",
  firebase: "cylinder",
  supabase: "cylinder",
  sqlite: "cylinder",
  clerk: "rectangle",
  auth0: "rectangle",
  oauth: "rectangle",
  openai: "hexagon",
  anthropic: "hexagon",
  gemini: "hexagon",
  huggingface: "hexagon",
  langchain: "hexagon",
  ollama: "hexagon",
  tensorflow: "hexagon",
  pytorch: "hexagon",
  kafka: "hexagon",
  rabbitmq: "hexagon",
  "redis-pubsub": "hexagon",
  twilio: "hexagon",
  resend: "hexagon",
  grafana: "hexagon",
  prometheus: "hexagon",
  sentry: "hexagon",
  datadog: "hexagon",
  newrelic: "hexagon",
  stripe: "hexagon",
  docker: "hexagon",
  kubernetes: "hexagon",
  terraform: "hexagon",
  nginx: "hexagon",
  git: "rectangle",
  linux: "rectangle",
  bash: "rectangle",
  webpack: "rectangle",
  pnpm: "rectangle",
  github: "hexagon",
  figma: "hexagon",
  gitlab: "hexagon",
  bitbucket: "hexagon",
  elastic: "hexagon",
  socketio: "hexagon",
};

export function logoShapeForIcon(icon: string): "rectangle" | "diamond" | "circle" | "cylinder" | "hexagon" {
  return ICON_SHAPE_MAP[icon] ?? "rectangle";
}
