# Frontend Requirements — Pearson Specter Litt Legal AI

## Overview

Modern, human-interactive web application for legal document ingestion, grounded drafting, and operator-driven improvement. Built for paralegal/operator users who are not engineers.

**Chosen Draft Output Type:** Case Fact Summary — covers all pipeline stages cleanly and is the most universally useful legal output.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSE streaming, server components, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Fast composition, accessible primitives |
| Rich Text Editor | TipTap (ProseMirror-based) | Track-changes, diff highlighting, operator edits |
| State Management | Zustand | Lightweight, no boilerplate |
| API Communication | TanStack Query | Cache, refetch, loading/error states |
| Real-time | Server-Sent Events (SSE) | Stream OCR/processing pipeline progress |
| File Handling | react-dropzone | Drag-and-drop upload |
| PDF Viewer | react-pdf | Render original doc alongside draft |
| Charts/Viz | Recharts | Edit pattern confidence scores over time |
| Animations | Framer Motion | Pipeline step transitions |
| Icons | Lucide React | Consistent icon set |

---

## Application Pages & Routes

```
/                          → Landing / Upload
/documents/[id]            → Document Processing View
/documents/[id]/draft      → 3-Panel Draft Workspace
/documents/[id]/editor     → Operator Edit Mode
/patterns                  → Accumulated Edit Patterns
/history                   → Past Documents & Drafts
```

---

## Screen-by-Screen Flow

### 1. Landing / Upload — `/`

**Purpose:** Entry point. Operator drops a messy legal document.

**Components:**
- `<HeroHeader>` — "Pearson Specter Litt — Legal Intelligence" branding, minimal
- `<DocumentUploader>` — Full-screen drag-and-drop zone
  - Accepts: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.tiff`
  - Shows file preview thumbnail on drop
  - Rejects unsupported formats with inline error
  - Multi-file support (up to 5 docs per batch)
- `<RecentDocuments>` — Last 5 processed documents as clickable cards
- `<StatusBar>` — System health indicator (backend connected / offline)

**UI Behavior:**
- Drop zone pulses on drag-over
- Upload triggers immediate redirect to `/documents/[id]` with optimistic UI

---

### 2. Document Processing View — `/documents/[id]`

**Purpose:** Show the operator exactly what the pipeline is doing in real time.

**Components:**
- `<ProcessingPipeline>` — Animated vertical step tracker:
  ```
  Step 1: Receiving Document        ✓ Complete
  Step 2: OCR / Text Extraction     ⟳ Running... (live chars streaming in)
  Step 3: Structured Field Extract  ○ Pending
  Step 4: Chunking & Indexing       ○ Pending
  Step 5: Ready for Drafting        ○ Pending
  ```
  Each step animates in when reached via SSE stream.

- `<ExtractedFieldsPreview>` — Live JSON panel showing extracted structured data as it arrives:
  ```json
  {
    "case_number": "2024-CV-00142",
    "parties": ["Pearson Specter LLP", "Acme Corp"],
    "date_filed": "2024-03-15",
    "document_type": "Complaint",
    "key_claims": ["breach of contract", "unjust enrichment"]
  }
  ```

- `<RawTextPreview>` — Scrollable panel showing extracted raw text (OCR output), with low-confidence OCR tokens highlighted in amber.

- `<QualityBadge>` — OCR confidence score (0–100%) shown as colored badge (green/amber/red).

- `<GenerateDraftButton>` — Disabled until pipeline completes, then pulses to draw attention.

**Layout:** Two columns — Pipeline steps left, extracted content right.

---

### 3. Draft Workspace — `/documents/[id]/draft`

**Purpose:** Main operator workspace. Three-panel layout. This is the core UX.

**Layout:**
```
┌─────────────────┬──────────────────┬──────────────────┐
│  ORIGINAL DOC   │   EVIDENCE PANEL │   DRAFT OUTPUT   │
│  (PDF Viewer)   │  (Retrieved Ctx) │  (Case Summary)  │
│                 │                  │                  │
│  Page 1 of 3    │  [Chunk 1] ████  │  # Case Fact     │
│  ──────────     │  [Chunk 2] ████  │    Summary       │
│  highlighted    │  [Chunk 3] ████  │                  │
│  passages       │                  │  Parties: ...    │
│  glow when      │  Relevance:      │  Claims: ...  ²  │
│  cited          │  0.91 ████████   │  Timeline: ... ¹ │
│                 │  0.84 ███████    │                  │
│                 │  0.71 ██████     │  [Edit Draft]    │
└─────────────────┴──────────────────┴──────────────────┘
```

**Components:**

- `<DocumentViewer>` (left panel)
  - Renders original PDF page by page
  - Passage highlights glow amber when that passage is cited in the draft
  - Click a highlight → scrolls Evidence Panel to the matching chunk
  - Page navigator

- `<EvidencePanel>` (center panel)
  - `<CitationCard>` per retrieved chunk:
    - Short excerpt (3–4 lines)
    - Relevance score bar
    - Source label: `[Doc 1, Page 2, Para 3]`
    - "Jump to source" button → highlights passage in left panel
  - Sorted by relevance score descending
  - Filter toggle: show all / show only cited

- `<DraftOutput>` (right panel)
  - Rendered markdown case fact summary
  - Inline citation superscripts (`¹ ² ³`) that are clickable
  - Click citation → highlights corresponding chunk in center panel + passage in left panel
  - `<ConfidenceTag>` per section: grounded / partially grounded / unsupported
  - `<EditDraftButton>` → navigates to `/documents/[id]/editor`

**Citation Interaction Flow:**
```
User clicks [¹] in draft
  → Evidence Panel scrolls to Chunk 1, card glows
  → Document Viewer scrolls to Page 2, passage glows amber
  → Tooltip shows: "Source: Doc 1, Page 2, Lines 14–18"
```

---

### 4. Operator Edit Mode — `/documents/[id]/editor`

**Purpose:** Operator reviews and edits the draft. Every edit is captured for learning.

**Layout:** Split — Editor left (70%), Evidence right (30%, collapsible)

**Components:**

- `<DraftEditor>` — TipTap rich text editor
  - Full draft rendered as editable document
  - Track-changes visual: original text shown in base color, operator additions in green, deletions shown as strikethrough in red
  - Auto-save every 3 seconds (debounced)
  - Word count, reading time in footer

- `<EditToolbar>` — formatting controls + "Submit Edits" CTA
  - Bold, italic, heading levels
  - `<SubmitEditsButton>` — prominent, triggers edit capture pipeline

- `<EditSummaryPanel>` — After submit, shows:
  - Word count delta
  - Changed sections highlighted
  - `<PatternExtractedBadge>` — "3 reusable patterns extracted from this edit"
  - List of extracted patterns in plain English:
    - `"Always lead with case number and filing date"`
    - `"Use passive voice for claims section"`
    - `"Include jurisdiction in first paragraph"`
  - `<AppliedToFutureTag>` — confirms patterns saved

- `<DiffView>` toggle — side-by-side before/after diff (not the primary view, secondary toggle)

---

### 5. Edit Patterns Library — `/patterns`

**Purpose:** Show accumulated intelligence from all past operator edits.

**Components:**

- `<PatternCard>` grid — each card shows:
  - Pattern description in plain English
  - Frequency: "Applied 7 times"
  - Source documents
  - Confidence score
  - Toggle: Active / Disabled (operator can suppress a pattern)

- `<ImprovementChart>` — Recharts line chart: "Edit distance vs. draft number" — shows drafts getting closer to final operator version over time (lower edit delta = better drafts)

- `<PatternFilter>` — filter by category: Tone / Structure / Content / Citations

---

### 6. History — `/history`

**Purpose:** Browse past documents and their draft/edit history.

**Components:**

- `<DocumentHistoryTable>` — sortable table: filename, upload date, status, draft type, edit count
- Click row → opens draft workspace for that document
- `<ExportButton>` — export final edited draft as PDF or DOCX

---

## Component Architecture

```
src/
├── app/
│   ├── page.tsx                        # Landing/Upload
│   ├── documents/
│   │   └── [id]/
│   │       ├── page.tsx                # Processing View
│   │       ├── draft/page.tsx          # Draft Workspace
│   │       └── editor/page.tsx         # Edit Mode
│   ├── patterns/page.tsx               # Patterns Library
│   └── history/page.tsx                # Document History
├── components/
│   ├── upload/
│   │   ├── DocumentUploader.tsx
│   │   └── RecentDocuments.tsx
│   ├── processing/
│   │   ├── ProcessingPipeline.tsx
│   │   ├── ExtractedFieldsPreview.tsx
│   │   └── RawTextPreview.tsx
│   ├── workspace/
│   │   ├── DocumentViewer.tsx
│   │   ├── EvidencePanel.tsx
│   │   ├── CitationCard.tsx
│   │   └── DraftOutput.tsx
│   ├── editor/
│   │   ├── DraftEditor.tsx
│   │   ├── EditToolbar.tsx
│   │   └── EditSummaryPanel.tsx
│   └── patterns/
│       ├── PatternCard.tsx
│       └── ImprovementChart.tsx
├── store/
│   ├── documentStore.ts                # Zustand: upload, processing state
│   ├── draftStore.ts                   # Zustand: draft content, citations
│   └── editorStore.ts                  # Zustand: edit tracking
├── hooks/
│   ├── useProcessingStream.ts          # SSE hook for pipeline progress
│   ├── useDocumentUpload.ts
│   └── useCitationHighlight.ts         # Cross-panel citation sync
├── lib/
│   ├── api.ts                          # TanStack Query API calls
│   └── utils.ts
└── types/
    ├── document.ts
    ├── draft.ts
    └── pattern.ts
```

---

## Key UX Interactions

### Cross-Panel Citation Sync
Clicking any citation reference (in draft, evidence card, or doc viewer) highlights all three panels simultaneously. Implemented via Zustand `activeCitationId` shared state.

### Real-Time Processing Stream
SSE endpoint `/api/documents/{id}/stream` pushes pipeline events. `useProcessingStream` hook updates `ProcessingPipeline` step states live.

### Auto-Save in Editor
TipTap `onUpdate` → debounced 3s → `PATCH /api/drafts/{id}` with current content. Visual "Saved" indicator in toolbar.

### Pattern Application Indicator
Before generating a new draft, if patterns exist, a banner shows: "Applying 5 learned patterns from previous edits." Each applied pattern shows as a collapsible chip in the Evidence Panel.

---

## API Integration Points

| Frontend Action | Backend Endpoint |
|---|---|
| Upload document | `POST /api/documents` |
| Stream processing | `GET /api/documents/{id}/stream` (SSE) |
| Get extracted fields | `GET /api/documents/{id}/extraction` |
| Generate draft | `POST /api/documents/{id}/draft` |
| Get evidence chunks | `GET /api/documents/{id}/evidence` |
| Auto-save editor | `PATCH /api/drafts/{id}` |
| Submit final edits | `POST /api/drafts/{id}/edits` |
| Get patterns | `GET /api/patterns` |
| Get history | `GET /api/documents` |

---

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# → http://localhost:3000
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Visual Design Principles

- Dark navy sidebar, light content area — law firm aesthetic, professional
- Amber highlights for OCR-extracted citations (evokes highlighting a physical document)
- Green for confirmed/grounded content, red for unsupported claims
- No decorative UI — every element serves the workflow
- Keyboard accessible: Tab navigation through panels, `Cmd+S` saves draft, `Cmd+Enter` submits edits
