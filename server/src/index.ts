import http from "http";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { TriviaRoom } from "./rooms/TriviaRoom";
import { codeToRoom } from "./registry";
import { pool, HOST_KEY, DB_ENABLED, initDb, listQuizzes, upsertQuiz, deleteQuiz } from "./db";

const port = Number(process.env.PORT) || 2567;
const app = express();
app.use(cors());

app.get("/", (_req, res) => res.send("Party Trivia server OK"));

// Players resolve a short code to a Colyseus roomId, then join by id.
app.get("/api/room/:code", (req, res) => {
  const roomId = codeToRoom.get(String(req.params.code).toUpperCase());
  if (!roomId) return res.status(404).json({ error: "Room not found" });
  res.json({ roomId });
});

// ---------------- Cloud quiz storage (optional) ----------------
// Enabled when DATABASE_URL + HOST_KEY are set. Protected by a single host key.
if (pool) initDb().then(() => console.log("quiz DB ready")).catch((e) => console.error("DB init failed:", e?.message || e));

app.get("/api/db-status", (_req, res) => res.json({ enabled: DB_ENABLED }));

function requireKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!DB_ENABLED) return res.status(503).json({ error: "cloud storage disabled" });
  if ((req.header("x-host-key") || "") !== HOST_KEY) return res.status(401).json({ error: "bad host key" });
  next();
}

app.get("/api/quizzes", requireKey, async (_req, res) => {
  try { res.json(await listQuizzes()); } catch (e: any) { res.status(500).json({ error: e?.message || "list failed" }); }
});
app.put("/api/quizzes/:id", express.json({ limit: "1mb" }), requireKey, async (req, res) => {
  try { const q = req.body || {}; q.id = String(req.params.id); await upsertQuiz(q); res.json({ ok: true }); }
  catch (e: any) { res.status(500).json({ error: e?.message || "save failed" }); }
});
app.delete("/api/quizzes/:id", requireKey, async (req, res) => {
  try { await deleteQuiz(String(req.params.id)); res.json({ ok: true }); }
  catch (e: any) { res.status(500).json({ error: e?.message || "delete failed" }); }
});

// ---------------- Read questions aloud on the display (optional) ----------------
// Works on TV browsers. Google is preferred when its key is set, else ElevenLabs.
//   Google Cloud TTS (free tier): set GOOGLE_TTS_API_KEY
//   ElevenLabs:                   set ELEVENLABS_API_KEY
const G_KEY = process.env.GOOGLE_TTS_API_KEY || "";
const G_VOICE = process.env.GOOGLE_TTS_VOICE || "en-GB-Wavenet-F"; // bright British female
const G_LANG = process.env.GOOGLE_TTS_LANG || "en-GB";
const G_RATE = Number(process.env.GOOGLE_TTS_RATE || "1.0");
const G_PITCH = Number(process.env.GOOGLE_TTS_PITCH || "1.0");

const EL_KEY = process.env.ELEVENLABS_API_KEY || "";
const EL_VOICE = process.env.ELEVENLABS_VOICE_ID || "pFZP5JQG7iQjIQuC4Bku"; // "Lily" — British female
const EL_MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

const TTS_PROVIDER: "google" | "eleven" | "" = G_KEY ? "google" : EL_KEY ? "eleven" : "";
const ttsCache = new Map<string, Buffer>();
const TTS_CACHE_MAX = 300;

app.get("/api/tts-status", (_req, res) => res.json({ enabled: !!TTS_PROVIDER, provider: TTS_PROVIDER }));

async function synthGoogle(text: string): Promise<Buffer> {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${G_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: G_LANG, name: G_VOICE },
      audioConfig: { audioEncoding: "MP3", speakingRate: G_RATE, pitch: G_PITCH },
    }),
  });
  if (!r.ok) throw new Error(`google ${r.status}: ${await r.text().catch(() => "")}`);
  const j = (await r.json()) as { audioContent?: string };
  if (!j.audioContent) throw new Error("google: empty audioContent");
  return Buffer.from(j.audioContent, "base64");
}

async function synthEleven(text: string): Promise<Buffer> {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: EL_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error(`eleven ${r.status}: ${await r.text().catch(() => "")}`);
  return Buffer.from(await r.arrayBuffer());
}

app.get("/api/tts", async (req, res) => {
  const text = String(req.query.text || "").slice(0, 800).trim();
  if (!text) return res.status(400).type("text/plain").send("no text");
  if (!TTS_PROVIDER) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).type("text/plain").send("tts disabled (no API key set)");
  }

  const key = crypto.createHash("sha1").update(`${TTS_PROVIDER}|${G_VOICE}|${EL_VOICE}|${text}`).digest("hex");

  const hit = ttsCache.get(key);
  if (hit) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.end(hit);
  }

  try {
    const buf = TTS_PROVIDER === "google" ? await synthGoogle(text) : await synthEleven(text);
    ttsCache.set(key, buf);
    if (ttsCache.size > TTS_CACHE_MAX) {
      const oldest = ttsCache.keys().next().value as string | undefined;
      if (oldest) ttsCache.delete(oldest);
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    console.log(`tts ok (${TTS_PROVIDER}) ${buf.length}b "${text.slice(0, 48)}"`);
    res.end(buf);
  } catch (e: any) {
    res.setHeader("Cache-Control", "no-store");
    console.error(`tts failed (${TTS_PROVIDER}):`, e?.message || e);
    res.status(502).type("text/plain").send(`tts failed: ${e?.message || e}`);
  }
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: http.createServer(app) }),
});
gameServer.define("trivia", TriviaRoom);
gameServer.listen(port);
console.log(`Party Trivia server listening on ${port}`);
