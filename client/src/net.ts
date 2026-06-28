import { Client, Room } from "colyseus.js";

const ENDPOINT = ((import.meta as any).env.VITE_SERVER_URL || "http://localhost:2567").replace(/\/+$/, "");

export type PlayerSnap = {
  id: string; name: string; connected: boolean; score: number;
  answered: boolean; lastDelta: number; lastCorrect: boolean;
  correctCount: number; wrongCount: number; streak: number; bestStreak: number;
};
export type Snap = {
  code: string; phase: string; quizTitle: string;
  qIndex: number; qTotal: number; qSeq: number;
  qText: string; qOptions: string[]; revealIndex: number;
  timeLimitSec: number; answeredCount: number;
  players: PlayerSnap[];
};
export type ResultsCategory = { key: string; emoji: string; label: string; winner: string; detail: string };
export type Results = {
  quizTitle: string;
  podium: { name: string; score: number; correct: number; wrong: number }[];
  leaderboard: { name: string; score: number; correct: number; wrong: number }[];
  categories: ResultsCategory[];
};

export type Quiz = {
  id: string; title: string;
  questions: { text: string; options: string[]; correct: number; timeLimitSec: number; image?: string }[];
};

export function snapshot(state: any): Snap {
  const players: PlayerSnap[] = [];
  state.players?.forEach((p: any, id: string) => {
    players.push({
      id, name: p.name, connected: p.connected, score: p.score, answered: p.answered,
      lastDelta: p.lastDelta, lastCorrect: p.lastCorrect, correctCount: p.correctCount,
      wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak,
    });
  });
  return {
    code: state.code, phase: state.phase, quizTitle: state.quizTitle,
    qIndex: state.qIndex, qTotal: state.qTotal, qSeq: state.qSeq,
    qText: state.qText, qOptions: Array.from(state.qOptions || []),
    revealIndex: state.revealIndex, timeLimitSec: state.timeLimitSec,
    answeredCount: state.answeredCount, players,
  };
}

export async function createDisplay(quiz: Quiz): Promise<Room> {
  // Images are big; the server only needs text/options/correct for scoring.
  // The host's display renders photos from its own local copy of the quiz.
  const light = { ...quiz, questions: quiz.questions.map(({ image, ...q }) => q) };
  const client = new Client(ENDPOINT);
  return client.create("trivia", { display: true, quiz: light });
}

export async function joinByCode(code: string, name: string): Promise<Room> {
  const clean = code.trim().toUpperCase();
  const res = await fetch(`${ENDPOINT}/api/room/${clean}`);
  if (!res.ok) throw new Error("No room with that code");
  const { roomId } = await res.json();
  const client = new Client(ENDPOINT);
  return client.joinById(roomId, { name });
}

export async function reconnect(token: string): Promise<Room> {
  const client = new Client(ENDPOINT);
  return client.reconnect(token);
}
