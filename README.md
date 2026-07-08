<div align="center">
  <img src="frontend/public/favicon.svg" alt="Second Brain Logo" width="80" height="80" />
  <br/>
  <h1>🧠 Second Brain</h1>
  <p>
    <strong>Your AI-Powered Knowledge Base — Now with a LangGraph Autonomous Agent & Chrome Extension</strong>
  </p>
  <p>
    Stop losing ideas. Second Brain captures, summarizes, and connects everything you read, watch, and discover — then lets you chat with it using a real autonomous AI agent that streams its thinking in real-time.
  </p>

  <div>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/LangGraph-000000?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </div>
</div>

<br/>

## ✨ Key Features

- **🤖 LangGraph Autonomous Agent:** A real AI agent (not just a chatbot) built with LangGraph + Llama 3.3-70B on Groq. It autonomously decides which tools to invoke, streams its reasoning live, and grounds every answer in your saved content — zero hallucinations.
- **⚡ Real-time Streaming:** Token-by-token SSE streaming with live tool-use indicators ("Searching your brain…", "Scraping the web…") so you always know what the agent is doing.
- **🧩 Chrome Extension Clipper:** Save any page to your Second Brain in one click, directly from your browser toolbar. Grabs the URL, title, and lets you tag and annotate before saving.
- **📥 Multi-Source Content Capture:** Save and organize links, YouTube videos, tweets, Notion documents, and web articles. Auto-extracts full text, metadata, and vector embeddings.
- **🔍 Semantic Vector Search:** Search by concept, not just keywords. Uses MongoDB Atlas Vector Search with OpenAI embeddings to find relevant knowledge across your entire vault.
- **🔒 Secure Authentication:** JWT authentication and Google Sign-in with secure account merging.
- **🔗 Public Brain Sharing:** Generate secure, shareable public brain pages in one click.
- **💎 Premium UI & Themes:** Professional, fully theme-adaptive (Dark/Light) UI with glassmorphic elements and smooth transitions.
- **⚙️ Settings Hub:** Deep-linked settings for Billing, AI Preferences, Security, and Profile Management.
- **💳 Pro Tier Integration:** Razorpay payment integration for premium upgrades.

---

## 🏗️ Project Structure

This project uses a monorepo architecture:

```text
secondbrain-monorepo/
├── backend/                  # Express.js API, Auth, AI integrations, background workers
├── frontend/                 # React (Vite) dashboard and public marketing pages
└── packages/
    ├── agent/                # Python FastAPI + LangGraph autonomous AI agent
    │   ├── main.py           # FastAPI server, /chat SSE streaming endpoint
    │   ├── agent.py          # LangGraph state machine definition
    │   ├── tools.py          # Agent tools: search_brain, read_live_url
    │   └── requirements.txt  # Python dependencies
    └── extension/            # Chrome Extension (Manifest V3) built with Vite + React
        ├── src/App.tsx       # Popup UI with login + page clipper
        ├── manifest.json     # Chrome extension manifest
        └── vite.config.ts    # CRX Vite plugin configuration
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- MongoDB Atlas account (with Vector Search enabled)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- OpenAI API key (for vector embeddings)

### 1. Install Dependencies

**Backend & Frontend:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**Python Agent:**
```bash
cd packages/agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Chrome Extension:**
```bash
cd packages/extension && npm install
```

### 2. Configure Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in all values.

#### **Backend (`backend/.env`)**
| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5001`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_PASSWORD` | Secret for signing JWT tokens |
| `FRONTEND_URL` | URL of the frontend (e.g. `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `TOKEN_ENCRYPTION_KEY` | 32-byte key for encrypting OAuth tokens |
| `REDIS_URL` | Redis for background job queue (optional) |
| `AI_WORKER_CONCURRENCY` | Number of parallel AI jobs (default: `3`) |
| `GROQ_API_KEY` | Groq API key for the Python agent |
| `OPENAI_API_KEY` | OpenAI key for generating vector embeddings |
| `NOTION_TOKEN` | Notion integration token (optional) |

#### **Frontend (`frontend/.env`)**
| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | URL of the backend (e.g. `http://localhost:5001`) |

### 3. Run Locally

Start all three services in **separate terminal windows**:

**Backend (Node.js):**
```bash
cd backend
npm run dev
```

**Frontend (React):**
```bash
cd frontend
npm run dev
```

**Python AI Agent:**
```bash
cd packages/agent
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Chrome Extension (dev build + hot reload):**
```bash
cd packages/extension
npm run dev
```

Then in Chrome, go to `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, and select `packages/extension/dist`.

---

## 🤖 AI Agent Architecture

The Python agent at `packages/agent/` is a **LangGraph** state machine that orchestrates an autonomous reasoning loop:

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│  chatbot node (Llama 3.3-70B)   │ ◄─────────────────┐
│  Decides: answer or use a tool  │                   │
└───────────────┬─────────────────┘                   │
                │ Tool call?                           │
                ▼                                      │
┌─────────────────────────────────┐          ┌────────┴────────┐
│  search_brain                   │          │  Final Answer   │
│  MongoDB Atlas $vectorSearch    │          │  Streamed SSE   │
├─────────────────────────────────┤          └─────────────────┘
│  read_live_url                  │
│  Jina AI web scraper            │
└───────────────┬─────────────────┘
                │ Result
                └──────────────────►  (back to chatbot node)
```

**Key design decisions:**
- **Zero hallucinations:** System prompt strictly constrains the model to only use retrieved facts.
- **Async throughout:** All nodes and tools use `async`/`await` + `httpx` for non-blocking I/O.
- **SSE streaming:** Uses LangGraph's `astream_events` to push `chunk`, `action`, `metadata`, and `error` events to the frontend.

---

## 🛠️ Available Scripts

### Backend
| Command | Description |
|---|---|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run test suite |

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Lint codebase |

### Python Agent
| Command | Description |
|---|---|
| `uvicorn main:app --reload --port 8000` | Start with hot-reload |

### Chrome Extension
| Command | Description |
|---|---|
| `npm run dev` | Build with HMR for development |
| `npm run build` | Build production `dist/` to load unpacked |

---

## 📡 API Overview

### **Authentication**
- `POST /api/v1/signup`
- `POST /api/v1/signin`
- `GET /api/v1/auth/google/start`
- `POST /api/v1/auth/exchange`

### **Content Management**
- `GET /api/v1/content` — Fetch all knowledge nodes
- `POST /api/v1/content` — Create a new node
- `PUT /api/v1/content` — Update an existing node
- `DELETE /api/v1/content` — Delete a node
- `POST /api/v1/content/:id/extract` — Trigger AI extraction for a node

### **AI Agent**
- `POST /api/v1/ai/chat` — (Node proxy → Python agent) Stream SSE chat response

### **Search & Sharing**
- `GET /api/v1/search` — Semantic vector search
- `POST /api/v1/brain/share` — Generate a shareable link
- `GET /api/v1/brain/:shareLink` — Access a public brain

---

## ☁️ Deployment

### **Render (Backend + Python Agent)**
Run the Node backend and Python agent as two separate Render web services.

**Node Backend env vars:**
- `PORT=5001`, `FRONTEND_URL`, `MONGODB_URI`, `JWT_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `REDIS_URL`

**Python Agent start command:**
```bash
cd packages/agent && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000
```

### **Vercel (Frontend)**
- `VITE_BACKEND_URL=https://<your-render-node-service>.onrender.com`

### **Chrome Extension (Production)**
Build with `npm run build` in `packages/extension`, then submit the `dist/` folder to the Chrome Web Store.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://x.com/hpandey_14">@hpandey_14</a> — for modern knowledge workers.</p>
</div>
