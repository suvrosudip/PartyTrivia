import { Pool } from "pg";

const url = process.env.DATABASE_URL || "";
export const HOST_KEY = process.env.HOST_KEY || "";

// Cloud quiz storage is enabled only when BOTH a database URL and a host key are set,
// so the question bank is never exposed without the key.
const local = url.includes("localhost") || url.includes("127.0.0.1");
export const pool = url ? new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5 }) : null;
export const DB_ENABLED = !!pool && !!HOST_KEY;

export async function initDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS quizzes (
    id text PRIMARY KEY,
    title text NOT NULL DEFAULT '',
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
export async function listQuizzes(): Promise<any[]> {
  const r = await pool!.query("SELECT data FROM quizzes ORDER BY updated_at DESC");
  return r.rows.map((x) => x.data);
}
export async function upsertQuiz(q: any): Promise<void> {
  await pool!.query(
    `INSERT INTO quizzes (id, title, data, updated_at) VALUES ($1,$2,$3, now())
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, data=EXCLUDED.data, updated_at=now()`,
    [String(q.id), String(q.title || ""), JSON.stringify(q)]
  );
}
export async function deleteQuiz(id: string): Promise<void> {
  await pool!.query("DELETE FROM quizzes WHERE id=$1", [id]);
}
