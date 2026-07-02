import { Room, Client } from "colyseus";
import { TriviaState, PlayerState } from "./schema";
import { codeToRoom } from "../registry";

type Q = { text: string; options: string[]; correct: number; timeLimitSec: number };
type Answer = { q: number; opt: number | null; ms: number; correct: boolean };

const BASE_POINTS = 1000;

export class TriviaRoom extends Room<TriviaState> {
  maxClients = 60;

  private questions: Q[] = [];
  private displayId = "";
  private hostKey = "";                            // secret; lets a phone control the game
  private hostIds = new Set<string>();
  private answers = new Map<string, Answer[]>();   // sid -> per-question answers
  private qStart = 0;                               // server ms when current question opened
  private gen = 0;                                  // invalidates stale timers

  onCreate(options: any) {
    this.setState(new TriviaState());
    const code = this.uniqueCode();
    this.state.code = code;
    this.setMetadata({ code });
    codeToRoom.set(code, this.roomId);

    this.loadQuiz(options?.quiz);
    this.hostKey = Math.random().toString(36).slice(2, 8).toUpperCase();

    this.onMessage("start", (c) => { if (this.canControl(c)) this.startGame(); });
    this.onMessage("next", (c) => { if (this.canControl(c)) this.advance(); });
    this.onMessage("reset", (c) => { if (this.canControl(c)) this.resetToLobby(); });
    this.onMessage("answer", (c, m) => this.submitAnswer(c, m?.index));
  }

  onJoin(client: Client, options: any) {
    if (options?.display) {
      this.displayId = client.sessionId;
      // the display shows a private "host controls" QR built from this key
      client.send("host-info", { hostKey: this.hostKey });
      return;
    }
    const p = new PlayerState();
    p.name = (String(options?.name || "Player").slice(0, 16)) || "Player";
    if (options?.hostKey && String(options.hostKey).toUpperCase() === this.hostKey) {
      p.isHost = true;
      this.hostIds.add(client.sessionId);
    }
    this.state.players.set(client.sessionId, p);
    this.answers.set(client.sessionId, []);
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = false;
    if (this.displayId === client.sessionId) this.displayId = "";
    try {
      if (consented) throw new Error("left");
      await this.allowReconnection(client, 120);
      const pr = this.state.players.get(client.sessionId);
      if (pr) pr.connected = true;
    } catch {
      if (this.state.phase === "lobby") {
        this.state.players.delete(client.sessionId);
        this.answers.delete(client.sessionId);
        this.hostIds.delete(client.sessionId);
      }
    }
  }

  onDispose() { codeToRoom.delete(this.state.code); }

  // ---------- helpers ----------
  private uniqueCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""); }
    while (codeToRoom.has(code));
    return code;
  }
  private canControl(c: Client) { return c.sessionId === this.displayId || this.hostIds.has(c.sessionId); }

  private loadQuiz(quiz: any) {
    const qs: Q[] = [];
    const list = Array.isArray(quiz?.questions) ? quiz.questions : [];
    for (const raw of list) {
      const text = String(raw?.text || "").slice(0, 200).trim();
      const options = (Array.isArray(raw?.options) ? raw.options : [])
        .map((o: any) => String(o || "").slice(0, 80).trim()).filter(Boolean).slice(0, 6);
      let correct = Number(raw?.correct);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) correct = 0;
      const timeLimitSec = Math.max(5, Math.min(120, Number(raw?.timeLimitSec) || 20));
      if (text && options.length >= 2) qs.push({ text, options, correct, timeLimitSec });
    }
    this.questions = qs;
    this.state.quizTitle = String(quiz?.title || "Party Trivia").slice(0, 60);
    this.state.qTotal = qs.length;
  }

  // ---------- flow ----------
  private startGame() {
    if (this.state.phase !== "lobby" || !this.questions.length || this.state.players.size < 1) return;
    this.state.players.forEach((p) => {
      p.score = 0; p.correctCount = 0; p.wrongCount = 0; p.streak = 0; p.bestStreak = 0; p.lastDelta = 0; p.lastCorrect = false;
    });
    this.answers.forEach((_v, k) => this.answers.set(k, []));
    this.state.qIndex = 0;
    this.openQuestion();
  }

  private openQuestion() {
    const q = this.questions[this.state.qIndex];
    this.gen++;
    const gen = this.gen;
    this.state.phase = "question";
    this.state.qText = q.text;
    this.state.qOptions.splice(0, this.state.qOptions.length, ...q.options);
    this.state.revealIndex = -1;
    this.state.timeLimitSec = q.timeLimitSec;
    this.state.answeredCount = 0;
    this.state.qSeq++;
    this.qStart = Date.now();
    this.state.players.forEach((p) => { p.answered = false; p.lastDelta = 0; p.lastCorrect = false; });
    this.clock.setTimeout(() => { if (gen === this.gen && this.state.phase === "question") this.closeQuestion(); }, q.timeLimitSec * 1000);
  }

  private submitAnswer(c: Client, index?: number) {
    if (this.state.phase !== "question") return;
    const p = this.state.players.get(c.sessionId);
    const q = this.questions[this.state.qIndex];
    if (!p || p.answered || !q) return;
    if (!Number.isInteger(index as number) || (index as number) < 0 || (index as number) >= q.options.length) return;

    const ms = Date.now() - this.qStart;
    const correct = index === q.correct;
    p.answered = true;
    this.state.answeredCount++;

    let delta = 0;
    if (correct) {
      const limit = q.timeLimitSec * 1000;
      const speed = Math.max(0, 1 - (ms / limit));        // 1.0 instant -> 0 at timeout
      delta = Math.round(BASE_POINTS * (0.5 + 0.5 * speed)); // 500..1000
      p.score += delta;
      p.correctCount++;
      p.streak++;
      if (p.streak > p.bestStreak) p.bestStreak = p.streak;
    } else {
      p.wrongCount++;
      p.streak = 0;
    }
    p.lastDelta = delta;
    p.lastCorrect = correct;
    (this.answers.get(c.sessionId) || []).push({ q: this.state.qIndex, opt: index as number, ms, correct });

    // everyone answered -> lock the question; host controls the reveal
    let allIn = true;
    this.state.players.forEach((pl) => { if (pl.connected && !pl.answered) allIn = false; });
    if (allIn) this.closeQuestion();
  }

  // Time's up (or all answered, or host skipped): lock answers, but keep the
  // correct answer hidden until the host chooses to reveal it.
  private closeQuestion() {
    if (this.state.phase !== "question") return;
    this.gen++; // cancel the pending timeout
    const q = this.questions[this.state.qIndex];
    this.state.players.forEach((p, sid) => {
      if (!p.answered) {
        p.wrongCount++; p.streak = 0; p.lastDelta = 0; p.lastCorrect = false;
        (this.answers.get(sid) || []).push({ q: this.state.qIndex, opt: null, ms: q.timeLimitSec * 1000, correct: false });
      }
    });
    this.state.phase = "locked";
  }

  // Host reveals the correct answer + leaderboard.
  private revealAnswer() {
    if (this.state.phase !== "locked") return;
    this.state.revealIndex = this.questions[this.state.qIndex].correct;
    this.state.phase = "reveal";
  }

  private advance() {
    if (this.state.phase === "question") return this.closeQuestion();
    if (this.state.phase === "locked") return this.revealAnswer();
    if (this.state.phase !== "reveal") return;
    if (this.state.qIndex + 1 >= this.questions.length) return this.finish();
    this.state.qIndex++;
    this.openQuestion();
  }

  private finish() {
    this.state.phase = "results";
    this.broadcast("results", this.computeResults());
  }

  // ---------- results ----------
  private computeResults() {
    const players = [...this.state.players.entries()].map(([sid, p]) => ({ sid, p }));
    const name = (sid: string) => this.state.players.get(sid)?.name || "—";

    // per-question option pick counts (for lone wolf / hive mind)
    const dist: Record<number, Record<number, number>> = {};
    for (const { sid } of players) {
      for (const a of this.answers.get(sid) || []) {
        if (a.opt === null) continue;
        (dist[a.q] ||= {})[a.opt] = ((dist[a.q] || {})[a.opt] || 0) + 1;
      }
    }

    const stats = players.map(({ sid, p }) => {
      const log = this.answers.get(sid) || [];
      const correctTimes = log.filter((a) => a.correct).map((a) => a.ms);
      const answeredTimes = log.filter((a) => a.opt !== null).map((a) => a.ms);
      let lone = 0, hive = 0;
      for (const a of log) {
        if (a.opt === null) continue;
        const counts = dist[a.q] || {};
        const mine = counts[a.opt] || 0;
        const max = Math.max(...Object.values(counts));
        const min = Math.min(...Object.values(counts));
        if (mine === min && Object.keys(counts).length > 1) lone++;
        if (mine === max && Object.keys(counts).length > 1) hive++;
      }
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : Infinity;
      return {
        sid, name: p.name, score: p.score, correct: p.correctCount, wrong: p.wrongCount,
        bestStreak: p.bestStreak, avgCorrectMs: avg(correctTimes), avgAnsMs: avg(answeredTimes),
        lone, hive,
      };
    });

    const leaderboard = [...stats].sort((a, b) => b.score - a.score)
      .map((s) => ({ name: s.name, score: s.score, correct: s.correct, wrong: s.wrong }));

    const best = <T,>(arr: T[], score: (t: T) => number, min = false): T | null => {
      let out: T | null = null, bv = min ? Infinity : -Infinity;
      for (const t of arr) { const v = score(t); if (min ? v < bv : v > bv) { bv = v; out = t; } }
      return out;
    };

    const champ = best(stats, (s) => s.score);
    const fastest = best(stats.filter((s) => s.avgCorrectMs !== Infinity), (s) => s.avgCorrectMs, true);
    const spoon = best(stats, (s) => s.wrong);
    const loneWolf = best(stats.filter((s) => s.lone > 0), (s) => s.lone);
    const sheep = best(stats.filter((s) => s.hive > 0), (s) => s.hive);
    const slow = best(stats.filter((s) => s.avgAnsMs !== Infinity), (s) => s.avgAnsMs);
    const streak = best(stats.filter((s) => s.bestStreak > 1), (s) => s.bestStreak);

    const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
    const categories: any[] = [];
    const add = (key: string, emoji: string, label: string, s: any, detail: string) => {
      if (s) categories.push({ key, emoji, label, winner: s.name, detail });
    };
    add("champion", "👑", "Champion", champ, champ ? `${champ.score} pts` : "");
    add("fastest", "⚡", "Fastest Finger", fastest, fastest ? `avg ${sec(fastest.avgCorrectMs)} on correct answers` : "");
    add("streak", "🔥", "Hot Streak", streak, streak ? `${streak.bestStreak} in a row` : "");
    add("spoon", "🥄", "Wooden Spoon", spoon, spoon ? `${spoon.wrong} wrong` : "");
    add("lonewolf", "🐺", "Lone Wolf", loneWolf, loneWolf ? `${loneWolf.lone}× went their own way` : "");
    add("sheep", "🐑", "Hive Mind", sheep, sheep ? `${sheep.hive}× with the crowd` : "");
    add("slow", "🐢", "Slow & Steady", slow, slow ? `avg ${sec(slow.avgAnsMs)} to answer` : "");

    const podium = leaderboard.slice(0, 3);
    return { quizTitle: this.state.quizTitle, podium, leaderboard, categories };
  }

  private resetToLobby() {
    this.gen++;
    this.state.phase = "lobby";
    this.state.qIndex = 0;
    this.state.revealIndex = -1;
    this.state.qText = "";
    this.state.qOptions.splice(0, this.state.qOptions.length);
    this.state.answeredCount = 0;
    this.state.players.forEach((p, sid) => {
      p.score = 0; p.answered = false; p.correctCount = 0; p.wrongCount = 0;
      p.streak = 0; p.bestStreak = 0; p.lastDelta = 0; p.lastCorrect = false;
      this.answers.set(sid, []);
    });
  }
}
