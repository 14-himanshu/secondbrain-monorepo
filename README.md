# Second Brain

Second Brain is a full-stack content-saving app for collecting useful links in one place. Users can sign up, save posts, videos, and documents, organize them in a clean dashboard, edit or delete entries, and share their public brain with a generated link.

## Live Links

- Frontend: [https://secondbrain-chi.vercel.app](https://secondbrain-chi.vercel.app)
- Backend: [https://secondbrain-monorepo.onrender.com](https://secondbrain-monorepo.onrender.com)
- GitHub: [https://github.com/14-himanshu/secondbrain-monorepo](https://github.com/14-himanshu/secondbrain-monorepo)

## What The Project Does

The app helps users build a personal knowledge hub by saving important internet content in one dashboard.

Users can:

- create an account and sign in securely
- save links as `post`, `video`, or `document`
- search and filter saved content
- edit titles and delete saved items
- view styled content preview cards
- generate a shareable public brain link

## Features

- JWT-based authentication
- password validation with Zod
- bcrypt password hashing
- create, read, update, and delete content
- share-brain link generation
- search and type-based filtering
- responsive React dashboard UI
- deployed frontend and backend

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router

### Backend

- Node.js
- Express
- TypeScript
- Zod
- JWT
- bcrypt
- Mongoose

### Database and Hosting

- MongoDB Atlas
- Vercel for frontend deployment
- Render for backend deployment

## Architecture

```text
Frontend (React/Vite)
        |
        v
Backend API (Express/Node.js)
        |
        v
MongoDB Atlas
```

## Main Pages

- Signup page
- Signin page
- Dashboard
- Public shared brain view

## API Overview

### Auth

- `POST /api/v1/signup` - create a user account
- `POST /api/v1/signin` - sign in and receive a token

### Content

- `POST /api/v1/content` - add content
- `GET /api/v1/content` - fetch user content
- `PUT /api/v1/content` - update content title
- `DELETE /api/v1/content` - delete content

### Share Brain

- `POST /api/v1/brain/share` - create or remove a shareable brain link
- `GET /api/v1/brain/:shareLink` - fetch public shared brain content

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/14-himanshu/secondbrain-monorepo.git
cd secondbrain-monorepo
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

Backend example: [backend/.env.example](/Users/himanshupandey/Desktop/secondbrain-monorepo/backend/.env.example:1)

Frontend example: [frontend/.env.example](/Users/himanshupandey/Desktop/secondbrain-monorepo/frontend/.env.example:1)

Backend env vars:

- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_PASSWORD` - secret used to sign auth tokens
- `PORT` - optional, defaults to `3000`
- `FRONTEND_URL` - allowed frontend origin for CORS

Frontend env vars:

- `VITE_BACKEND_URL` - backend base URL

### 4. Run the apps

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Deployment Notes

### Render

- root directory: `backend`
- build command: `npm install`
- start command: `npm start`

Required backend env vars:

- `MONGODB_URI`
- `JWT_PASSWORD`
- `FRONTEND_URL`

### Vercel

- root directory: `frontend`
- framework preset: `Vite`

Required frontend env vars:

- `VITE_BACKEND_URL`

## Project Summary

Second Brain is a practical full-stack MERN-style project focused on authentication, content management, search, sharing, and deployment. It demonstrates how to build and ship a clean production-style app using React, Express, MongoDB Atlas, Render, and Vercel.
