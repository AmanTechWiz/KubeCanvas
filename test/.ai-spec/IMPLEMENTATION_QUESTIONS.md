# Implementation Questions

---

## Technology & Platform

### Q1: Confirm Technology Stack and Platform
- **Context:** The architecture diagram specifies Android clients, a Node.js-based Discovery Service, Nginx for load balancing, and a Redis presence store.
- **Question:** Are these technology choices locked, or is there flexibility to change the implementation stack?
- **Why it matters:** Determines the development environment, library selection, and team skillset requirements.
- **Suggested answers:** 
    - "Native Android (Kotlin)"
    - "Cross-platform (Flutter or React Native)"
    - "Node.js (TypeScript)"
    - "Redis (Standalone or Cluster)"
- **Priority:** Required

---

## Authentication

### Q2: Authentication Mechanism
- **Context:** The diagram shows clients registering with the Discovery Service.
- **Question:** How should the Discovery Service verify the identity of an Android client during the registration process?
- **Why it matters:** Ensures that only authorized clients can broadcast their presence or discover other peers.
- **Suggested answers:** ["JWT (JSON Web Tokens)", "API Keys", "OAuth2/OIDC", "Mutual TLS (mTLS)"]
- **Priority:** Required

---

## Authorization

### Q3: Peer Visibility Control
- **Context:** The P2P Link connects Client A to Client B.
- **Question:** Should there be granular permissions for peer discovery (e.g., "public" vs. "private" presence), or is visibility open to all registered clients?
- **Why it matters:** Influences the logic within the Discovery Service and the Redis schema design.
- **Suggested answers:** ["Global visibility (all registered clients)", "Group-based visibility", "Invite-only/Permission-based visibility"]
- **Priority:** Recommended

---

## Data Validation

### Q4: Payload Validation Strategy
- **Context:** The Discovery Service acts as the broker for client metadata.
- **Question:** What strategy will be used to validate the payload structure sent by the Android clients to the Discovery Service?
- **Why it matters:** Prevents malformed data from corrupting the Redis presence store or causing crashes in other clients.
- **Suggested answers:** ["Joi/Zod (Schema validation library)", "Protocol Buffers (Strict typing)", "Custom manual validation"]
- **Priority:** Required

---

## Error Handling

### Q5: P2P Handshake Failure Handling
- **Context:** There is a direct P2P link between clients.
- **Question:** How should the system handle and report failures during the direct P2P link establishment (e.g., NAT traversal issues, timeout)?
- **Why it matters:** Determines the UX for the Android client when a direct connection cannot be established.
- **Suggested answers:** ["Client-side retry logic", "Fallback to relay server", "Graceful failure notification to user"]
- **Priority:** Required

---

## API Design

### Q6: Communication Protocol
- **Context:** Nginx routes traffic to the Discovery Service.
- **Question:** What communication protocol will be used between the Android clients and the Discovery Service?
- **Why it matters:** Affects performance and the implementation of the Nginx load balancer configuration.
- **Suggested answers:** ["REST (HTTP/HTTPS)", "gRPC", "WebSockets (for real-time updates)"]
- **Priority:** Required

### Q7: API Versioning
- **Context:** The Discovery Service will likely evolve over time.
- **Question:** How should we handle API versioning for the Android clients?
- **Why it matters:** Prevents breaking changes for older app versions deployed in the field.
- **Suggested answers:** ["URL path versioning (e.g., /v1/register)", "Header-based versioning", "No versioning (enforce app updates)"]
- **Priority:** Recommended

---

## Database

### Q8: Redis Persistence Strategy
- **Context:** Redis is used as a presence store.
- **Question:** Is the presence data ephemeral (can be lost on restart), or does it need to be persisted to disk?
- **Why it matters:** Dictates Redis configuration (RDB/AOF settings) and impact on recovery time.
- **Suggested answers:** ["Ephemeral (No persistence)", "AOF (Append Only File)", "RDB (Snapshotting)"]
- **Priority:** Required

### Q9: Stale Data Cleanup
- **Context:** Redis presence store.
- **Question:** What is the strategy for removing clients that disconnect abruptly without sending a 'deregister' signal?
- **Why it matters:** Prevents the system from attempting to route P2P connections to offline/stale clients.
- **Suggested answers:** ["Redis TTL (Time-to-Live) on keys", "Heartbeat/Keep-alive mechanism", "Cleanup job (Cron)"]
- **Priority:** Required

---

## Caching

### Q10: Client-Side Caching
- **Context:** Android clients connect to the Discovery Service.
- **Question:** Should the Android client cache the discovery results locally to reduce load on the Discovery Service?
- **Why it matters:** Affects the freshness of the peer list and the complexity of the Android client state management.
- **Suggested answers:** ["No caching (always fetch fresh)", "Time-based local cache", "Cache until explicit refresh"]
- **Priority:** Recommended

---

## Deployment

### Q11: CI/CD Pipeline
- **Context:** Node.js Discovery Service and Android Apps.
- **Question:** What is the preferred CI/CD target environment for the Discovery Service?
- **Why it matters:** Determines the infrastructure-as-code requirements (Docker, Kubernetes, AWS/GCP).
- **Suggested answers:** ["Docker containers (Kubernetes)", "Serverless (AWS Lambda)", "Virtual Machines (EC2/Compute Engine)"]
- **Priority:** Required

### Q12: Secrets Management
- **Context:** Discovery Service and Redis connection.
- **Question:** How will sensitive configuration (e.g., Redis passwords, API tokens) be managed?
- **Why it matters:** Critical for security compliance and environment isolation.
- **Suggested answers:** ["Environment variables", "Secret Manager (AWS/GCP/HashiCorp)", "Local config files (Git-ignored)"]
- **Priority:** Required

---

## Monitoring

### Q13: Alerting Thresholds
- **Context:** Prometheus and Grafana are included.
- **Question:** What are the critical performance indicators (KPIs) that should trigger alerts in Grafana?
- **Why it matters:** Ensures the team is notified before the discovery service becomes unresponsive.
- **Suggested answers:** ["High CPU/Memory usage", "Redis latency spikes", "Error rate > 5%", "Service down"]
- **Priority:** Recommended

---

## Security

### Q14: Transport Security
- **Context:** Android clients communicating via Nginx.
- **Question:** Is HTTPS/TLS mandatory for all communications between the Android client and the Nginx load balancer?
- **Why it matters:** Impacts SSL certificate management and Android Network Security Configuration.
- **Suggested answers:** ["Mandatory TLS", "TLS for production only", "No encryption (internal/test only)"]
- **Priority:** Required

### Q15: Input Sanitization
- **Context:** Discovery Service accepts client metadata.
- **Question:** What is the strategy for sanitizing data passed from Android clients to the Discovery Service to prevent injection attacks?
- **Why it matters:** Critical to prevent malicious data from being stored in Redis or reflected to other clients.
- **Suggested answers:** ["Strict Allow-listing", "Automatic sanitization library (e.g., DOMPurify/validator)", "Manual escaping"]
- **Priority:** Required

---

## Scaling

### Q16: Concurrency Expectations
- **Context:** Discovery Service and Redis.
- **Question:** What is the expected peak number of concurrent clients?
- **Why it matters:** Determines whether we need to scale the Discovery Service horizontally (behind Nginx) or if a single instance is sufficient.
- **Suggested answers:** ["< 100", "100 - 1,000", "1,000 - 10,000", "> 10,000"]
- **Priority:** Recommended

---

## Testing

### Q17: Integration Testing
- **Context:** P2P link and Discovery Service.
- **Question:** How will we simulate the "Direct P2P Link" during integration tests?
- **Why it matters:** Determines the need for mock environments or specialized test harnesses.
- **Suggested answers:** ["Mocking the network layer", "Local loopback testing", "Dedicated staging environment with real devices"]
- **Priority:** Recommended

---

## Platform Ambiguity

### Q18: Android Version Support
- **Context:** Android Client A and B.
- **Question:** What is the minimum Android SDK version we must support?
- **Why it matters:** Affects library compatibility, especially for networking and P2P APIs.
- **Suggested answers:** ["API 26 (Android 8.0)", "API 29 (Android 10.0)", "Latest stable"]
- **Priority:** Required

### Q19: Nginx Configuration
- **Context:** Nginx Load Balancer.
- **Question:** Is the Nginx configuration expected to handle SSL termination, or will that be handled by an upstream cloud load balancer?
- **Why it matters:** Dictates the Nginx configuration complexity and certificate management.
- **Suggested answers:** ["Nginx handles SSL termination", "SSL terminated upstream (Nginx receives plaintext)"]
- **Priority:** Recommended

### Q20: Logging Strategy
- **Context:** Discovery Service.
- **Question:** What level of logging detail is required for the Discovery Service?
- **Why it matters:** Impacts storage costs and the ability to debug production issues.
- **Suggested answers:** ["JSON structured logging", "Plaintext logs", "No logs (only metrics)"]
- **Priority:** Recommended

### Q21: P2P Link Nature
- **Context:** Direct P2P Link.
- **Question:** Is the "Direct P2P Link" expected to be a raw socket, WebRTC, or a higher-level protocol?
- **Why it matters:** Determines the implementation complexity on the Android client side.
- **Suggested answers:** ["WebRTC", "Raw TCP/UDP Sockets", "Bluetooth/Nearby Connections API"]
- **Priority:** Required