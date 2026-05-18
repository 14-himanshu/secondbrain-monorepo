# Second Brain

Second Brain is a full-stack knowledge workspace for saving links, notes, videos, and documents in one place. It combines a React dashboard, an Express API, MongoDB storage, and Google OAuth-based integrations for a cleaner personal knowledge system.

## Highlights

- Secure authentication with JWT and Google sign-in
- Content capture for posts, videos, and documents
- Search, filtering, editing, and deletion
- Shareable public brain pages
- Responsive dashboard UI
- AI and integration-ready backend architecture

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, Axios, Tailwind CSS  
**Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, bcrypt, Zod  
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
- `REDIS_URL=...`
- `AI_WORKER_CONCURRENCY=3`
- `NOTION_TOKEN=...`
- `NOTION_API_VERSION=2022-06-28`
