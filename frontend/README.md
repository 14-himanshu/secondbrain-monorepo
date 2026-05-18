# Second Brain Frontend

This package contains the React dashboard and public-facing pages for Second Brain.

## Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS

## Local Setup

```bash
cd frontend
npm install
```

Create a `.env` file from `.env.example` and set:

- `VITE_BACKEND_URL`

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Notes

- The frontend expects the backend API to be reachable at the URL in `VITE_BACKEND_URL`.
- Google sign-in uses a top-level browser redirect to the backend OAuth start route.
