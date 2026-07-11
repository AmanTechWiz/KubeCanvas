Architecture validation engine. A "Validate" button on the canvas toolbar that
checks the diagram for common infrastructure anti-patterns and returns a
categorized issue list (Critical vs Warning) with an overall health score
(0–100). If nodes can't be classified, the validator refuses to run and
tells the user to improve their labels.

## Prerequisites

The canvas toolbar is `components/editor/canvas-controls.tsx` — a floating
pill bar at the bottom-center with zoom and undo/redo groups. The validator
button goes in a new third group to the right of the history controls.

The canvas graph is available via `useReactFlow().getNodes()` and
`useReactFlow().getEdges()`. All validation runs client-side — no LLM calls,
no API routes, no external services.

## Detection Model

**Shape and color are aesthetic choices, not semantic declarations.** A user
can draw a database as a green rectangle, a pink circle, or a blue hexagon.
The validator cannot guess a node's role from its appearance.

Instead, detection uses **logo first, label second**:

1. If a node has a `logo` matching a known technology → classified
2. If a node's `label` contains a recognizable technology name → classified
3. Otherwise → unclassified

A node is classified into one of these roles: `database`, `cache`, `queue`,
`auth`, `entry`, `gateway`, `service`, `observability`, `cicd`.

### Classification Rules

```ts
const CLASSIFIERS = {
  database: {
    logos: ["postgresql", "mysql", "mongodb", "dynamodb", "cassandra",
            "mariadb", "sqlite", "cockroachdb", "timescaledb", "supabase"],
    keywords: ["database", "db", "postgres", "mysql", "mongo", "sql",
               "primary", "replica", "datastore", "data store"],
  },
  cache: {
    logos: ["redis", "memcached", "dragonfly"],
    keywords: ["cache", "redis", "memcached", "session store", "cdn"],
  },
  queue: {
    logos: ["rabbitmq", "kafka", "sqs", "sns", "nats", "pulsar", "pubsub"],
    keywords: ["queue", "event", "bus", "stream", "topic", "broker",
               "message queue", "event bus"],
  },
  auth: {
    logos: ["clerk", "auth0", "okta", "keycloak", "firebase-auth"],
    keywords: ["auth", "oauth", "jwt", "token", "login", "identity",
               "sso", "rbac", "authentication", "authorization"],
  },
  entry: {
    logos: [],
    keywords: ["client", "user", "browser", "webhook", "scheduler",
               "mobile", "app", "external request"],
  },
  gateway: {
    logos: ["nginx", "cloudflare", "cloudfront", "traefik", "haproxy"],
    keywords: ["gateway", "load balancer", "proxy", "router", "ingress",
               "edge", "cdn"],
  },
  observability: {
    logos: ["grafana", "prometheus", "sentry", "datadog", "newrelic",
            "cloudwatch", "opentelemetry"],
    keywords: ["monitor", "observ", "logging", "trace", "metrics",
               "alerting", "dashboard"],
  },
  cicd: {
    logos: ["github-actions", "gitlab", "jenkins", "argocd", "circleci",
            "travis"],
    keywords: ["ci/cd", "pipeline", "deploy", "build", "release",
               "continuous"],
  },
}
```

Detection logic:
1. Check `node.data.logo` against the logo list (case-insensitive)
2. Check `node.data.label` against the keyword list (case-insensitive)
3. If neither matches → node is `unclassified`

## Validation Gate

**Before running any rules, classify every node.**

- If ALL nodes are classified → run full validation
- If ANY node is unclassified → stop. Do not run rules. Show a message:

> ⚠️ **Can't validate yet**
>
> X nodes have unrecognized names or missing logos:
> - "A", "thing", "svc"
>
> Add technology logos or descriptive labels (e.g. "PostgreSQL",
> "Redis Cache", "Auth Service") so the validator knows what each
> component is.

This is honest. If the validator doesn't know what a node is, it can't
safely check rules against it. A wrong guess is worse than no result.

## Implementation

### 1. Add "Validate" button to canvas controls

In `components/editor/canvas-controls.tsx`:

- Add a third button group to the right of the undo/redo group, separated by
  the same thin divider (`bg-white/12%`)
- Single button: a shield/check icon (lucide `ShieldCheck` or `BadgeCheck`)
- Same styling as existing buttons: 7×7 rounded-md, white/60%, brighten on hover
- On click, read all nodes and edges from React Flow and run the classifier
- If any node is unclassified → show the "Can't validate yet" message in
  the results panel (no score, no rules)
- If all classified → run the validator and show results
- Store results in component state — no new route needed
- Show a subtle badge on the button when issues are found (e.g. red dot with
  count)

### 2. Create the validator module

Create `lib/validate-canvas.ts` with two functions:

```ts
// Step 1: Classify every node
function classifyNodes(nodes: Node[]): Map<string, { role: string; source: "logo" | "label" }>

// Step 2: Run rules on classified nodes
function validateCanvas(nodes: Node[], edges: Edge[]): ValidationResult
```

`ValidationResult`:

```ts
type ValidationResult =
  | { status: "unclassifiable"; unclassifiedNodes: Array<{ id: string; label: string }> }
  | { status: "valid"; score: number; issues: ValidationIssue[] }
```

`ValidationIssue`:

```ts
interface ValidationIssue {
  id: string
  severity: "critical" | "warning"
  category: string
  message: string
  affectedNodeIds: string[]
}
```

### 3. Implement the rule set

All rules operate on **classified nodes only**. Every node referenced
below (e.g. "database", "entry point", "auth") was classified by logo
or label — never by shape or color.

**Critical rules (−15 points each):**

1. **Single point of failure** — Only one `database` node exists and it
   has incoming edges from 3+ other classified nodes. Message: "Single
   database instance — no redundancy. Consider a replica or failover."
   Affected nodes: the database node.

2. **Direct internet exposure** — An `entry` node connects directly to a
   `service` node with no `gateway` node in the path. Check: walk edges
   from entry nodes. If any path reaches a service without passing through
   a gateway → flag. Message: "Service directly exposed — add a gateway
   or load balancer." Affected nodes: the entry node and the exposed
   service node.

3. **No auth boundary** — An `entry` node reaches a `service` node
   without any `auth` node anywhere in the path. Check: BFS from every
   entry node. If a service is reachable without touching an auth node →
   flag. Message: "No authentication boundary detected between entry and
   service layer." Affected nodes: the entry node and the first
   unauthenticated service.

**Warning rules (−5 points each):**

4. **Missing caching layer** — A `database` node has 3+ incoming edges
   from `service` nodes with no `cache` node in the path between any
   service and the database. Message: "High-read database without a
   caching layer. Consider adding Redis or Memcached." Affected nodes:
   the database node and its direct service dependents.

5. **No async communication** — Total classified nodes ≥ 5 and no `queue`
   node exists anywhere in the graph. Message: "All communication is
   synchronous. Consider a message queue for long-running operations."
   Affected nodes: none (graph-level warning).

6. **No observability** — No `observability` node exists in the graph.
   Message: "No observability layer. Add monitoring (Datadog, Grafana,
   etc.)." Affected nodes: none (graph-level warning).

7. **No CI/CD** — No `cicd` node exists in the graph. Message: "No CI/CD
   pipeline represented. Add deployment automation." Affected nodes: none
   (graph-level warning).

8. **No backup strategy** — A `database` node has no outbound edge to
   another `database` node. Message: "Stateful node has no backup or
   replication target." Affected nodes: the database node.

### 4. Score calculation

```
Start:  100
Critical (rules 1–3):  −15 each
Warning  (rules 4–8):  −5 each
Floor:  0
```

### 5. Create the results panel

Two states for the panel — same glassmorphism container (`bg-black/60
backdrop-blur-xl border-white/[0.08] rounded-2xl`), different content:

**State A: Unclassifiable nodes**

- Header: "⚠️ Validation Paused"
- Body: list of unclassified node labels
- Explanation: "Add technology logos or descriptive labels so the
  validator can analyze your architecture."
- Close button

**State B: Full results**

- Header: "Architecture Health" + score badge
  - Green: score ≥ 80
  - Yellow: score 50–79
  - Red: score < 50
- Issue list: each issue shows
  - Severity dot (red for critical, yellow for warning)
  - Category label (e.g. "Single Point of Failure")
  - Message text
  - Affected node labels
- Clicking an issue → select those nodes on canvas (`selected: true`)
  and `fitView()` to center on them
- "Re-validate" button to re-run after fixes
- Close button (X) to dismiss

### 6. Wire into canvas-editor.tsx

Pass `reactFlowInstance` from the React Flow `onInit` callback into
`ReactFlowControls` so the validator can read nodes/edges and focus
on issues.

## Scope Limits

- no cost estimation — rules are structural only, no pricing APIs
- no infrastructure-as-code generation
- no LLM calls — pure graph traversal logic
- no external API calls — everything runs in the browser
- no persistent storage of validation results — transient state only
- no partial validation — if any node is unclassified, refuse to validate
- no shape/color-based detection — only logo and label
- don't redesign the existing toolbar — just extend it with one new group
- don't add node tagging or metadata fields

## Check When Done

- "Validate" button appears in canvas controls toolbar
- Clicking it with vague labels shows "Can't validate yet" message
- Clicking it with all nodes classified shows full results
- Score is displayed with color coding
- Issues list shows severity, message, and affected nodes
- Clicking an issue focuses the canvas on those nodes
- Re-validate button works after moving/adding/removing nodes
- Close button dismisses the panel
- All 8 rules produce correct results on classified diagrams
- `bun run build` passes
