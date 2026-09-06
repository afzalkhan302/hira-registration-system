# HIRA Registration — MERN

Online short-course registration for HIRA Model School & Sakhakot Academy
(DIT, Web Development, Pharmacy), rebuilt on the MERN stack.

- **client/** — React (Vite) frontend. Same UI/design as before.
- **server/** — Node + Express REST API, MongoDB (Mongoose), JWT admin auth.

The passport photo is **optional** and stored as a resized base64 string on the
application document — no paid object storage (no Firebase Blaze, no S3).

## Run locally

Prerequisites: Node 18+, and MongoDB (local `mongod`, or a free MongoDB Atlas cluster).

```bash
# 1) Backend
cd server
cp .env.example .env         # then edit: MONGODB_URI, JWT_SECRET, ADMIN_* , CORS_ORIGINS
npm install
npm run seed                 # creates the admin account from ADMIN_USERNAME/ADMIN_PASSWORD
npm run dev                  # http://localhost:5000

# 2) Frontend (new terminal)
cd client
npm install
npm run dev                  # http://localhost:5173  (proxies /api to :5000)
```

Registration form: <http://localhost:5173/> · Staff dashboard: <http://localhost:5173/admin>

## Test

```bash
cd server && npm test        # full REST API test against an in-memory MongoDB
cd client && npm run build   # verifies the React app compiles
```

## Environment variables

**server/.env** — `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD` (used once by `npm run seed`), `CORS_ORIGINS`.

**client/.env** — `VITE_API_URL` (empty in dev; the backend origin in production).

## Deploy (free tiers — do not require any paid service)

- **Database:** MongoDB Atlas M0 (free). Put its URI in `server/.env` → `MONGODB_URI`.
- **Backend:** Render / Railway / Cyclic free tier. Set the same env vars there.
- **Frontend:** Vercel. Set `VITE_API_URL` to the deployed backend URL, add the
  Vercel domain to the backend's `CORS_ORIGINS`.

## Security

- Admin password is never stored in plain text — only a bcrypt hash, created by
  `npm run seed` from an env var.
- All secrets (DB URI, JWT secret, admin password) live in `server/.env`, never
  in the frontend or the database.
- Admin-only endpoints require a valid JWT; the public can only create applications.
