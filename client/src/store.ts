// Quiz storage abstraction: cloud DB (server, host-key protected) when available,
// otherwise the host browser's localStorage. Same API either way.
import { Quiz } from "./net";
import * as local from "./quizzes";

const ENDPOINT = ((import.meta as any).env.VITE_SERVER_URL || "http://localhost:2567").replace(/\/+$/, "");
const HK = "pt_hostkey";

let dbEnabled = false;
let probed = false;

export function getHostKey(): string { try { return localStorage.getItem(HK) || ""; } catch { return ""; } }
export function setHostKey(k: string) { try { localStorage.setItem(HK, k.trim()); } catch {} }
export function clearHostKey() { try { localStorage.removeItem(HK); } catch {} }

export async function probeDb(): Promise<boolean> {
  try { const r = await fetch(`${ENDPOINT}/api/db-status`); dbEnabled = !!(await r.json()).enabled; }
  catch { dbEnabled = false; }
  probed = true;
  return dbEnabled;
}
export function isCloud() { return dbEnabled; }
export function probed_() { return probed; }

function hk() { return { "x-host-key": getHostKey() }; }

// Throws "unauthorized" when the host key is missing/wrong (cloud mode).
export async function listQuizzes(): Promise<Quiz[]> {
  if (!dbEnabled) return local.loadQuizzes();
  const r = await fetch(`${ENDPOINT}/api/quizzes`, { headers: hk() });
  if (r.status === 401 || r.status === 503) throw new Error("unauthorized");
  if (!r.ok) throw new Error("Could not load quizzes");
  return await r.json();
}
export async function saveQuiz(q: Quiz): Promise<void> {
  if (!dbEnabled) { local.upsertQuiz(q); return; }
  const r = await fetch(`${ENDPOINT}/api/quizzes/${encodeURIComponent(q.id)}`, {
    method: "PUT", headers: { ...hk(), "Content-Type": "application/json" }, body: JSON.stringify(q),
  });
  if (r.status === 401 || r.status === 503) throw new Error("unauthorized");
  if (!r.ok) throw new Error("Could not save quiz");
}
export async function removeQuiz(id: string): Promise<void> {
  if (!dbEnabled) { local.deleteQuiz(id); return; }
  const r = await fetch(`${ENDPOINT}/api/quizzes/${encodeURIComponent(id)}`, { method: "DELETE", headers: hk() });
  if (r.status === 401 || r.status === 503) throw new Error("unauthorized");
}
