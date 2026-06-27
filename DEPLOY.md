# Party Trivia — deploy guide

Same architecture as Midnight Mafia (Colyseus server + React/Vite client), so the
Render setup is identical. Two services from one repo.

## 1. Server — Render Web Service
- Root directory: `server`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Instance: Starter ($7, always-on). **Do NOT enable autoscaling** — room codes live
  in this single instance's memory (`codeToRoom`). Multiple rooms on one instance are
  fine; multiple instances would break code lookup.
- After deploy, visiting the service URL should print "Party Trivia server OK".

## 2. Client — Render Static Site
- Root directory: `client`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_SERVER_URL = https://<your-server>.onrender.com`
  (NO trailing slash). Vite bakes this in at build time, so after changing it use
  **Clear build cache & deploy**.
- SPA rewrite: add a rewrite rule `/*  ->  /index.html` (Static Site → Redirects/Rewrites)
  so the `?code=` join links work on refresh.

## 3. Custom domain (optional)
Same as before: add the domain on the Static Site, point Cloudflare CNAMEs (www + @)
at the onrender host on **grey cloud (DNS only)** so Render can issue TLS.

## How it's used
- Open the app → "Host / edit quizzes" → build a quiz (questions, options, mark the
  correct one) → "Host". Quizzes are saved in that browser (export/import as JSON to
  back up or move devices).
- The host screen (display) shows a room code + QR. Guests open the site on their
  phones, type their name + code, and answer each question. Faster correct answers
  score more. At the end you get a podium plus fun award categories.


## Cloud quiz storage (optional — free)
By default quizzes live in the host browser (localStorage). To store them in a real
database so they're shared across devices and backed up, set two env vars on the
SERVER service:

- `DATABASE_URL` — a Postgres connection string. Free + permanent options:
  - **Neon** (neon.tech): create a project, copy the connection string (it includes
    `?sslmode=require`). Free tier doesn't expire.
  - **Supabase** (supabase.com): Project → Settings → Database → Connection string (URI).
  - (Render Postgres also works, but its free tier is deleted after 30 days; paid ~$7/mo.)
- `HOST_KEY` — any secret passphrase you choose. The admin panel asks for this once to
  unlock your quizzes; it's stored in your browser after that.

Both must be set to enable cloud storage (so the question bank is never exposed without
the key). The server auto-creates the `quizzes` table on boot. Leave these unset and the
app stays on localStorage — no behaviour change.

Endpoints (host-key protected): `GET/PUT/DELETE /api/quizzes`, plus `GET /api/db-status`.

## Notes / easy upgrades
- Quizzes live in the host browser's localStorage (no database needed). To share a
  question bank across devices or co-edit, move quizzes into a DB (e.g. Supabase).
- Photo questions (e.g. "whose baby photo is this?") would need image upload + hosting.
- Read-aloud questions are built in. By default the display uses the browser voice;
  to get a real voice that also works on TV browsers, set ELEVENLABS_API_KEY on the
  SERVER service (see server/.env.example). Google Cloud TTS is also supported and
  takes priority if GOOGLE_TTS_API_KEY is set. The display has a Voice toggle + Test.
