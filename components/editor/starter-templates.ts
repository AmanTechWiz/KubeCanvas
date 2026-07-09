import type { NodeShape } from "@/types/canvas";

// ── Template types ─────────────────────────────────────────────────────

export interface TemplateNode {
  id: string;
  label: string;
  shape: NodeShape;
  color: string;
  textColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

// ── Template 1 — Microservices Architecture ────────────────────────────
// 3-tier: API Gateway → Services → Databases

const microservicesTemplate: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description: "API Gateway with service decomposition and dedicated databases",
  nodes: [
    // Tier 1 — Gateway (centered above services)
    { id: "gw", label: "API Gateway", shape: "rectangle", color: "#062822", textColor: "#0AC7B4", x: 312, y: 0, width: 192, height: 128 },
    // Tier 2 — Services
    { id: "auth", label: "Auth Service", shape: "rectangle", color: "#3C1618", textColor: "#FF6166", x: 24, y: 200, width: 192, height: 128 },
    { id: "users", label: "User Service", shape: "rectangle", color: "#10233D", textColor: "#52A8FF", x: 304, y: 200, width: 192, height: 128 },
    { id: "orders", label: "Order Service", shape: "rectangle", color: "#0F2E18", textColor: "#62C073", x: 584, y: 200, width: 192, height: 128 },
    // Tier 3 — Databases
    { id: "auth-db", label: "Auth DB", shape: "cylinder", color: "#1F1F1F", textColor: "#EDEDED", x: 40, y: 420, width: 160, height: 140 },
    { id: "users-db", label: "Users DB", shape: "cylinder", color: "#1F1F1F", textColor: "#EDEDED", x: 320, y: 420, width: 160, height: 140 },
    { id: "orders-db", label: "Orders DB", shape: "cylinder", color: "#1F1F1F", textColor: "#EDEDED", x: 600, y: 420, width: 160, height: 140 },
  ],
  // Vertical flow: gateway bottom → service top, service bottom → database top
  edges: [
    { id: "gw-auth", source: "gw", target: "auth", sourceHandle: "bottom", targetHandle: "top" },
    { id: "gw-users", source: "gw", target: "users", sourceHandle: "bottom", targetHandle: "top" },
    { id: "gw-orders", source: "gw", target: "orders", sourceHandle: "bottom", targetHandle: "top" },
    { id: "auth-authdb", source: "auth", target: "auth-db", sourceHandle: "bottom", targetHandle: "top" },
    { id: "users-usersdb", source: "users", target: "users-db", sourceHandle: "bottom", targetHandle: "top" },
    { id: "orders-ordersdb", source: "orders", target: "orders-db", sourceHandle: "bottom", targetHandle: "top" },
  ],
};

// ── Template 2 — CI/CD Pipeline ────────────────────────────────────────
// Linear flow: Code → Build → Test → Staging → Production
//                        ↘ Security ↗

const cicdPipelineTemplate: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description: "Continuous integration and deployment flow with security scanning",
  nodes: [
    // Main flow (top row)
    { id: "code", label: "Code Push", shape: "rectangle", color: "#0F2E18", textColor: "#62C073", x: 0, y: 100, width: 192, height: 128 },
    { id: "build", label: "Build", shape: "rectangle", color: "#10233D", textColor: "#52A8FF", x: 280, y: 100, width: 192, height: 128 },
    { id: "test", label: "Unit Tests", shape: "hexagon", color: "#2E1938", textColor: "#9500ff", x: 560, y: 100, width: 192, height: 128 },
    { id: "staging", label: "Staging", shape: "rectangle", color: "#331B00", textColor: "#FF990A", x: 880, y: 100, width: 192, height: 128 },
    { id: "deploy", label: "Production", shape: "rectangle", color: "#062822", textColor: "#0AC7B4", x: 1160, y: 136, width: 192, height: 128 },
    // Parallel branch (bottom row)
    { id: "security", label: "Security Scan", shape: "diamond", color: "#3C1618", textColor: "#FF6166", x: 560, y: 320, width: 192, height: 160 },
  ],
  // Horizontal flow: code right → build left, build right → test left & security left
  // Test right → staging left (top), security right → staging left (bottom)
  // Staging right → production left
  edges: [
    { id: "code-build", source: "code", target: "build", sourceHandle: "right", targetHandle: "left" },
    { id: "build-test", source: "build", target: "test", sourceHandle: "right", targetHandle: "left" },
    { id: "build-security", source: "build", target: "security", sourceHandle: "bottom", targetHandle: "top" },
    { id: "test-staging", source: "test", target: "staging", sourceHandle: "right", targetHandle: "left" },
    { id: "security-staging", source: "security", target: "staging", sourceHandle: "right", targetHandle: "left" },
    { id: "staging-deploy", source: "staging", target: "deploy", sourceHandle: "right", targetHandle: "left" },
  ],
};

// ── Template 3 — Event-Driven System ───────────────────────────────────
// Producers → Event Bus → Consumers

const eventDrivenTemplate: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven",
  description: "Central event bus with producers and consumers pattern",
  nodes: [
    // Producers (left column)
    { id: "producer-a", label: "Producer A", shape: "rectangle", color: "#10233D", textColor: "#52A8FF", x: 0, y: 0, width: 192, height: 128 },
    { id: "producer-b", label: "Producer B", shape: "rectangle", color: "#2E1938", textColor: "#9500ff", x: 0, y: 200, width: 192, height: 128 },
    { id: "producer-c", label: "Producer C", shape: "rectangle", color: "#3A1726", textColor: "#ff2e70", x: 0, y: 400, width: 192, height: 128 },
    // Event Bus (center)
    { id: "event-bus", label: "Event Bus", shape: "circle", color: "#062822", textColor: "#0AC7B4", x: 340, y: 190, width: 140, height: 140 },
    // Consumers (right column)
    { id: "consumer-1", label: "Consumer 1", shape: "rectangle", color: "#331B00", textColor: "#FF990A", x: 620, y: 0, width: 192, height: 128 },
    { id: "consumer-2", label: "Consumer 2", shape: "rectangle", color: "#0F2E18", textColor: "#62C073", x: 620, y: 200, width: 192, height: 128 },
    { id: "consumer-3", label: "Consumer 3", shape: "rectangle", color: "#1F1F1F", textColor: "#EDEDED", x: 620, y: 400, width: 192, height: 128 },
  ],
  // Left-to-right flow: producer right → bus left, bus right → consumer left
  edges: [
    { id: "pa-bus", source: "producer-a", target: "event-bus", sourceHandle: "right", targetHandle: "left" },
    { id: "pb-bus", source: "producer-b", target: "event-bus", sourceHandle: "right", targetHandle: "left" },
    { id: "pc-bus", source: "producer-c", target: "event-bus", sourceHandle: "right", targetHandle: "left" },
    { id: "bus-c1", source: "event-bus", target: "consumer-1", sourceHandle: "right", targetHandle: "left" },
    { id: "bus-c2", source: "event-bus", target: "consumer-2", sourceHandle: "right", targetHandle: "left" },
    { id: "bus-c3", source: "event-bus", target: "consumer-3", sourceHandle: "right", targetHandle: "left" },
  ],
};

// ── All templates ──────────────────────────────────────────────────────

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservicesTemplate,
  cicdPipelineTemplate,
  eventDrivenTemplate,
];
