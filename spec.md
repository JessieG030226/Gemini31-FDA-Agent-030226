# Swissmed Agentic AI 510(k) Review System (Flower Edition V4.0)
## Comprehensive Technical Specification

**Document Version:** 1.0.0
**Date:** March 2026
**Status:** Approved for Implementation
**Target Architecture:** React (Vite) Frontend + Ephemeral Node.js/Browser Execution + Gemini 3 Flash Preview Orchestration

---

## Table of Contents

1. [Introduction & Executive Summary](#1-introduction--executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Core Components & Modules](#3-core-components--modules)
4. [Data Models & Schemas](#4-data-models--schemas)
5. [Detailed Workflow Specifications](#5-detailed-workflow-specifications)
6. [Security, Privacy & FDA Compliance](#6-security-privacy--fda-compliance)
7. [UI/UX & Gamification (Flower Edition)](#7-uiux--gamification-flower-edition)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Error Handling & Resilience](#9-error-handling--resilience)
10. [Future Extensibility](#10-future-extensibility)
11. [20 Comprehensive Follow-Up Questions](#11-20-comprehensive-follow-up-questions)

---

## 1. Introduction & Executive Summary

### 1.1 Purpose
The purpose of this document is to provide a comprehensive, exhaustive technical specification for the Swissmed Agentic AI 510(k) Review System. This system is designed to assist Food and Drug Administration (FDA) review officers in processing 510(k) premarket notifications. By leveraging agentic artificial intelligence—specifically orchestrated by Google's Gemini 3 Flash Preview model—the system automates the generation of Refuse to Accept (RTA) checklists, Substantial Equivalence (SE) comparisons, and preliminary review summaries.

### 1.2 Scope
This specification covers the frontend architecture, the AI orchestration logic, the document ingestion pipelines, state management, security protocols, and the user interface guidelines. It explicitly defines the boundaries of the system: the application operates entirely ephemerally within the user's browser session, ensuring zero persistent storage of highly confidential manufacturer data.

### 1.3 Background: The 510(k) Challenge
The FDA 510(k) clearance process requires manufacturers to demonstrate that their medical device is "substantially equivalent" to a legally marketed predicate device. FDA officers are burdened with reviewing submissions that frequently exceed 1,000 pages. The introduction of the mandatory eSTAR (electronic Submission Template And Resource) format has standardized submissions but has not alleviated the cognitive load of cross-referencing hundreds of data points against complex FDA guidance documents.

### 1.4 The Agentic AI Solution
Unlike traditional "chatbot" interfaces, an agentic AI system operates autonomously within defined guardrails. The Swissmed system utilizes a declarative YAML pipeline (`pipeline.yaml`) that dictates a sequence of analytical tasks. The Gemini 3 Flash Preview model acts as the cognitive orchestrator, reading the pipeline, executing tasks sequentially, maintaining context between steps, and formatting outputs based on a master regulatory knowledge base (`SKILL.md`).

---

## 2. System Architecture Overview

The system follows a strict Client-Side Heavy, Serverless-AI architecture. To comply with the "Pure Ephemeral" requirement (Option A from the design phase), there is no backend database, no persistent file storage, and no server-side session management.

### 2.1 High-Level Topology

```text
[ FDA Officer ]
      │
      ▼ (Uploads PDF & Clicks Run)
┌─────────────────────────────────────────────────────────────┐
│ Browser Environment (React / Vite)                          │
│                                                             │
│  ┌─────────────────┐       ┌─────────────────────────────┐  │
│  │ UI Components   │◄─────►│ State Management (React)    │  │
│  │ (Flower Theme)  │       │ (Mana, Stress, Outputs)     │  │
│  └─────────────────┘       └─────────────────────────────┘  │
│          │                                ▲                 │
│          ▼                                │                 │
│  ┌─────────────────┐       ┌─────────────────────────────┐  │
│  │ Ingestion Engine│──────►│ Orchestration Engine        │  │
│  │ (pdfjs-dist)    │       │ (YAML Parser + Task Runner) │  │
│  └─────────────────┘       └─────────────────────────────┘  │
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │ (HTTPS / TLS 1.3)
                                            ▼
                              ┌─────────────────────────────┐
                              │ Google GenAI API            │
                              │ (Gemini 3 Flash Preview)    │
                              └─────────────────────────────┘
```

### 2.2 Architectural Principles
1. **Zero-Trust Ephemerality:** All data exists exclusively in the browser's volatile memory (RAM). A page refresh permanently destroys the uploaded document, the extracted text, and the generated reports.
2. **Declarative Orchestration:** The AI's behavior is not hardcoded in TypeScript. It is defined in a human-readable `pipeline.yaml` file, allowing regulatory experts to modify the AI's workflow without writing code.
3. **Deterministic Prompting:** The system utilizes Retrieval-Augmented Generation (RAG) principles by injecting a static `SKILL.md` file into every prompt, ensuring the AI adheres strictly to FDA 21 CFR regulations and avoids hallucinating legal standards.
4. **Graceful Degradation:** If the AI API fails, the UI must handle the error gracefully, preserving the user's current session state and allowing them to retry the specific failed task.

---

## 3. Core Components & Modules

### 3.1 User Interface (React + Tailwind CSS)
The frontend is built using React 19 and styled with Tailwind CSS v4. It implements the "Flower Edition" aesthetic, prioritizing a calming, low-stress environment for the reviewer.

*   **Main Layout:** A split-pane design. The left pane (4 columns) contains controls, upload mechanisms, and pipeline progress indicators. The right pane (8 columns) contains a tabbed interface for reviewing the AI's outputs.
*   **Component Library:** Uses `lucide-react` for iconography. Custom components are built for the Mana Pool (a blue progress bar representing remaining API budget) and the Stress Level (a red progress bar representing cognitive load).
*   **Markdown Renderer:** Utilizes `react-markdown` to safely render the AI's output, supporting tables, bold text, and lists, which are heavily used in regulatory comparisons.

### 3.2 Document Ingestion Engine (`src/lib/pdf.ts`)
The ingestion engine is responsible for converting complex 510(k) submissions into a format the LLM can process. It supports two distinct modes, selectable by the user:

#### 3.2.1 Option A: Local Ephemeral Extraction (pdfjs-dist)
*   **Mechanism:** Uses Mozilla's `pdfjs-dist` to parse the PDF entirely within the browser's JavaScript engine.
*   **Process:** The file is read as an `ArrayBuffer`. The engine iterates through every page, extracting text items and concatenating them with page markers (e.g., `--- Page 1 ---`).
*   **Advantages:** Maximum security. The raw PDF file never leaves the user's machine. Only the extracted text is sent to the Gemini API.
*   **Limitations:** May lose complex spatial formatting (like deeply nested tables or images) present in interactive eSTAR PDFs.

#### 3.2.2 Option B: Gemini Multimodal Ingestion
*   **Mechanism:** Converts the raw PDF file into a Base64 encoded string and passes it directly to the Gemini 3 Flash Preview model as an `inlineData` object.
*   **Process:** The browser uses `FileReader` to encode the file. The payload is sent to Google's servers, where Gemini's native multimodal capabilities process the document visually and textually.
*   **Advantages:** Superior understanding of complex eSTAR layouts, embedded images, and complex tables.
*   **Limitations:** Requires sending the entire binary file to the API, which consumes more bandwidth and relies on the API's internal PDF parsing limits.

### 3.3 Orchestration Engine (`src/lib/orchestrator.ts`)
This is the brain of the application. It bridges the UI, the configuration files, and the LLM.

*   **YAML Parser:** Uses `js-yaml` to parse `pipeline.yaml` into a strongly typed TypeScript object (`PipelineConfig`).
*   **Task Runner:** An asynchronous loop that iterates over the tasks defined in the pipeline. For each task, it constructs a massive, highly structured prompt.
*   **Context Management:** The orchestrator maintains a `previousOutputs` dictionary. When executing Task 3, it provides the LLM with the outputs of Task 1 and Task 2, allowing the AI to build upon its previous reasoning.
*   **Streaming Support:** Utilizes `generateContentStream` from the `@google/genai` SDK. This allows the UI to update in real-time as the AI generates text, preventing the application from appearing frozen during long analytical tasks.

### 3.4 Cognitive Engine (Gemini 3 Flash Preview)
The chosen LLM is Gemini 3 Flash Preview. It was selected for its massive context window (capable of handling 1000+ page PDFs), its multimodal capabilities, and its high speed.

*   **Temperature:** Hardcoded to `0.05`. In regulatory environments, creativity is a liability. A near-zero temperature ensures highly deterministic, factual outputs.
*   **System Prompting (`SKILL.md`):** Every API call includes the contents of `SKILL.md`. This file acts as the AI's "System Prompt," defining its persona ("expert FDA Lead Reviewer"), its constraints ("NEVER make final binding legal decisions"), and its formatting rules.
*   **Chain of Thought:** The prompt explicitly instructs the AI to output its reasoning inside `<thinking>` XML tags before generating the final Markdown. This forces the model to plan its response, drastically reducing logical errors in complex Substantial Equivalence comparisons.

---

## 4. Data Models & Schemas

To ensure type safety and predictable behavior, the system relies on strict data models.

### 4.1 Pipeline Configuration Schema (YAML to JSON)
The `pipeline.yaml` file is parsed into the following TypeScript interface:

```typescript
interface PipelineTask {
  id: string;          // Unique identifier (e.g., "rta_acceptance_audit")
  description: string; // Instructions for the LLM for this specific step
}

interface PipelineConfig {
  name: string;
  version: string;
  description: string;
  orchestrator: {
    provider: string;    // e.g., "google"
    model: string;       // e.g., "gemini-3-flash-preview"
    temperature: number; // e.g., 0.05
    max_tokens: number;  // e.g., 8192
  };
  tasks: PipelineTask[];
}
```

### 4.2 Session State Model (React)
The UI maintains the following state variables to track the user's session:

```typescript
interface SessionState {
  file: File | null;                  // The uploaded 510(k) submission
  ingestionMode: 'A' | 'B';           // Local text extraction vs Multimodal
  mana: number;                       // Integer 0-100, tracks API usage budget
  stress: number;                     // Integer 0-100, tracks cognitive load
  isRunning: boolean;                 // Disables UI controls during execution
  currentTask: string | null;         // The ID of the currently executing task
  outputs: Record<string, string>;    // Dictionary mapping Task IDs to Markdown strings
  activeTab: string;                  // Controls which output is visible in the UI
}
```

### 4.3 Document Context Model
Depending on the chosen ingestion mode, the document context passed to the orchestrator takes one of two forms:

**Mode A (Text):**
```typescript
type DocumentContext = string; // A massive concatenated string of all PDF pages.
```

**Mode B (Multimodal):**
```typescript
interface DocumentContext {
  inlineData: {
    data: string;     // Base64 encoded string of the PDF binary
    mimeType: string; // "application/pdf"
  }
}
```

---

## 5. Detailed Workflow Specifications

This section details the exact sequence of events from the moment the user opens the application to the final report generation.

### 5.1 Initialization & Upload Phase
1. **App Load:** The React application mounts. The `pipeline.yaml` and `SKILL.md` files are imported as raw strings using Vite's `?raw` loader.
2. **File Selection:** The user clicks the upload zone. The browser's native file picker opens, accepting `.pdf`, `.txt`, and `.md` files.
3. **File Validation:** The `onChange` handler captures the `File` object and stores it in React state. No data is sent to the server at this time.
4. **Configuration:** The user selects Ingestion Mode A or B via radio buttons.

### 5.2 Task Execution Loop (The Orchestration Phase)
When the user clicks "Run Agentic Review":
1. **State Lock:** `isRunning` is set to `true`, disabling the upload button and run button to prevent race conditions.
2. **Ingestion:**
   *   If Mode A: `extractTextFromPDF` is called. The browser's CPU parses the PDF using `pdfjs-dist`.
   *   If Mode B: `fileToBase64` is called. The browser encodes the file.
3. **Pipeline Parsing:** `parsePipelineYaml` converts the raw YAML string into the `PipelineConfig` object.
4. **Sequential Iteration:** A `for...of` loop begins, iterating over `config.tasks`.
   *   **Task 1: `detect_device_metadata`**
       *   The orchestrator constructs the prompt: `SKILL.md` + `Document Context` + `Task Description`.
       *   The API call is made to Gemini.
       *   The response streams back. The UI updates the `outputs` state in real-time, rendering the Markdown as it arrives.
       *   Upon completion, the output is saved to `currentOutputs['detect_device_metadata']`.
       *   Mana decreases by 5; Stress increases by 10.
   *   **Task 2: `rta_acceptance_audit`**
       *   The orchestrator constructs the prompt: `SKILL.md` + `Document Context` + **`Previous Outputs (Task 1)`** + `Task Description`.
       *   *Crucial Detail:* By including Task 1's output, the AI knows the device's Product Code and Class, allowing it to tailor the RTA audit specifically to that device type.
       *   The API call is made, streams back, and saves.
   *   **Task 3 & 4:** The loop continues for `se_comparator_analysis` and `generate_preliminary_summary`, accumulating context at each step.
5. **Completion:** The loop finishes. `isRunning` is set to `false`. The UI unlocks.

### 5.3 Iterative Feedback Loop (Future Implementation Hook)
While the current V4.0 implementation executes a linear pipeline, the architecture is designed to support an iterative loop. Because `outputs` is a React state dictionary, a future update can add a "Regenerate Task" button next to each tab. This would allow the user to modify a specific task's prompt and re-run only that task, updating the dictionary without re-running the entire pipeline.

---

## 6. Security, Privacy & FDA Compliance

Operating within the regulatory sphere requires absolute adherence to data privacy and security standards.

### 6.1 Ephemeral Data Enforcement (Option A)
The system strictly enforces Option A (Pure Ephemeral) from the design specifications.
*   **No Backend Storage:** The application is a Single Page Application (SPA) served as static files. There is no Node.js backend receiving file uploads.
*   **Memory Only:** The `File` object resides entirely in the browser's heap memory.
*   **Volatile State:** If the user presses F5, closes the tab, or navigates away, the browser's garbage collector immediately destroys the file, the extracted text, and all AI-generated reports. It is mathematically impossible to recover the data from the host server because it was never there.

### 6.2 FDA 21 CFR Part 11 Considerations
While this tool is an *assistive* application and not the final System of Record (the FDA's internal databases serve that role), it aligns with Part 11 principles:
*   **Auditability:** The system's deterministic nature (Temperature 0.05) and reliance on a version-controlled `pipeline.yaml` mean that if the same document is uploaded under the same pipeline version, the output will be highly consistent.
*   **Traceability:** The inclusion of `<thinking>` tags in the AI's output serves as an audit trail of the AI's logic, allowing human reviewers to verify *why* the AI flagged a specific section as deficient.

### 6.3 API Security & Key Management
*   **Environment Variables:** The `GEMINI_API_KEY` is injected into the build process via Vite's `define` configuration.
*   **Deployment Security:** When deployed to Hugging Face Spaces or Google Cloud Run, the API key is stored in secure Secret Managers. It is never hardcoded in the repository.
*   **TLS Encryption:** All communication between the user's browser and the Gemini API occurs over TLS 1.3, ensuring data is encrypted in transit.

---

## 7. UI/UX & Gamification (Flower Edition)

The "Flower Edition" design language is a deliberate UX strategy to mitigate the cognitive fatigue associated with regulatory review.

### 7.1 Aesthetic Guidelines (Nordic Botanical)
*   **Color Palette:** Dominated by soft emeralds (`emerald-50` to `emerald-900`), representing growth, nature, and calm. Accents use soft blues (`blue-400`) and muted roses (`rose-400`).
*   **Typography:** The application relies on the system sans-serif stack (via Tailwind's `font-sans`), ensuring maximum legibility and familiarity across different operating systems.
*   **Layout:** Generous whitespace, rounded corners (`rounded-2xl`), and subtle borders (`border-emerald-100`) prevent visual clutter.

### 7.2 Mana Pool & Stress Meter Mechanics
These gamified elements serve a dual purpose: aesthetic delight and functional feedback.
*   **Mana Pool (Blue Bar):** Starts at 100. Decreases by 5 for every task executed. This visually communicates to the user that API calls are "expensive" operations, encouraging them to be mindful of how often they run the pipeline.
*   **Stress Level (Red Bar):** Starts at 0. Increases by 10 for every task executed. This acts as a proxy for cognitive load. In future iterations, if Stress reaches 100%, the UI can trigger a gentle animation suggesting the officer take a 5-minute screen break.

### 7.3 Accessibility
*   **Semantic HTML:** Uses proper `<header>`, `<main>`, and `<button>` tags.
*   **Contrast:** Text colors (e.g., `text-emerald-900` on `bg-white`) are chosen to exceed WCAG AA contrast ratio requirements.
*   **State Communication:** The UI clearly communicates its state (Idle, Running, Error) using loading spinners (`Loader2` from Lucide) and disabled button states, preventing user confusion during long API calls.

---

## 8. Deployment & Infrastructure

The application is designed to be easily deployable to any static hosting provider or containerized environment.

### 8.1 Hosting Environment
The primary target is Hugging Face Spaces (using the Docker/Static template) or Google Cloud Run. Because the application is entirely client-side, it can be served by a simple Nginx container or a static asset CDN.

### 8.2 Build & Compilation (Vite)
*   **Bundler:** Vite is used for lightning-fast HMR during development and optimized rollup builds for production.
*   **Raw Asset Loading:** The `?raw` suffix is used in import statements (`import pipelineYamlRaw from './pipeline.yaml?raw'`). This instructs Vite to bundle the YAML and Markdown files as raw strings directly into the JavaScript bundle, eliminating the need for runtime HTTP requests to fetch configuration files.
*   **Worker Configuration:** The `pdfjs-dist` library requires a Web Worker to parse PDFs without blocking the main UI thread. The system is configured to pull this worker from a CDN (`cdnjs`) to bypass complex Vite worker bundling issues, ensuring maximum compatibility.

### 8.3 Environment Variables
The system requires a single environment variable:
*   `GEMINI_API_KEY`: A valid Google AI Studio API key with access to the `gemini-3-flash-preview` model.

---

## 9. Error Handling & Resilience

Robust error handling is critical to prevent data loss and user frustration.

### 9.1 API Failures
*   **Catch Blocks:** The `runPipeline` function is wrapped in a `try...catch` block. If the Gemini API returns a 500 Internal Server Error, a 429 Too Many Requests, or a network timeout, the error is caught.
*   **State Reversion:** Upon an error, `isRunning` is set back to `false`, unlocking the UI. The user is alerted via a browser `alert()` (which can be upgraded to a toast notification in future versions). The outputs generated *before* the error occurred are preserved in the `outputs` state, ensuring the user doesn't lose partial progress.

### 9.2 Parsing Errors
*   **PDF Corruption:** If `pdfjs-dist` encounters a corrupted or password-protected PDF, the `extractTextFromPDF` promise will reject. The UI will catch this and notify the user before any API calls are made.
*   **YAML Syntax Errors:** If an administrator introduces a syntax error into `pipeline.yaml`, the `js-yaml` parser will throw an exception immediately upon clicking "Run," preventing the system from entering an invalid state.

### 9.3 State Recovery
Because the system is Pure Ephemeral, there is no automatic state recovery if the browser crashes or the tab is closed. This is a deliberate security feature, not a bug. Users must be trained to export their Markdown reports to their local machine once the review is complete.

---

## 10. Future Extensibility

The V4.0 architecture is designed as a foundation for future enhancements.

### 10.1 Additional Agents
Adding new capabilities requires zero changes to the TypeScript code. An administrator simply adds a new task to `pipeline.yaml`:

```yaml
  - id: "cybersecurity_vulnerability_scan"
    description: "Analyze the software architecture section against the 2023 FDA Cybersecurity Guidance. Flag missing SBOMs."
```
The orchestrator will automatically pick up this new task, execute it, and create a new tab in the UI for the output.

### 10.2 Multi-modal Expansion
Currently, Option B passes the entire PDF as a single multimodal document. Future versions could enhance the Ingestion Engine to extract specific images (e.g., engineering schematics, biocompatibility test graphs) and pass them to Gemini with specific prompts like, "Analyze this specific stress-test graph for anomalies," further reducing the officer's cognitive load.

---

## 11. 20 Comprehensive Follow-Up Questions

To ensure the successful implementation, scaling, and validation of this technical specification, the following 20 questions must be addressed by the project stakeholders, regulatory compliance team, and lead developers:

**Architecture & Infrastructure:**
1.  **API Quotas:** What is the anticipated daily volume of 510(k) pages processed, and does our current Google AI Studio tier support the required tokens-per-minute (TPM) limits for `gemini-3-flash-preview`?
2.  **CDN Reliance:** The `pdfjs-dist` worker currently relies on `cdnjs`. Does FDA IT security policy allow fetching executable scripts from public CDNs, or must we bundle the worker locally in the Vite build?
3.  **Browser Compatibility:** Are FDA officers restricted to specific legacy browsers (e.g., older versions of Edge/Chrome) that might lack support for ES Modules or advanced Web Workers required by this architecture?
4.  **Network Egress:** Will the FDA's internal VPN/Firewall block large Base64 payload transmissions (Option B) to the Google GenAI API endpoints?

**Regulatory & Compliance:**
5.  **Part 11 Signatures:** Does the final exported Markdown/PDF report require integration with a specific cryptographic digital signature API (e.g., PIV cards) to satisfy 21 CFR Part 11?
6.  **SKILL.md Governance:** Who holds the administrative authority to approve changes to the `SKILL.md` file when the FDA releases new guidance documents, and how is that version control audited?
7.  **Hallucination Metrics:** What is the acceptable threshold for AI hallucinations during the Retrospective Testing phase before the system is cleared for production use?
8.  **Data Retention:** Even though the app is ephemeral, does the FDA require logging of *metadata* (e.g., "Officer X ran a pipeline at 14:00") for internal audit purposes?

**Document Processing (Ingestion):**
9.  **eSTAR XML Extraction:** Should we invest in a dedicated XFA/XML parser to extract the raw data fields from eSTAR PDFs, rather than relying purely on visual/textual extraction via Gemini or PDF.js?
10. **OCR Fallback:** If a manufacturer submits a scanned, non-searchable PDF, Option A (pdf.js) will fail to extract text. Should we implement a client-side OCR library (like Tesseract.js), or force the user to use Option B (Gemini Multimodal)?
11. **File Size Limits:** What is the hard limit for file uploads in megabytes to prevent browser out-of-memory (OOM) crashes during Base64 encoding?

**AI & Orchestration:**
12. **Context Window Saturation:** If a submission exceeds Gemini's 1-million token context window, should the orchestrator automatically truncate the document, or halt and require the officer to split the PDF manually?
13. **Prompt Injection:** How do we sanitize the "officer_custom_instructions" (if added in the future) to prevent accidental prompt injection that overrides the safety constraints in `SKILL.md`?
14. **Parallel Execution:** Currently, tasks run sequentially to build context. Are there specific tasks (e.g., Timeline Prediction vs. Risk Visualization) that could be run in parallel using `Promise.all()` to reduce overall wait time?
15. **Temperature Tuning:** Is `0.05` too restrictive for drafting the Deficiency Letter? Should the YAML schema be updated to allow task-specific temperatures (e.g., `0.0` for RTA audit, `0.4` for letter drafting)?

**UI/UX & Gamification:**
16. **Mana Depletion:** When the Mana Pool reaches 0, should the system hard-lock the user from running further pipelines until a timeout expires, or is it purely a visual suggestion?
17. **Accessibility Testing:** Has the "Flower Edition" color palette (specifically the contrast between emerald text and emerald backgrounds) been formally tested against WCAG 2.1 AA standards using screen readers?
18. **Diff Highlighting:** In future iterative loops, how should the UI visually highlight changes made by the AI versus changes made manually by the officer (e.g., red/green diffs)?
19. **Export Formats:** Is Markdown sufficient for the final export, or is there a strict requirement to generate `.docx` files with specific FDA letterhead templates?
20. **Localization:** Do we need to support UI localization (e.g., Traditional Chinese) for officers operating in international FDA offices (e.g., Taipei)?

---
*End of Specification Document.*
