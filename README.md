<div align="center">
  <img src="frontend/public/favicon.svg" alt="Second Brain Logo" width="80" height="80" />
  <br/>
  <h1>🧠 Second Brain</h1>
  <p>
    <strong>Your AI-Powered Knowledge Base</strong>
  </p>
  <p>
    Stop losing ideas. Second Brain captures, summarizes, and connects everything you read, watch, and discover — so you never forget again.
  </p>

  <div>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </div>
</div>

<br/>

## ✨ Key Features

- **🔒 Secure Authentication:** JWT and Google Sign-in with secure account merging.
- **📥 Content Capture:** Save and organize links, YouTube videos, tweets, and documents instantly.
- **🤖 AI-Powered Insights:** Chat with your knowledge base. The AI provides descriptive inline citations to the exact source documents.
- **🔗 Public Sharing:** Generate secure, shareable public brain pages in one click.
- **💎 Premium UI & Themes:** A professional, fully theme-adaptive (Dark/Light) UI with glassmorphic elements and smooth transitions.
- **⚙️ Advanced Settings Hub:** Deep-linked settings for Billing, AI Preferences, Security, and Profile Management.
- **💳 Pro Tier Integration:** Razorpay payment integration for premium upgrades with an elegant upgrade modal.

---

## 🏗️ Project Structure

This project uses a monorepo architecture:

```text
secondbrain-monorepo/
├── backend/         # Express API, Auth, AI integrations, background workers
├── frontend/        # React (Vite) dashboard and public marketing pages
└── packages/
    └── contracts/   # Shared TypeScript contracts for type safety across the stack
```

---

## 🚀 Getting Started

### 1. Install Dependencies

Install packages across the entire monorepo:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables

Use the provided example files (`backend/.env.example` and `frontend/.env.example`) to set up your `.env` files.

#### **Backend (`backend/.env`)**
- `PORT`
- `MONGODB_URI`
- `JWT_PASSWORD`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY`
- `REDIS_URL`
- `AI_WORKER_CONCURRENCY`
- `GROQ_API_KEY` / `OPENAI_API_KEY`
- `NOTION_TOKEN`

#### **Frontend (`frontend/.env`)**
- `VITE_BACKEND_URL`

### 3. Run Locally

Start both servers in separate terminal windows:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🛠️ Available Scripts

### Backend
- `npm run build` — Compiles TypeScript to `dist`
- `npm run dev` — Starts the development server with hot-reload
- `npm test` — Runs the test suite

### Frontend
- `npm run build` — Builds the Vite app for production
- `npm run dev` — Starts the Vite dev server
- `npm run lint` — Lints the frontend codebase
- `npm test` — Runs the frontend tests

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

### **Sharing**
- `POST /api/v1/brain/share` — Generate a shareable link
- `GET /api/v1/brain/:shareLink` — Access a public brain

---

## ☁️ Deployment Environment Variables

If you are deploying to **Render** (Backend) and **Vercel** (Frontend), ensure these are set in your dashboards:

### **Vercel (Frontend)**
- `VITE_BACKEND_URL=https://<your-render-service>.onrender.com`

### **Render (Backend)**
- `PORT=5000`
- `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
- `MONGODB_URI=...`
- `JWT_PASSWORD=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://<your-render-service>.onrender.com/auth/google/callback`
- `TOKEN_ENCRYPTION_KEY=...`
- `GROQ_API_KEY=...`
- `OPENAI_API_KEY=...`
- `REDIS_URL=...`
- `AI_WORKER_CONCURRENCY=3`
- `NOTION_TOKEN=...`

---

<div align="center">
  <p>Built with ❤️ for modern knowledge workers.</p>
</div>
