# Second Brain

Second Brain is a full-stack knowledge workspace for saving links, notes, videos, and documents in one place. It combines a React dashboard, an Express API, MongoDB storage, and Google OAuth-based integrations for a cleaner personal knowledge system.

## Highlights

- Secure authentication with JWT and Google sign-in
- Email collection during signup with legacy Google OAuth account merging
- Content capture for posts, videos, and documents
- Search, filtering, editing, and deletion
- Shareable public brain pages
- Responsive dashboard UI
- **Premium Razorpay Pro Plan Upgrade**: Elegant payment integration with an animated glassmorphic Upgrade Modal on quota exhaustion, and a dedicated high-fidelity Payment Success page (`/payment-success`)
- **Settings Hub**: Custom tabs (General, Security, Integrations, AI Preferences, Billing) supporting deep-linking (`/settings?tab=billing`), profile updating (custom avatars), password changes, and account deletion
- **Descriptive Ask AI Citations**: AI chat answers with grounded context, displaying descriptive inline badges with truncated card titles (e.g., `[1] Card Title...`) and a interactive Cited Sources list at the bottom of response bubbles
- **Workspace UI Enhancements**: Type-specific icons for Recents, stateful dashboard redirection for manual extractions, and de-congested profile actions

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, Axios, Tailwind CSS, TanStack Query  
**Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, bcrypt, Zod, Razorpay  
**Shared:** `@secondbrain/contracts`

## Project Structure

```text
secondbrain-monorepo/
├── backend/         # Express API, auth, integrations, workers
├── frontend/        # React dashboard and public pages
└── packages/
    └── contracts/   # Shared TypeScript contracts
```

## Getting Started

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Use the example files in `backend/.env.example` and `frontend/.env.example` as a starting point.

**Backend**

- `PORT`
- `MONGODB_URI`
- `JWT_PASSWORD`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_SCOPES`
- `TOKEN_ENCRYPTION_KEY`
- `REDIS_URL`
- `AI_WORKER_CONCURRENCY`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `HF_TOKEN`
- `NOTION_TOKEN`
- `NOTION_API_VERSION`

**Frontend**

- `VITE_BACKEND_URL`

### 3. Run locally

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Available Scripts

**Backend**
- `npm run build`
- `npm run dev`
- `npm test`

**Frontend**
- `npm run build`
- `npm run dev`
- `npm test`
- `npm run lint`

## API Overview

**Auth**
- `POST /api/v1/signup`
- `POST /api/v1/signin`
- `GET /api/v1/auth/google/start`
- `GET /auth/google/callback`
- `POST /api/v1/auth/exchange`

**Content**
- `POST /api/v1/content`
- `GET /api/v1/content`
- `PUT /api/v1/content`
- `DELETE /api/v1/content`

**Sharing**
- `POST /api/v1/brain/share`
- `GET /api/v1/brain/:shareLink`

## Notes

- Google OAuth is started through a full browser redirect, not fetch/XHR.
- Keep backend and frontend ports aligned with the environment variables.
- Never commit real secrets to the repository.

## Deployment Environment Variables

**Vercel frontend**

- `VITE_BACKEND_URL=https://<your-render-service>.onrender.com`

**Render backend**

- `PORT=5000`
- `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
- `MONGODB_URI=...`
- `JWT_PASSWORD=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://<your-render-service>.onrender.com/auth/google/callback`
- `GOOGLE_SCOPES=https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email`
- `TOKEN_ENCRYPTION_KEY=...`
- `GROQ_API_KEY=...`
- `OPENAI_API_KEY=...`
- `HF_TOKEN=...` (optional; used by AI provider test scripts)
- `REDIS_URL=...`
- `AI_WORKER_CONCURRENCY=3`
- `NOTION_TOKEN=...`
- `NOTION_API_VERSION=2022-06-28`
