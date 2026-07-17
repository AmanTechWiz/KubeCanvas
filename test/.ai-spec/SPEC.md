# Architecture Specification

## Executive Summary
This system facilitates peer-to-peer (P2P) signaling and presence management for Android clients. The architecture decouples the control plane (signaling and discovery) from the data plane (direct P2P communication) to minimize latency and offload traffic from backend infrastructure. Key decisions include using a centralized Redis instance for ephemeral state management and an Nginx-backed Node.js service for scalable request routing.

## Architecture Overview
The system operates on a hybrid model where a centralized signaling layer mediates connection metadata, while the actual data transfer occurs directly between clients. Android clients interact with the Discovery Service via an Nginx Load Balancer to register their presence and query peer connection details. Once the signaling handshake completes, the clients bypass the backend to establish a direct P2P link.

## Components

### Android Clients
- **Purpose**: Act as endpoints for P2P communication.
- **Responsibilities**: Perform NAT traversal, register presence with the Discovery Service, query for peer availability, and manage direct socket connections with other clients.
- **Technologies**: Android SDK, WebRTC/Socket implementation.
- **Interfaces**: Communicates with Nginx (HTTP/gRPC) for signaling; communicates with peers via direct P2P socket (TCP/UDP).

### Nginx Load Balancer
- **Purpose**: Serve as the entry point and traffic distributor for the backend.
- **Responsibilities**: Terminate SSL connections, perform load balancing across Discovery Service instances, and enforce rate limiting.
- **Technologies**: Nginx.
- **Interfaces**: Receives traffic from Android Clients; forwards requests to Discovery Service.

### Discovery Service
- **Purpose**: Manage session state and facilitate peer discovery.
- **Responsibilities**: Validate client registration, update Redis with presence metadata, handle peer lookup requests, and expose telemetry metrics.
- **Technologies**: Node.js.
- **Interfaces**: Receives requests from Nginx; performs CRUD operations on Redis; exposes `/metrics` endpoint to Prometheus.

### Redis Presence Store
- **Purpose**: Maintain ephemeral session state.
- **Responsibilities**: Store active client connection data; enforce TTL (Time-to-Live) policies to automatically expire stale sessions.
- **Technologies**: Redis.
- **Interfaces**: Accessed by Discovery Service via Redis protocol.

### Prometheus & Grafana
- **Purpose**: Provide observability and system health monitoring.
- **Responsibilities**: Prometheus scrapes metrics from the Discovery Service; Grafana visualizes performance trends and connection throughput.
- **Technologies**: Prometheus, Grafana.
- **Interfaces**: Prometheus pulls metrics from Discovery Service; Grafana queries Prometheus via PromQL.

## Data Flow

1.  **Signaling/Registration Flow (Sync)**:
    *   Client sends a registration request to Nginx.
    *   Nginx routes the request to the Discovery Service.
    *   Discovery Service validates the request and writes presence data to Redis.
2.  **Peer Discovery Flow (Sync)**:
    *   Client queries the Discovery Service for a target peer's connection metadata.
    *   Discovery Service retrieves the metadata from Redis and returns it to the client.
3.  **Data Plane Flow (Async/Direct)**:
    *   Clients establish a direct P2P link using the metadata exchanged during the signaling phase. All subsequent data transfer bypasses the backend infrastructure.
4.  **Observability Flow (Async)**:
    *   Discovery Service exposes metrics.
    *   Prometheus scrapes these metrics periodically.
    *   Grafana renders the data from Prometheus on dashboards.

## Technologies

| Component | Technology | Role |
| :--- | :--- | :--- |
| Load Balancer | Nginx | Traffic distribution & SSL termination |
| Signaling Service | Node.js | Business logic & peer coordination |
| Presence Store | Redis | Ephemeral session storage |
| Monitoring | Prometheus | Metrics collection |
| Visualization | Grafana | Dashboarding & alerting |

## Architectural Assumptions
- **Stateless Signaling**: The Discovery Service is stateless, allowing for horizontal scaling behind the Nginx load balancer.
- **Ephemeral State**: Redis is sufficient for presence management; persistence of session data beyond the TTL is not required.
- **P2P Capability**: Android clients possess the network capability (STUN/TURN) to traverse NATs and establish direct connections.

## Constraints
- **Session Latency**: Presence registration and peer lookup must complete under 200ms to ensure a responsive user experience.
- **TTL Sensitivity**: Redis keys must align with client heartbeat intervals to prevent "ghost" sessions where clients appear online after disconnection.
- **Network Topology**: Direct P2P links are subject to network restrictions; the architecture assumes fallback mechanisms (like TURN servers) are handled within the client logic if direct connection fails.

## External Dependencies
- **Network Infrastructure**: Requires connectivity between Android clients and the Nginx endpoint (public internet).
- **Monitoring Infrastructure**: Prometheus and Grafana must be accessible by the Discovery Service instances for telemetry collection.