# Second Brain

Second Brain is a personal knowledge management platform and autonomous AI vault. It captures, extracts, summarizes, and connects web links, documents, articles, and media into a searchable vector database. Users can interact with their knowledge base using a LangGraph-powered conversational agent that streams reasoning and tool calls in real time.

---

## Architecture Overview

The repository is organized as a monorepo containing the following components:

```text
secondbrain-monorepo/
├── backend/                  # Node.js + Express.js API, authentication, and background workers
│   ├── src/
│   │   ├── controllers/      # Route controllers (AI, Auth, Billing, Content, Integrations, Search)
│   │   ├── services/         # Extraction pipelines, embeddings, Groq LLM, Razorpay
│   │   ├── queue/            # BullMQ background workers and Redis connections
│   │   ├── routes/           # Express routers
│   │   ├── cron.ts           # Automatic recovery for stuck extraction tasks
│   │   └── db.ts             # Mongoose schemas (User, Content, Link, Insight)
├── frontend/                 # React 19 + Vite web client
│   ├── src/
│   │   ├── components/       # UI components, modals, sidebar, navigation
│   │   ├── pages/            # Dashboard, Settings, Public View, Signin, Signup
│   │   └── services/         # API clients for backend communication
└── packages/
    ├── agent/                # Python FastAPI + LangGraph autonomous agent microservice
    │   ├── main.py           # FastAPI entrypoint with Server-Sent Events (SSE) streaming
    │   ├── agent.py          # LangGraph state machine definition
    │   └── tools.py          # Agent tools: search_brain, get_recent_items, read_live_url
    ├── contracts/            # Shared TypeScript types, enums, and DTO contracts
    └── extension/            # Manifest V3 Chrome Extension page clipper built with React + Vite
```

---

## Core Features

- Autonomous LangGraph Agent: Uses LangGraph with Llama 3.3-70B on Groq to ground answers in saved content, search the vault with vector similarity, and browse live URLs via Jina Reader.
- Real-Time SSE Streaming: Streams tokens, status indicators, and tool executions progressively to the client.
- Multi-Source Content Ingestion: Automatically ingests URLs, YouTube video metadata, articles, and documents. Uses Mozilla Readability and Jina Reader for clean content extraction.
- Semantic Vector Search: Generates embeddings using Xenova MiniLM-L6-v2 and performs hybrid similarity searches using MongoDB Atlas Vector Search.
- Chrome Extension Clipper: One-click browser extension to save, tag, and annotate web pages directly to the database.
- Public Brain Sharing: Generate public or private sharing links for curated vault views without exposing credentials.
- Account Security: Bcrypt password hashing, select-disabled password fields in database queries, and JWT tokens with 30-day expirations.
- Subscription and Billing: Integrated Razorpay checkout and verification flow for tier upgrades.

---

## Prerequisites

- Node.js (version 18 or higher)
- npm (version 9 or higher)
- Python (version 3.11 or higher)
- MongoDB Atlas cluster with Vector Search configured
- Groq Cloud API key
- Redis instance (optional for local development, recommended for production task queues)

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/14-himanshu/secondbrain-monorepo.git
cd secondbrain-monorepo
```

### 2. Install Dependencies

**Shared Contracts & Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

**Python AI Agent:**
```bash
cd ../packages/agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Chrome Extension:**
```bash
cd ../extension
npm install
```

---

## Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `5001` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_PASSWORD` | Secret string for signing authentication tokens | 64-character random hex string |
| `GROQ_API_KEY` | API key for Groq Cloud | `gsk_...` |
| `GROQ_MODEL` | Primary model for extraction and agent | `llama-3.3-70b-versatile` |
| `GROQ_FALLBACK_MODEL`| Fallback model for fast summarization | `llama-3.1-8b-instant` |
| `PYTHON_AGENT_URL` | URL to the Python LangGraph microservice | `http://127.0.0.1:8000/chat` |
| `REDIS_URL` | Redis connection URL for queues and distributed locks | `redis://localhost:6379` |
| `AI_WORKER_CONCURRENCY`| Worker concurrency for background extraction | `3` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `<id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI`| Google OAuth callback redirect URL | `http://localhost:5001/auth/google/callback` |
| `TOKEN_ENCRYPTION_KEY`| 32-byte Base64 key for securing stored tokens | 32-byte Base64 string |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay Key Secret | `yw7cf...` |
| `JINA_API_KEY` | Jina Reader key for web parsing | `jina_...` |

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | Base URL of the backend API | `http://localhost:5001` |
| `VITE_API_TIMEOUT_MS`| Request timeout in milliseconds | `60000` |

### Python Agent (`packages/agent/.env`)

Copy `packages/agent/.env.example` to `packages/agent/.env`:

```bash
cp packages/agent/.env.example packages/agent/.env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | FastAPI server port | `8000` |
| `GROQ_API_KEY` | Groq Cloud API key | `gsk_...` |
| `GROQ_MODEL` | LangGraph agent model | `llama-3.3-70b-versatile` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `FRONTEND_URL` | Allowed frontend origin | `http://localhost:5173` |
| `BACKEND_URL` | Base URL of the backend | `http://localhost:5001` |
| `ALLOWED_ORIGINS` | Comma-separated list of CORS origins | `http://localhost:5173,http://localhost:5001` |
| `JINA_API_KEY` | Jina Reader key for live URL scraping | `jina_...` |

---

## Running the Application

Run each component in separate terminal sessions:

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
The server will start on `http://localhost:5001`.

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
The dashboard interface will be available at `http://localhost:5173`.

### Terminal 3: Python AI Agent
```bash
cd packages/agent
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
The agent service will listen on `http://localhost:8000`.

### Terminal 4: Chrome Extension (Optional)
```bash
cd packages/extension
npm run dev
```
Load the extension in Google Chrome by navigating to `chrome://extensions`, enabling Developer Mode, clicking "Load unpacked", and selecting `packages/extension/dist`.

---

## API Reference

### Authentication
- `POST /api/v1/signup`: Register a new user account (enforces 8-character minimum password).
- `POST /api/v1/signin`: Authenticate with username or email and password.
- `GET /api/v1/auth/google/start`: Start Google OAuth authentication.
- `POST /api/v1/auth/exchange`: Exchange temporary Google OAuth code for application JWT.

### Content
- `GET /api/v1/content`: List all saved notes and content for the authenticated user.
- `POST /api/v1/content`: Create a new content item.
- `PUT /api/v1/content`: Update title, description, or tags for an item.
- `DELETE /api/v1/content`: Delete an item by ID.
- `POST /api/v1/content/:id/extract`: Trigger extraction, summarization, and embedding pipeline.
- `GET /api/v1/content/:id/connections`: Retrieve semantic connections for a specific note.

### Search & Sharing
- `GET /api/v1/search?q=query`: Hybrid vector and keyword search scoped to the user.
- `GET /api/brain/share-status`: Get public sharing status for the user vault.
- `POST /api/brain/share`: Enable, disable, or regenerate a public brain share link.
- `GET /api/brain/share/:shareId`: View a public shared brain without authentication.

### AI & Agents
- `POST /api/v1/ai/chat`: Streaming SSE endpoint proxying conversational queries to the Python agent.
- `POST /api/v1/ai/tag`: Automatic tag prediction for a given URL.
- `GET /api/v1/ai/queue-metrics`: BullMQ ingestion queue metrics and active job counts.
- `POST /api/v1/internal/embed`: Local embedding generation endpoint.

### User & Billing
- `GET /api/v1/me`: Retrieve current user profile and credit balances.
- `PUT /api/v1/me`: Update username, bio, avatar, and AI tone preferences.
- `POST /api/v1/user/password`: Change account password.
- `DELETE /api/v1/user/account`: Permanently delete account and all associated data.
- `POST /api/v1/billing/checkout`: Initialize Razorpay subscription order.
- `POST /api/v1/billing/verify`: Verify Razorpay payment signature.

---

## Production Deployment

### Render (Backend & Python Agent)

1. Create a Web Service for the Node.js backend:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - Set all backend environment variables from the table above.

2. Create a Web Service for the Python Agent:
   - Root Directory: `packages/agent`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Set all agent environment variables from the table above.

### Vercel (Frontend)

1. Import the repository into Vercel.
2. Set Root Directory to `frontend`.
3. Set Framework Preset to `Vite`.
4. Configure Environment Variables:
   - `VITE_BACKEND_URL`: The production URL of your Render backend service.

---

## Testing

Run backend unit tests:
```bash
cd backend
npm test
```

Run TypeScript compilation check:
```bash
cd backend
npm run build
cd ../frontend
npm run build
```

---

## License

This project is licensed under the ISC License.
