# Nvn..B OS: AI-Powered Behavioral Analytics & QA Suite


**Nvn..B OS** is a specialized high-level AI Quality Assurance (QA) Engine. Developed for e-commerce brands, its primary function is to transform raw, unstructured chat logs into a professional, data-driven "Health Report," identifying sales friction and optimizing AI performance.

---

## 🧐 The Problem & Our Solution

### **The Problem**
Brands deploying AI agents often struggle to monitor them at scale. Issues like "Checkout Friction" (where AI blocks a sale) or "Hallucination" (where AI gives false info) often go undetected, leading to lost revenue and customer frustration.

### **The Solution**
**Nvn..B OS** automate the audit process. It doesn't just track metrics; it **understands behavior**. By reconstructing the "Story" of every customer journey, the engine identifies exactly *why* a sale failed and *how* to fix the AI's logic.

---

## 🛠️ Technical Implementation

### **1. Backend: The Intelligence Layer (FastAPI)**
- **Data Orchestration**: A customized "Story Builder" that re-indexes raw JSON message dumps into chronological, identity-linked transcripts.
- **Master Evaluation Engine**: Powered by **Gemini 1.5 Pro**, our specialized prompt triggers a multi-dimensional audit pass (Intent, Sentiment, Accuracy, and Logic).
- **Persistent Caching**: Utilizes a local JSON caching system (`analysis_cache.json`) to minimize latency and ensure the dashboard is responsive.

### **2. Frontend: Sales Intelligence Dashboard (Next.js)**
- **Glassmorphic UI**: A premium, high-fidelity design system focused on visual clarity.
- **Inquiry Intent Map**: Visualizes the distribution of user needs (Ordering, Support, Inquiry).
- **Product Interest Cloud**: Identifies which items are trending in customer conversations.
- **Checkout Friction Feed**: A live diagnostic feed with "Agent Improvement Rules" for developers to implement immediately.

---

## 🔄 Project Workflow (End-to-End)

1.  **Ingestion**: Raw chat logs are ingested via the API from the brand's message database.
2.  **Reconstruction**: The backend groups messages by `conversationId` and sorts them to provide the AI with full conversational context.
3.  **Auditing**: The transcript is passed through our **Senior QA Lead AI persona**, which detects:
    - **Friction Points**: Technical or logical hurdles in checkout.
    - **Hallucinations**: False links or product claims.
    - **Weakness Radar**: Cognitive areas where the AI needs more training.
4.  **Reporting**: Final analytics are pushed to the dashboard, where they are visualized through high-contrast charts.

---

## 🚀 How to Run the Project

### **Step 1: Backend Setup**
```bash
cd scaling-palm-tree/backend
py -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# Ensure your GEMINI_API_KEY is in the .env file
uvicorn app.main:app --reload
```

### **Step 2: Frontend Setup**
```bash
cd scaling-palm-tree/frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the **Nvn..B OS** Dashboard.

---

## 📊 Analytical Metrics Tracked
- **AI Quality Score**: Aggregate performance metric based on sentiment and accuracy.
- **Purchase Intent**: Percentage of users moving toward checkout.
- **Model Weakness Radar**: 5-point analysis of AI persona, product knowledge, tone, and logic.

---
© 2026 **Nvn..B RESEARCH LABS** // All Rights Reserved
