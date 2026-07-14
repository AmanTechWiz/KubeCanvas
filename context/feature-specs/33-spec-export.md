# AI Implementation Pack v2

## Overview

Replace the existing generic specification export with an AI-native Implementation Pack optimized for autonomous coding agents (Claude Code, Cursor, OpenAI Codex, Gemini CLI, etc.).

The goal is **not** to generate documentation.

The goal is to bridge the gap between a visual architecture diagram and an implementation-ready project by generating structured engineering context that coding agents can immediately consume.

---

# High-Level Flow

User

↓

Export AI Spec

↓

Trigger.dev Task

↓

Gemini Flash Latest

↓

Generate AI Implementation Pack

↓

Download ZIP

↓

Developer places folder into repository

↓

Coding Agent reads files

↓

Agent interviews developer using IMPLEMENTATION_QUESTIONS.md

↓

Agent generates implementation plan

↓

Agent begins implementation

---

# Trigger.dev

Create a new Trigger.dev task.

Suggested name:

generate-ai-spec

Responsibilities

- Read architecture graph
- Analyze architecture
- Detect missing architectural information
- Generate implementation package
- Return downloadable ZIP

The task owns the complete generation process.

The frontend is only responsible for triggering the task, displaying progress, and downloading the resulting ZIP.

---

# AI Model

Use

Gemini Flash Latest

Reason

The model is sufficiently fast for interactive generation while capable of producing structured engineering documentation.

The prompt should instruct the model to behave as a Staff Software Architect writing implementation specifications for another engineering team.

Avoid generic documentation.

Every generated section should contain implementation-specific reasoning, constraints and engineering intent.

Never generate filler.

---

# Generation Strategy

Do NOT ask Gemini to simply summarize the architecture.

Instead the prompt should ask Gemini to:

- understand the architecture
- reason about implementation dependencies
- identify architectural assumptions
- detect missing implementation decisions
- identify project invariants
- produce implementation guidance

The output should resemble an engineering handoff document rather than project documentation.

---

# Export Structure

.ai-spec/

SPEC.md

IMPLEMENTATION_PLAN.md

IMPLEMENTATION_QUESTIONS.md

IMPLEMENTATION_GUARDRAILS.md

architecture.json

No additional markdown files should be generated.

Every file must have a distinct responsibility.

---

# architecture.json

This is the canonical source of truth.

It should contain:

- project metadata
- nodes
- edges
- technologies
- relationships
- layers
- descriptions

No prose.

Future tooling should depend on this file rather than parsing markdown.

---

# SPEC.md

Purpose

Describe the architecture.

NOT the implementation.

Contents

- Executive Summary
- Architecture Overview
- Components
- Responsibilities
- Data Flow
- Technologies
- Architectural Assumptions
- Constraints
- External Dependencies

Avoid generic statements such as

"Redis is used for caching."

Instead explain architectural intent.

Example

"Redis is positioned between the API and Worker to decouple synchronous request handling from asynchronous image processing."

Every paragraph should communicate information that cannot be inferred from simply reading the diagram.

---

# IMPLEMENTATION_PLAN.md

Purpose

Guide implementation.

This document answers

"How should this system be built?"

Include

For every phase

Goal

Dependencies

Deliverables

Definition of Done

Validation

Example

Phase 2

Goal

Implement authentication middleware before protected API endpoints.

Dependencies

Database connection

Configuration

Deliverables

JWT middleware

Role validation

Refresh token support

Definition of Done

Protected endpoints reject unauthorized requests.

Authentication tests pass.

Avoid generic phase lists.

Reason explicitly about implementation ordering.

---

# IMPLEMENTATION_QUESTIONS.md

Purpose

Generate an interview that the coding agent performs before implementation.

This is the most important document in the export.

The coding agent should read this file first.

Then ask EVERY question interactively in the user's terminal or IDE.

The agent must continue asking until every question has been answered.

The implementation should NOT begin until all questions have been resolved.

Gemini should generate questions ONLY for information that cannot be confidently inferred from the architecture.

Never invent missing information.

Every question should contain

Question

Why it matters

Suggested answers (when applicable)

Priority

Example

Question

How should failed image-processing jobs be retried?

Why this matters

Worker implementation depends on retry behavior.

Suggested answers

- No retries
- Three retries
- Exponential backoff
- Dead-letter queue

Priority

Required

The questions should cover areas such as

- authentication
- deployment
- scaling
- API behavior
- retry policies
- validation
- caching
- authorization
- database behavior
- monitoring
- security
- rate limiting

The questions should be specific to the architecture.

Never ask questions that are already answered by the diagram.

---

# IMPLEMENTATION_GUARDRAILS.md

Purpose

Define architectural invariants.

These are project-specific rules that the coding agent must never violate.

This is NOT an AI prompt.

This is an engineering constraints document.

Include rules such as

Ownership

Allowed communication paths

Forbidden dependencies

Required architectural boundaries

Technology constraints

Examples

Only the Worker processes background jobs.

Frontend must never access the database directly.

Authentication must occur before API access.

Do not replace selected technologies without explicit approval.

Do not introduce additional services unless requested.

Do not move responsibilities between components.

If required information is missing, ask the developer instead of guessing.

These guardrails should be derived from the architecture itself.

---

# Coding Agent Workflow

The exported package is intended to be consumed by AI coding agents.

Recommended workflow

1.

Read architecture.json

2.

Read ARCHITECTURE_SPEC.md

3.

Read IMPLEMENTATION_PLAN.md

4.

Read IMPLEMENTATION_GUARDRAILS.md

5.

Read IMPLEMENTATION_QUESTIONS.md

6.

Interview the developer by asking every unanswered question.

7.

Collect all responses.

8.

Use the responses together with the architecture to generate a final implementation plan.

9.

Begin implementation.

The interview phase is mandatory.

Implementation should never start while required questions remain unanswered.

---

# Frontend

Inside the AI panel

Export AI Spec

↓

Start Trigger.dev task

↓

Show live progress card

↓

Generation finishes

↓

Download ZIP

Progress card stages

Reading Architecture

↓

Analyzing Components

↓

Detecting Missing Decisions

↓

Generating Specifications

↓

Packaging Files

↓

Ready for Download

---

# Acceptance Criteria

✓ Export generates exactly five files.

✓ Trigger.dev performs generation.

✓ Gemini Flash Latest generates every markdown document.

✓ architecture.json remains the canonical source.

✓ IMPLEMENTATION_QUESTIONS.md contains architecture-specific questions only.

✓ No missing information is hallucinated.

✓ IMPLEMENTATION_GUARDRAILS.md contains project-specific invariants rather than generic AI advice.

✓ IMPLEMENTATION_PLAN.md contains dependency-aware implementation phases.

✓ SPEC.md communicates architectural intent instead of merely describing components.

✓ Live generation progress is displayed in the AI panel.

✓ Downloaded ZIP is immediately usable inside a repository by modern coding agents.