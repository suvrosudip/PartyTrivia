import { Quiz } from "./net";

const KEY = "pt_quizzes";

export function loadQuizzes(): Quiz[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveQuizzes(qs: Quiz[]) {
  try { localStorage.setItem(KEY, JSON.stringify(qs)); } catch {}
}
export function upsertQuiz(q: Quiz): Quiz[] {
  const all = loadQuizzes();
  const i = all.findIndex((x) => x.id === q.id);
  if (i >= 0) all[i] = q; else all.push(q);
  saveQuizzes(all);
  return all;
}
export function deleteQuiz(id: string): Quiz[] {
  const all = loadQuizzes().filter((q) => q.id !== id);
  saveQuizzes(all);
  return all;
}
export function newQuiz(): Quiz {
  return { id: "q_" + Math.random().toString(36).slice(2, 9), title: "Untitled quiz", questions: [] };
}
export function newQuestion() {
  return { text: "", options: ["", ""], correct: 0, timeLimitSec: 12 };
}

// Fisher–Yates shuffle (returns a new array).
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Order questions for gameplay: shuffle, then interleave so the type alternates
// as much as possible — one text question, then an image question, and so on.
// Leftovers (whichever type runs out first) are appended in shuffled order.
export function orderForGameplay<T extends { image?: string }>(questions: T[]): T[] {
  const withImg = shuffle(questions.filter((q) => !!q.image));
  const noImg = shuffle(questions.filter((q) => !q.image));
  if (!withImg.length || !noImg.length) return shuffle(questions); // nothing to alternate

  // Start with whichever pile is larger so the smaller one is spread through it.
  let a = noImg, b = withImg;               // a = text, b = image (default)
  const startWithText = Math.random() < 0.5;
  if (!startWithText && withImg.length >= noImg.length) { a = withImg; b = noImg; }

  const out: T[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length) out.push(a[i++]);
    if (j < b.length) out.push(b[j++]);
  }
  return out;
}
