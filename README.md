# SynapseAI: AI-Powered Knowledge & Tasks Management Platform
**DigiPlus IT Technical Assessment Solution**

SynapseAI is a modern, responsive, client-side web application designed to solve team context loss during handovers, team member leaves, and recurring meetings. It captures raw unstructured discussions, extracts structured recaps, carries forward open items across meetings, generates tailored catch-up briefs, semantically links items to a knowledge base, and audits operations through structured logging.

---

## 🚀 Live Demo & Quick Start

1. Double click [`index.html`](file:///c:/Users/Ronit/Downloads/DigiPlusIT_assignment/index.html) or open it directly in any modern browser (Chrome, Edge, Firefox, Safari).
2. Alternatively, serve with any local HTTP server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

---

## 🎯 DigiPlus Assessment Requirements & Implementations

| Requirement | Implementation in SynapseAI |
| :--- | :--- |
| **Meetings & Transfers Lifecycle** | Complete CRUD and persistence for meetings and work transfers, capturing agenda, participants, raw notes, decisions, and action items. |
| **Action Items Tracking & Lifecycle** | Full task status tracking (`Open`, `In Progress`, `Blocked`, `Closed`), owner reassignment, due dates, priority, and recorded resolution outcomes. |
| **Carry Open Items Forward** | Select past unclosed tasks when creating a new session. Preserves cumulative carry-over count and complete audit trail history. |
| **AI Unstructured Recap Extraction** | Ingests raw notes, transcripts, or chat threads and extracts a concise summary, key decisions, and action items with owners and due dates. |
| **Role-Tailored AI Catch-Up Brief** | Generates instant contextual briefs tailored by perspective: General, Missed Meeting Attendee, New Owner Taking Over, or Executive 30s TL;DR. |
| **Knowledge Base & Semantic Linking** | Company SOPs and runbooks catalog with an AI Semantic Linker that calculates relevance match percentages against past meetings and tasks. |
| **Structured Application Logging** | Full structured logging with `correlationId`, log levels (`INFO`, `WARN`, `ERROR`, `AI_CALL`), latency tracking, secret redaction, and 1-click JSON export. |
| **Make It Special** | **Handover Sentinel & Transition Risk Radar**: Auto-detects orphan tasks, stagnant carried items, and simulates colleague leave scenarios with AI auto-reassignment. |

---

## 🤖 AI Configuration & Architecture

SynapseAI provides a flexible dual-engine AI architecture:

1. **Smart Built-in Mock AI (Default)**:
   - Zero API key required, 100% offline-ready, realistic latencies (500-800ms).
   - Heuristically extracts decisions, assigns owners, structures markdown summaries, and computes semantic linkage scores.
2. **Google Gemini API**:
   - Supports `gemini-1.5-flash` or `gemini-1.5-pro`.
   - Users can enter their Gemini API key via the top-bar **AI Configuration** modal.
3. **OpenAI API**:
   - Supports `gpt-4o-mini` or `gpt-4o`.
4. **Data Flow & Resilience**:
   - All AI requests run through `AIService` with pre-flight input validation.
   - If an API call fails or times out, the system automatically falls back gracefully to local heuristic extraction, ensuring the user experience is never interrupted.

---

## 🛡️ Structured Logging System

Logs are tracked at every key event in `logger.js`:
- **Unique Request/Correlation ID**: Every operation generates a `req-xxxxxx` correlation ID to link UI triggers with AI executions.
- **Key Events Audited**: Meeting creation/edit, action item creation, status changes, reassignments, task closures with outcomes, and log exports.
- **Latency & Outcome**: All AI calls log exact elapsed milliseconds and status (`SUCCESS` / `FAILED`).
- **No Secrets in Logs**: An automated recursive sanitizer replaces sensitive fields (`key`, `secret`, `token`, `password`) with `[REDACTED_SECRET]`.
- **Export to File**: Click **Export JSON Log File** in the Audit tab to download the entire structured audit trail.

---

## ⭐ Standout Feature: Handover Sentinel

### Why It Adds Value
Traditional project tools only record tasks; they don't prevent context loss when someone steps away. **Handover Sentinel** acts as an active risk radar:
1. **Transfer Health Score (0-100%)**: Dynamically calculated based on unassigned orphan tasks, stagnant carried-over items, and overdue deliverables.
2. **Leave Simulation**: Select any team member (e.g., *Sarah Miller*) to simulate unexpected absence. The Sentinel identifies all liabilities and provides an **AI Auto-Reassign Backlog** button to distribute tasks to designated proxy engineers with full audit trails.

---

## 📁 Project Structure

```text
DigiPlusIT_assignment/
├── index.html        # Main static application interface
├── style.css         # Modern dark glassmorphism stylesheet & responsive layout
├── storage.js        # Local persistence layer & preloaded realistic seed data
├── logger.js         # Structured logger with correlation IDs & JSON export
├── ai_service.js     # AI integration (Gemini, OpenAI, & Smart Mock engine)
├── app.js            # App controller, UI handlers, Sentinel logic, and DOM binding
└── README.md         # Architecture, design decisions, and documentation
```

---

## 📋 Assumptions & Known Limitations

- **Client-Side Storage**: In this static version, data is persisted in the browser's `localStorage`.
- **API Key Storage**: Keys are stored locally in the browser's memory and are never transmitted to external analytics or logged in plaintext.
- **Deployment**: Because this is a static HTML/CSS/JS application, it can be deployed instantly to GitHub Pages, Vercel, Netlify, or any static web server with zero build steps.
