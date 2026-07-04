import { Room, Client } from "colyseus";
import { TriviaState, PlayerState } from "./schema";
import { codeToRoom } from "../registry";

type Q = { text: string; options: string[]; correct: number; timeLimitSec: number };
type Answer = { q: number; opt: number | null; ms: number; correct: boolean };

const BASE_POINTS = 1000;

// Pacing (ms) for fully-automatic simulation, and a pool of party-guest bot names.
const SIM = { reveal: 4500, next: 1500 };
const BOT_NAMES = ["Ada", "Bex", "Cyrus", "Dot", "Enzo", "Fern", "Gus", "Hana", "Iggy", "Juno", "Kit", "Lola", "Milo", "Nova", "Otis", "Pax", "Remy", "Sable", "Tao", "Uma"];

export class TriviaRoom extends Room<TriviaState> {
  maxClients = 60;

  private questions: Q[] = [];
  private displayId = "";
  private hostKey = "";                            // secret; lets a phone control the game
  private hostIds = new Set<string>();
  private answers = new Map<string, Answer[]>();   // sid -> per-question answers
  private qStart = 0;                               // server ms when current question opened
  private gen = 0;                                  // invalidates stale timers
  private bots = new Set<string>();                 // sids of simulated players
  private botSkill = new Map<string, number>();     // sid -> 0..1 chance of answering correctly
  private sim = false;                              // fully-auto: room advances itself
  private simGen = 0;                               // invalidates stale sim timers

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
    this.onMessage("simulate", (c, m) => { if (this.canControl(c) && this.state.phase === "lobby") this.startSimulation(m?.count); });
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
      const timeLimitSec = Math.max(5, Math.min(120, Number(raw?.timeLimitSec) || 12));
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
      p.score = 0; p.correctCount = 0; p.sumCorrectMs = 0; p.wrongCount = 0; p.streak = 0; p.bestStreak = 0; p.lastDelta = 0; p.lastCorrect = false;
    });
    this.answers.forEach((_v, k) => this.answers.set(k, []));
    this.state.qIndex = 0;
    this.openQuestion();
  }

  // Fill the room with bot players and play a whole game automatically — no other
  // people or host needed. Great for demos and testing on your own.
  private startSimulation(count?: number) {
    if (this.state.phase !== "lobby" || !this.questions.length) return;
    const target = Math.max(2, Math.min(10, count && count > 0 ? count : 5));
    const names = [...BOT_NAMES];
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    // Top up to `target` bots (in case a previous partial sim left some behind).
    let added = this.bots.size;
    let bi = 0;
    while (added < target && bi < names.length) {
      const id = "bot_" + Math.random().toString(36).slice(2, 9);
      const p = new PlayerState();
      p.name = names[bi++]; p.bot = true;
      this.state.players.set(id, p);
      this.answers.set(id, []);
      this.bots.add(id);
      this.botSkill.set(id, 0.45 + Math.random() * 0.5); // 45%–95% accuracy, varied
      added++;
    }
    this.sim = true;
    this.simGen++;
    this.state.simulating = true;
    this.startGame();
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
    this.scheduleBotAnswers();
  }

  // Each bot answers after a randomized "thinking" delay, with accuracy set by its skill.
  private scheduleBotAnswers() {
    if (!this.bots.size) return;
    const q = this.questions[this.state.qIndex];
    const limit = q.timeLimitSec * 1000;
    const gen = this.gen;
    for (const sid of this.bots) {
      const skill = this.botSkill.get(sid) ?? 0.6;
      // faster, smarter bots answer sooner; everyone answers within ~85% of the limit
      const base = 900 + Math.random() * (limit * 0.7);
      const delay = Math.min(limit - 400, base * (1.25 - skill * 0.5));
      this.clock.setTimeout(() => {
        if (gen !== this.gen || this.state.phase !== "question") return;
        const p = this.state.players.get(sid);
        if (!p || p.answered) return;
        const pick = Math.random() < skill
          ? q.correct
          : this.randomWrong(q);
        this.applyAnswer(sid, pick);
      }, delay);
    }
  }

  private randomWrong(q: Q): number {
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
    return wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : q.correct;
  }

  private submitAnswer(c: Client, index?: number) {
    const p = this.state.players.get(c.sessionId);
    if (!p || p.isHost) return; // the host runs the game, doesn't play
    this.applyAnswer(c.sessionId, index);
  }

  // Records an answer for any player (real or bot) and locks the question if all are in.
  private applyAnswer(sid: string, index?: number) {
    if (this.state.phase !== "question") return;
    const p = this.state.players.get(sid);
    const q = this.questions[this.state.qIndex];
    if (!p || p.isHost || p.answered || !q) return;
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
      p.sumCorrectMs += ms;
      p.streak++;
      if (p.streak > p.bestStreak) p.bestStreak = p.streak;
    } else {
      p.wrongCount++;
      p.streak = 0;
    }
    p.lastDelta = delta;
    p.lastCorrect = correct;
    (this.answers.get(sid) || []).push({ q: this.state.qIndex, opt: index as number, ms, correct });

    // everyone (except the host) answered -> lock the question; host controls the reveal
    let allIn = true;
    this.state.players.forEach((pl) => { if (pl.connected && !pl.isHost && !pl.answered) allIn = false; });
    if (allIn) this.closeQuestion();
  }

  // Time's up (or all answered, or host skipped): lock answers, but keep the
  // correct answer hidden until the host chooses to reveal it.
  private closeQuestion() {
    if (this.state.phase !== "question") return;
    this.gen++; // cancel the pending timeout
    const q = this.questions[this.state.qIndex];
    this.state.players.forEach((p, sid) => {
      if (p.isHost) return; // host doesn't play, so no "missed" penalty
      if (!p.answered) {
        p.wrongCount++; p.streak = 0; p.lastDelta = 0; p.lastCorrect = false;
        (this.answers.get(sid) || []).push({ q: this.state.qIndex, opt: null, ms: q.timeLimitSec * 1000, correct: false });
      }
    });
    this.state.phase = "locked";
    // In full simulation the room reveals + moves on by itself (no host needed).
    if (this.sim) this.scheduleSim(() => { if (this.state.phase === "locked") this.revealAnswer(); }, SIM.next);
  }

  // Host reveals the correct answer + leaderboard.
  private revealAnswer() {
    if (this.state.phase !== "locked") return;
    this.state.revealIndex = this.questions[this.state.qIndex].correct;
    this.state.phase = "reveal";
    // In full simulation, linger on the leaderboard, then advance.
    if (this.sim) this.scheduleSim(() => { if (this.state.phase === "reveal") this.advance(); }, SIM.reveal);
  }

  // Runs a callback on a sim timer that's cancelled if the sim is reset/stopped.
  private scheduleSim(fn: () => void, ms: number) {
    if (!this.sim) return;
    const g = this.simGen;
    this.clock.setTimeout(() => { if (this.sim && g === this.simGen) fn(); }, ms);
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
    this.sim = false;            // stop auto-advancing; results stay on screen
    this.simGen++;
    this.state.simulating = false; // sim is over — drop the "◆ Simulation" badge
    this.broadcast("results", this.computeResults());
  }

  // ---------- results ----------
  private computeResults() {
    // The host runs the game and does not compete.
    const players = [...this.state.players.entries()]
      .filter(([, p]) => !p.isHost)
      .map(([sid, p]) => ({ sid, p }));

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

    // Ranking rule: most correct answers wins; ties broken by who was faster
    // (lower average time on their correct answers); score is the final fallback.
    const rankCmp = (a: typeof stats[number], b: typeof stats[number]) =>
      (b.correct - a.correct) || (a.avgCorrectMs - b.avgCorrectMs) || (b.score - a.score);

    const leaderboard = [...stats].sort(rankCmp)
      .map((s) => ({ name: s.name, score: s.score, correct: s.correct, wrong: s.wrong }));

    const best = <T,>(arr: T[], score: (t: T) => number, min = false): T | null => {
      let out: T | null = null, bv = min ? Infinity : -Infinity;
      for (const t of arr) { const v = score(t); if (min ? v < bv : v > bv) { bv = v; out = t; } }
      return out;
    };

    const champ = [...stats].sort(rankCmp)[0] || null;
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
    add("champion", "👑", "Champion", champ, champ ? `${champ.correct} correct${champ.avgCorrectMs !== Infinity ? ` · avg ${sec(champ.avgCorrectMs)}` : ""}` : "");
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
    this.simGen++;
    this.sim = false;
    this.state.simulating = false;
    // remove simulated players entirely
    for (const sid of this.bots) { this.state.players.delete(sid); this.answers.delete(sid); }
    this.bots.clear();
    this.botSkill.clear();
    this.state.phase = "lobby";
    this.state.qIndex = 0;
    this.state.revealIndex = -1;
    this.state.qText = "";
    this.state.qOptions.splice(0, this.state.qOptions.length);
    this.state.answeredCount = 0;
    this.state.players.forEach((p, sid) => {
      p.score = 0; p.answered = false; p.correctCount = 0; p.sumCorrectMs = 0; p.wrongCount = 0;
      p.streak = 0; p.bestStreak = 0; p.lastDelta = 0; p.lastCorrect = false;
      this.answers.set(sid, []);
    });
  }
}
