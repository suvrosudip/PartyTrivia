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
