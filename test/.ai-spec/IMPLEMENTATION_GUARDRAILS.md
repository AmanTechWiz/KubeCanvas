# Implementation Guardrails

> **Instructions for the coding agent:** These rules are absolute. Do not violate any guardrail without explicit developer approval. If a guardrail conflicts with a suggested pattern, the guardrail wins.

---

## Ownership

### Rules
- `discovery-service` owns all client registration logic and service discovery state.
- `redis-presence` is the exclusive source of truth for client presence state; no other data store may be used for this purpose.
- `nginx-lb` owns the external interface for all client traffic; no client-to-backend communication may bypass this node.

## Allowed Communication Paths

### Rules
- Android Clients → `nginx-lb`: All communication from clients to the backend must be routed exclusively through `nginx-lb`.
- `discovery-service` → `redis-presence`: Only `discovery-service` is authorized to perform read/write operations on `redis-presence`.
- `grafana` → `prometheus`: `grafana` must only query `prometheus` for metrics; it is forbidden from querying `discovery-service` or `redis-presence`.

## Forbidden Dependencies

### Rules
- Android Clients must NEVER initiate direct connections to `discovery-service` or `redis-presence`.
- `discovery-service` must never initiate or participate in the direct P2P link between clients; it only facilitates the discovery phase.
- Do not introduce direct database dependencies between `discovery-service` and any storage other than `redis-presence`.

## Technology Constraints

### Rules
- `discovery-service` must be implemented in Node.js.
- Do not introduce additional persistent storage technologies; `redis-presence` is the only allowed state store.
- Metrics ingestion must utilize `prometheus` exclusively.

## Data Constraints

### Rules
- Presence state must NEVER be persisted in the local memory of `discovery-service`; all state must be offloaded to `redis-presence`.
- Client registration metadata stored in Redis must utilize appropriate TTLs to ensure stale entries are automatically evicted.

## Security Constraints

### Rules
- `nginx-lb` must perform all TLS termination for incoming client connections.
- Access to `prometheus` and `grafana` management endpoints must be strictly restricted to internal networks or VPNs.

## Performance Constraints

### Rules
- `discovery-service` registration endpoints must maintain a latency of < 50ms (p99).
- `redis-presence` operations must be optimized to ensure O(1) complexity for presence lookups.

---

## Override Protocol

If any guardrail conflicts with the developer's explicit instruction:
1. Follow the developer's instruction.
2. Log the guardrail violation.
3. Note the override in commit messages.