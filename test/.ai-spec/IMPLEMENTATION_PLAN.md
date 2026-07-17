# Implementation Plan

## Phase 1: Project Foundation & Redis Connectivity

### Goal
Establish the Node.js project structure, environment configuration, and reliable connectivity to the Redis Presence Store.

### Dependencies
- Node.js runtime (v20+ LTS)
- Redis server instance

### Deliverables
- `package.json`: Configure dependencies (`express`, `ioredis`, `dotenv`, `prom-client`).
- `src/config/redis.ts`: Initialize and export the `ioredis` client instance with connection pooling.
- `src/app.ts`: Basic Express server initialization with health check route.
- `.env.example`: Template for environment variables (REDIS_URL, PORT).

### Definition of Done
- Server starts successfully.
- Application logs "Connected to Redis" on startup.
- `/health` endpoint returns 200 OK.

### Validation
- Run `npm run dev`.
- Verify Redis connection using `docker exec` to the redis container and checking logs.

---

## Phase 2: Discovery API Implementation

### Goal
Implement the core business logic for Android clients to register their presence and retrieve peer lists.

### Dependencies
- Phase 1 (Foundation)

### Deliverables
- `src/services/presenceService.ts`: Logic for setting/getting client keys in Redis with TTL (Time-To-Live).
- `src/routes/register.ts`: POST endpoint to register client ID and IP/metadata.
- `src/routes/heartbeat.ts`: POST endpoint to refresh TTL.
- `src/routes/peers.ts`: GET endpoint to list active clients from Redis.

### Definition of Done
- Registration creates a key in Redis with a 60-second TTL.
- Heartbeat extends the TTL.
- Peer list returns a JSON array of active client IDs.

### Validation
- Use `curl` to POST to `/register` and verify the key exists in Redis via `redis-cli`.
- Verify `/peers` returns the expected list of active IDs.

---

## Phase 3: Infrastructure & Nginx Routing

### Goal
Containerize the application and configure the load balancer to route traffic to the Discovery Service.

### Dependencies
- Phase 2 (Discovery API)

### Deliverables
- `Dockerfile`: Multi-stage build for the Node.js service.
- `nginx/nginx.conf`: Configure upstream blocks and proxy_pass settings for the discovery service.
- `docker-compose.yml`: Orchestrate the Discovery Service, Redis, and Nginx containers.

### Definition of Done
- `docker-compose up` launches all services.
- Nginx correctly proxies requests (e.g., `http://localhost/api/register` -> Service).
- Redis persistence is verified across container restarts.

### Validation
- Perform a request through the Nginx port (e.g., 80) and verify the response matches direct API responses.

---

## Phase 4: Observability & Metrics

### Goal
Expose application metrics and configure the Prometheus/Grafana stack for monitoring.

### Dependencies
- Phase 3 (Infrastructure)

### Deliverables
- `src/metrics/promClient.ts`: Configure `prom-client` and define custom metrics (e.g., `active_clients_total`, `request_duration_seconds`).
- `src/middleware/metrics.ts`: Express middleware to track request rates.
- `prometheus/prometheus.yml`: Config file defining the scrape target for the discovery service.
- `grafana/provisioning/datasources/datasource.yml`: Automated provisioning for Prometheus as a data source.

### Definition of Done
- `/metrics` endpoint exposes Prometheus formatted data.
- Prometheus server successfully scrapes the `/metrics` endpoint.
- Grafana dashboard shows "Active Clients" metric.

### Validation
- Curl `/metrics` and verify content type `text/plain; version=0.0.4`.
- Check Prometheus "Targets" page to ensure the Discovery Service status is `UP`.

---

## Phase 5: Integration & Load Testing

### Goal
Ensure the system handles multiple concurrent registrations and maintains stability under load.

### Dependencies
- Phase 4 (Observability)

### Deliverables
- `tests/integration.test.ts`: Jest/Supertest suite verifying full API lifecycle (Register -> Heartbeat -> List Peers).
- `tests/load.test.js`: Script to simulate 100+ concurrent client registrations to ensure no Redis race conditions.

### Definition of Done
- All integration tests pass.
- Concurrent registration test shows no failed requests.
- Redis memory usage remains stable during load tests.

### Validation
- Run `npm test`.
- Monitor Grafana during the load test to ensure request latency stays within acceptable bounds (< 50ms).

---

## Implementation Order

1.  **Phase 1 (Foundation):** Essential for all subsequent code; cannot build routes without a server or database connection.
2.  **Phase 2 (Discovery API):** The primary value proposition. Depends on Phase 1.
3.  **Phase 3 (Infrastructure):** Required to expose the API to the "Android Clients" mentioned in the architecture. Depends on Phase 2.
4.  **Phase 4 (Observability):** Requires the API to be running to generate metrics. Depends on Phase 3.
5.  **Phase 5 (Testing):** Final validation of the complete system. Depends on all previous phases.

## Risk Areas

- **Redis Key Expiration/Race Conditions:**
    *   *Risk:* Multiple clients registering simultaneously might cause inconsistent state.
    *   *Mitigation:* Use Redis atomic operations (`SET` with `EX` option) for registration.
- **Nginx Proxy Buffering:**
    *   *Risk:* Nginx might buffer responses, causing latency in P2P discovery.
    *   *Mitigation:* Configure `proxy_buffering off` in `nginx.conf` for the discovery routes.
- **Metrics Cardinality:**
    *   *Risk:* If the client ID is used as a label in Prometheus, it will cause high cardinality and crash Prometheus.
    *   *Mitigation:* Only track aggregate metrics (e.g., `total_active_clients`) in Prometheus, not per-client IDs.