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
      { id: "fastapi", label: "FastAPI", icon: "fastgpt" },
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
