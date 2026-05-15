# PSL-Flow: Intelligent Legal Document Assistant

**PSL-Flow** is an end-to-end AI-powered workflow designed for **Pearson Specter Litt** to process messy legal documents, perform grounded retrieval, generate high-quality legal drafts, and learn from operator edits over time.

---

## 🚀 Overview

The system addresses the core challenges of legal AI:
1.  **Messy Input Handling**: Robust OCR and structured extraction from low-res, scanned, or handwritten documents.
2.  **Grounded Drafting**: Every claim in a generated draft is anchored to source evidence via verifiable citations.
3.  **Active Learning Loop**: A "Pattern Learner" engine that analyzes human edits to extract stylistic and substantive preferences for future drafts.

---

## 🛠️ Architecture

The project is split into a **FastAPI** backend and a **Next.js** frontend.

### **Backend (Python)**
-   **OCR & Extraction**: Google Gemini 2.0/2.5 Flash (Vision) for handling messy scans and extracting structured metadata (Case Nos, Parties, Dates).
-   **Retrieval (RAG)**: 
    -   **ChromaDB**: Semantic search for conceptual matching.
    -   **BM25 (Rank-BM25)**: Keyword-exact retrieval to ensure specific legal terminology isn't missed.
-   **Drafting Engine**: A multi-stage pipeline that combines retrieved evidence with **Learned Patterns** to produce drafts in the firm's preferred voice.
-   **Pattern Learner**: Uses `difflib` and LLM analysis to compare operator-edited drafts with AI defaults, extracting reusable "Writing Style Patterns."

### **Frontend (React/Next.js)**
-   **3-Panel Workspace**: A professional "Commander" view showing the source document, retrieved evidence, and the interactive draft simultaneously.
-   **Real-time Analytics**: Visualized metrics for OCR confidence and pattern application.
-   **Payflow-Inspired UI**: A premium, high-contrast dashboard for modern legal intelligence.

---

## 📦 Setup Instructions

### **Prerequisites**
-   Python 3.10+
-   Node.js 18+
-   Google Gemini API Key

### **1. Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# Add your GOOGLE_API_KEY and OPENROUTER_API_KEY to .env
uvicorn main:app --reload --port 8000
```

### **2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

---

## ⚖️ Rubric Compliance

### **1. Document Processing (25 pts)**
We use Gemini Vision for all uploads. This allows us to handle rotated scans, handwritten notes, and low-contrast text that traditional OCR (like Tesseract) fails on. Structured fields (Case No, Parties) are extracted into a JSON schema during the first pass.

### **2. Retrieval and Grounding (25 pts)**
We implement a **Hybrid Search** (Semantic + Keyword). All drafts include `[N]` citations. Clicking a citation in the UI immediately highlights the exact source chunk in the side panel, allowing for 100% manual verification.

### **3. Draft Quality (10 pts)**
Drafts are generated in Markdown with professional legal formatting. They prioritize factual accuracy over "sounding confident," explicitly marking unsupported claims if evidence is missing.

### **4. Improvement from Edits (25 pts)**
When an operator saves an edit, the `PatternLearner` compares `Draft V1` and `Draft V2`. It identifies if the user prefers shorter sentences, specific legal phrasing, or different section ordering. These are saved as **Style Patterns** and injected into the prompt for the next document.

---

## 📐 Assumptions & Tradeoffs
-   **Assumption**: Documents are under 200 pages. For larger files, a map-reduce strategy would be needed.
-   **Tradeoff**: We use a local ChromaDB instance for simplicity/speed in this assessment. In a production environment, we would transition to a managed vector store (e.g., Pinecone or pgvector).
-   **Choice**: We prioritized "Grounded Retrieval" over "Creative Writing" to ensure legal safety.

