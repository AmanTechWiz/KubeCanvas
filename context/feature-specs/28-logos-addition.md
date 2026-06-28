# Feature: Technology & Cloud Logo Picker

## Objective

Implement a floating **Technology Logo Picker** for KubeCanvas that allows users to quickly add commonly used technology, cloud, database, AI, payment, and infrastructure logos to the canvas.

This feature should follow the existing design language of KubeCanvas and integrate naturally with the current floating Shape Picker.

---

# Installation

Use the following package for all technology icons:

```bash
npm i tech-stack-icons@latest
```

Use this package wherever possible instead of downloading SVGs manually.

---

# Placement

A new floating button should be added to the canvas toolbar.

Location:

* Immediately **to the left of the existing Shape Picker**.
* Same height.
* Same floating style.
* Same shadows.
* Same hover animation.
* Same spacing.
* Same border radius.
* Same overall design language.

It should feel like it has always been part of the application.

Do **not** redesign the current toolbar.

Simply extend it.

---

# Interaction

When the user clicks the Technology Logo Picker button:

Open a floating panel identical in style to the current Shape Picker.

The UI should reuse the existing component styles wherever possible.

Do not introduce a different design system.

---

# Panel Layout

The floating panel contains:

* Tabs at the top
* Search input
* Scrollable icon grid

Example:

```
----------------------------------------
| Search...                           |
----------------------------------------
| Cloud | Frontend | Backend | DB | AI |
----------------------------------------
| ⚛ React        ▲ Next.js            |
| 🟢 Node.js     ⚡ Express           |
| ...                                 |
----------------------------------------
```

---

# Search

Provide instant filtering.

Search should work by:

* Technology name
* Partial matches
* Case insensitive

Examples:

Searching:

```
post
```

Should immediately show:

* PostgreSQL

Searching:

```
aws
```

Should show:

* AWS
* EC2
* Lambda
* S3
* CloudFront

---

# Categories

Create the following tabs.

## Cloud

Include:

* AWS
* Google Cloud
* Microsoft Azure
* Cloudflare
* Vercel
* Netlify

### AWS Services

* EC2
* Lambda
* S3
* RDS
* DynamoDB
* API Gateway
* CloudFront
* SQS

### Google Cloud

* Cloud Run
* Cloud Functions
* Cloud Storage
* Cloud SQL
* BigQuery

### Azure

* Azure Functions
* Azure Blob Storage
* Azure SQL Database

---

## Frontend

* React
* Next.js
* Angular
* Vue.js

---

## Backend

* Node.js
* Express
* NestJS
* FastAPI
* Django
* Spring Boot

---

## Database

* PostgreSQL
* MySQL
* MongoDB
* Redis
* Firebase
* Supabase

---

## Authentication

* Clerk
* Auth0
* Firebase Auth
* JWT
* OAuth

---

## AI

* OpenAI
* Google Gemini
* Anthropic
* Hugging Face
* LangChain

---

## Messaging

* Kafka
* RabbitMQ

---

## Monitoring

* Grafana
* Prometheus
* Sentry

---

## Payments

* Stripe
* Razorpay
* PayPal

---

## Notifications

* Twilio
* Resend
* Firebase Cloud Messaging (FCM)

---

## DevOps

* Docker
* Kubernetes
* GitHub Actions

---

## Search

* Elasticsearch

---

## Maps

* Google Maps

---

## Realtime

* Socket.IO

---

## Networking

* Nginx
* API Gateway
* Load Balancer

---

## Collaboration

* GitHub
* Figma

---

# Icon Grid

Display every item as a small card.

Each card contains:

```
┌──────────────────┐
│      Logo        │
│                  │
│ PostgreSQL       │
└──────────────────┘
```

Requirements:

* Same spacing as Shape Picker
* Same hover animation
* Same rounded corners
* Same shadows
* Same typography
* Responsive grid
* Smooth scrolling

---

# Canvas Behaviour

When an icon is clicked:

Automatically add it to the canvas.

The icon should become a draggable canvas node.

Each logo node should include:

* technology name
* icon
* unique id
* x position
* y position

Use the same node creation flow used by Shape Picker.

---

# Logo Node Design

Each logo node should follow the current KubeCanvas design language.

Recommended appearance:

* Transparent background
* Technology logo centered
* Label underneath
* Draggable
* Selectable
* Resizable (if existing nodes support resizing)

Avoid large backgrounds behind logos.

The logo itself should remain the primary visual element.

---

# Canvas Integration

Logo nodes should behave exactly like existing nodes.

Support:

* Selection
* Multi-selection
* Dragging
* Copy/Paste
* Delete
* Duplicate
* Undo/Redo
* Zoom
* Pan

No special behavior should be introduced.

---

# Reuse Existing Components

Whenever possible:

* Reuse existing floating panel component
* Reuse existing button styles
* Reuse existing animations
* Reuse existing popover logic
* Reuse existing keyboard shortcuts
* Reuse existing state management

Avoid creating duplicate implementations.

---

# Performance

Do not import every icon eagerly if unnecessary.

Prefer lazy loading or tree-shakable imports if supported by the library.

The picker should remain responsive.

---

# Accessibility

Support:

* Keyboard navigation
* Arrow key movement
* Enter to insert
* Escape to close
* Proper focus management

---

# Future Extensibility

Design the picker so new categories can be added easily.

Example:

```ts
const categories = [
  {
    id: "frontend",
    label: "Frontend",
    icons: [...]
  }
]
```

Avoid hardcoding UI for every category.

Use a data-driven approach.

---

# Implementation Notes

* Follow the existing project architecture.
* Follow the current component hierarchy.
* Follow the current styling system.
* Do not introduce a new design language.
* Keep the implementation modular and reusable.
* Ensure the Technology Logo Picker feels like a native part of KubeCanvas rather than a separate feature.
* Preserve consistency with every existing interaction pattern used throughout the application.
