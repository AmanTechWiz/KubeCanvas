# Agent Instructions

> These instructions are mandatory. Any AI coding agent that enters this project MUST follow them exactly in the order specified.

## Step 1: Read All Spec Files

- Locate the folder containing these spec files: INSTRUCTIONS.md, SPEC.md, IMPLEMENTATION_PLAN.md, IMPLEMENTATION_QUESTIONS.md, IMPLEMENTATION_GUARDRAILS.md, architecture.json.
- Read ALL of them before taking any action.
- Do NOT create any files, modify any code, install any packages, or make any assumptions until you have completed Step 2.

## Step 2: Interactive Q&A

- Open IMPLEMENTATION_QUESTIONS.md and begin asking questions one at a time to the user in the terminal.
- Present each question clearly with its context ("Why it matters") and suggested answers.
- Wait for the user's response before presenting the next question.
- Q1 is always a technology or platform confirmation question — answer it first as it affects all downstream decisions.
- If the architecture (see architecture.json) implies a specific platform or technology (e.g., Android clients, Node.js discovery service, Redis), acknowledge that context in Q1 and ask for explicit confirmation.
- After all "Required" questions are answered, ask: "Would you also like to answer the Recommended questions?"
- If the user declines, skip recommended questions and proceed.
- Capture every answer precisely — these answers drive plan generation.

## Step 3: Clarification Round

- After all questions are answered, ask the user: "Do you have any more clarifications, concerns, or additional context you would like to share?"
- If the user provides additional input, capture and incorporate it into the plan.
- If the user says no, proceed to the next step.
- Then ask: "Should I create the implementation plan now?"
- If the user says yes, proceed to Step 4.
- If the user says no, wait for further instructions.

## Step 4: Create plan.md

- Create a file called plan.md at the PROJECT ROOT (not inside the spec/docs folder).
- Do NOT ask the user whether to create it again — you already received approval in Step 3.
- The plan.md MUST follow this exact structure:
  - **Project Overview** — What is being built, who it is for, core value proposition (2-3 paragraphs)
  - **Tech Stack** — Every technology with version, purpose, and why it was selected over alternatives
  - **Key Decisions** — Technology choices, architecture patterns, engineering trade-offs, and the reasoning behind each
  - **Phase-wise Features** — Each phase as a numbered section with: goal, deliverables (specific files/components), dependencies, definition of done
  - **Risks** — What could go wrong, what to watch for, performance pitfalls, security concerns, and mitigation strategies
- Derive the plan from the architecture.json data, all Q&A answers, and the IMPLEMENTATION_PLAN.md.
- Make the plan detailed enough that an AI agent could implement it phase-by-phase without asking further questions.

## Step 5: Create Feature Specs

- After plan.md is created, read it carefully.
- Create a folder called feature-specs/ at the PROJECT ROOT.
- For each phase in the plan, create a numbered spec file inside feature-specs/:
  - File naming pattern: 01-feature-name.md, 02-another-feature.md, 03-next-feature.md, etc.
  - Name each file based on the phase's primary deliverable or feature.
- Each spec file MUST contain:
  - Feature name and phase reference
  - What to build (specific components, files, routes, schemas)
  - Technical details (API contracts, data models, UI requirements)
  - Dependencies on other features
  - Acceptance criteria (measurable, testable)
  - Files to create or modify (with paths)
- Make each spec detailed enough for an AI agent to implement it independently without ambiguity.

## Step 6: Implementation Prompt

- After all feature-specs are created, ask the user: "The plan and all feature specs are ready. Should I start implementing?"
- Wait for the user's explicit approval before writing any code.
- If approved, implement features one by one, following each spec file in order (01, 02, 03...).

## Non-Negotiable Rules

- Never skip the Q&A phase. Never assume answers. Never guess.
- Never modify existing project files during Steps 1 through 3.
- Never start implementing until the user explicitly approves in Step 6.
- Always create plan.md at the project root — never inside the spec folder.
- Always create feature-specs/ at the project root.
- Keep all questions and answers in the terminal conversation — do not write them to files.
- If the user asks to skip steps, remind them of the required flow but comply if they insist.
- Do not generate any self-introduction or persona preamble in your output. Start directly with the heading.