import { useEffect, useRef, useState } from "react";
import { Room } from "colyseus.js";
import { QRCodeSVG } from "qrcode.react";
import { createDisplay, joinByCode, reconnect, snapshot, rankPlayers, avgCorrectMs, Snap, PlayerSnap, Results, Quiz } from "./net";
import { leaderQuip } from "./jokes";
import { newQuiz, newQuestion } from "./quizzes";
import * as store from "./store";
import { Editor } from "./Editor";
import { StringLights, HeroScene, Ambiance, Trophy, CrownMark, EmptyArt } from "./graphics";
import { BackgroundMusic } from "./music";

type Mode = "home" | "library" | "display" | "player";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  return (
    <>
      <BackgroundMusic />
      <AppInner />
    </>
  );
}

function AppInner() {
  const [mode, setMode] = useState<Mode>("home");
  const [snap, setSnap] = useState<Snap | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [hostedQuiz, setHostedQuiz] = useState<Quiz | null>(null);
  const [sid, setSid] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [hostKey, setHostKey] = useState("");       // present when arriving via the host QR
  const [displayHostKey, setDisplayHostKey] = useState(""); // received by the display, shown as a QR
  const [reconnecting, setReconnecting] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const modeRef = useRef<Mode>("home");
  useEffect(() => { modeRef.current = mode; }, [mode]);
  // Tag the body so CSS can make the big-screen (display) fit the TV without scrolling,
  // while phones keep their normal scrolling behaviour.
  useEffect(() => { document.body.dataset.mode = mode; return () => { delete document.body.dataset.mode; }; }, [mode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
    const hk = params.get("hk");
    if (hk) setHostKey(hk.toUpperCase());
  }, []);

  function attach(room: Room, asDisplay: boolean) {
    roomRef.current = room;
    setSid(room.sessionId);
    setResults(null);
    setReconnecting(false);
    room.onStateChange((s: any) => setSnap(snapshot(s)));
    room.onMessage("results", (r: Results) => setResults(r));
    if (asDisplay) {
      room.onMessage("host-info", (m: any) => setDisplayHostKey(m?.hostKey || ""));
    } else {
      try { localStorage.setItem("pt", JSON.stringify({ token: room.reconnectionToken })); } catch {}
      // phones drop the socket when the screen sleeps — reconnect quietly
      room.onLeave((codeNum) => { if (codeNum !== 1000 && modeRef.current === "player") resume(); });
    }
    room.onError((_c, m) => setError(m || "Connection error"));
  }

  async function resume() {
    if (roomRef.current && (roomRef.current as any).connection?.isOpen) return;
    let saved: any = null;
    try { saved = JSON.parse(localStorage.getItem("pt") || "null"); } catch {}
    if (!saved?.token) return;
    setReconnecting(true);
    for (let i = 0; i < 5; i++) {
      try { const room = await reconnect(saved.token); attach(room, false); return; }
      catch { await new Promise((r) => setTimeout(r, 800 * (i + 1))); }
    }
    setReconnecting(false);
    setError("Lost connection — rejoin with the room code.");
  }

  // wake from sleep / return to app / network back → check socket
  useEffect(() => {
    const check = () => {
      if (modeRef.current !== "player") return;
      if (!(roomRef.current as any)?.connection?.isOpen) resume();
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);

  // keep phone screens awake mid-game
  useEffect(() => {
    if (mode !== "player") return;
    let lock: any = null;
    const grab = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch {} };
    grab();
    const regrab = () => { if (document.visibilityState === "visible") grab(); };
    document.addEventListener("visibilitychange", regrab);
    return () => { document.removeEventListener("visibilitychange", regrab); try { lock?.release(); } catch {} };
  }, [mode]);

  async function hostQuiz(quiz: Quiz) {
    setError("");
    if (!quiz.questions.length) { setError("Add at least one question first."); return; }
    setHostedQuiz(quiz);
    try { const room = await createDisplay(quiz); attach(room, true); setMode("display"); }
    catch { setError("Could not open a room. Is the server running?"); }
  }
  async function doJoin() {
    setError("");
    if (!name.trim()) { setError("Enter your name."); return; }
    if (code.trim().length < 4) { setError("Enter the 4-letter code."); return; }
    try { const room = await joinByCode(code, name, hostKey || undefined); attach(room, false); setMode("player"); }
    catch { setError("No game found with that code."); }
  }
  function send(type: string, payload?: any) { roomRef.current?.send(type, payload); }
  function leave() {
    try { localStorage.removeItem("pt"); } catch {}
    roomRef.current?.leave(true); roomRef.current = null;
    setSnap(null); setResults(null); setHostedQuiz(null); setMode("home"); setError("");
  }

  // ---------------- HOME ----------------
  if (mode === "home") {
    return (
      <Shell>
        <div className="hero">
          <HeroScene />
          <div className="logo">Trivia<span>Party</span></div>
        </div>
        <div className="card">
          <div className="lbl">{hostKey ? "👑 Join as the host" : "Join a game"}</div>
          {hostKey ? <div className="muted small mb">You scanned the host code — you'll get the game controls on your phone (and you can play along too).</div> : null}
          <input className="inp" placeholder="Your name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
          <input className="inp code" placeholder="CODE" value={code} maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
          <button className="btn solid full" onClick={doJoin}>Join</button>
          {error && <div className="err">{error}</div>}
        </div>
        <div className="bar center">
          <button className="btn ghost" onClick={() => { setError(""); setMode("library"); }}>🎬 Host / edit quizzes</button>
        </div>
      </Shell>
    );
  }

  // ---------------- LIBRARY + EDITOR (admin) ----------------
  if (mode === "library") {
    return <Library onHost={hostQuiz} onBack={() => setMode("home")} error={error} />;
  }

  // ---------------- DISPLAY ----------------
  if (mode === "display") {
    if (!snap) return <Shell><div className="card center">Opening room…</div></Shell>;
    return <Display snap={snap} results={results} quiz={hostedQuiz} hostKey={displayHostKey} send={send} onLeave={leave} />;
  }

  // ---------------- PLAYER ----------------
  if (!snap) return <Shell><div className="card center">{reconnecting ? "⟳ Reconnecting…" : "Connecting…"}</div></Shell>;
  const me = snap.players.find((p) => p.id === sid);
  return <>
    {reconnecting && <div className="reconnect">⟳ Reconnecting…</div>}
    <Player snap={snap} me={me} results={results} send={send} onLeave={leave} />
  </>;
}

// ============================================================ LIBRARY
function Library({ onHost, onBack, error }: { onHost: (q: Quiz) => void; onBack: () => void; error: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cloud, setCloud] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState(() => store.getHostKey());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editing = quizzes.find((q) => q.id === editingId) || null;

  async function reload() {
    setLoading(true); setErr("");
    try { setQuizzes(await store.listQuizzes()); setNeedKey(false); }
    catch (e: any) { if (e.message === "unauthorized") setNeedKey(true); else setErr(e.message || "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { (async () => { setCloud(await store.probeDb()); reload(); })(); }, []);

  function unlock() { store.setHostKey(keyInput); reload(); }

  async function persist(q: Quiz) {
    try { await store.saveQuiz(q); setQuizzes((qs) => { const i = qs.findIndex((x) => x.id === q.id); const n = [...qs]; if (i >= 0) n[i] = q; else n.unshift(q); return n; }); }
    catch (e: any) { if (e.message === "unauthorized") setNeedKey(true); else setErr(e.message || "Save failed"); }
  }
  async function create() {
    const q = newQuiz(); q.questions = [newQuestion()];
    await persist(q); setEditingId(q.id);
  }
  async function remove(id: string) {
    if (!confirm("Delete this quiz?")) return;
    try { await store.removeQuiz(id); setQuizzes((qs) => qs.filter((q) => q.id !== id)); }
    catch (e: any) { setErr(e.message || "Delete failed"); }
  }
  function exportQuiz(q: Quiz) {
    const blob = new Blob([JSON.stringify(q, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${q.title.replace(/\s+/g, "_") || "quiz"}.json`; a.click();
  }
  function importQuiz(file: File) {
    const r = new FileReader();
    r.onload = async () => {
      try {
        const data = JSON.parse(String(r.result));
        data.id = "q_" + Math.random().toString(36).slice(2, 9);
        if (!Array.isArray(data.questions)) throw new Error();
        await persist(data);
      } catch { alert("That file isn't a valid quiz export."); }
    };
    r.readAsText(file);
  }

  if (needKey) {
    return (
      <Shell>
        <button className="btn ghost sm" onClick={onBack}>← Back</button>
        <div className="card">
          <div className="lbl">🔒 Host key</div>
          <div className="muted small mb">Your quizzes are stored in the cloud. Enter the host key to unlock them.</div>
          <input className="inp" type="password" placeholder="Host key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
          <button className="btn solid full" onClick={unlock}>Unlock</button>
          {err && <div className="err">{err}</div>}
        </div>
      </Shell>
    );
  }

  if (editing) {
    return <Editor quiz={editing} onPersist={persist}
      onClose={() => { setEditingId(null); reload(); }}
      onHost={async (q) => { await persist(q); onHost(q); }} />;
  }

  return (
    <Shell>
      <div className="row spread">
        <button className="btn ghost sm" onClick={onBack}>← Back</button>
        <div className="lbl">Your quizzes</div>
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>Import</button>
      </div>
      <div className="muted small center mb">{cloud ? "☁ Stored in the cloud" : "📱 Stored on this device"}
        {cloud && <button className="linkbtn" onClick={() => { store.clearHostKey(); setKeyInput(""); setNeedKey(true); }}>change key</button>}</div>
      <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && importQuiz(e.target.files[0])} />
      {error && <div className="err">{error}</div>}
      {err && <div className="err">{err}</div>}
      {loading && <div className="card muted center">Loading…</div>}
      {!loading && !quizzes.length && <div className="card center"><EmptyArt /><div className="qtitle">No quizzes yet</div><div className="muted small">Create one and start adding questions about your guests.</div></div>}
      {quizzes.map((q) => (
        <div className="card qrow" key={q.id}>
          <div>
            <div className="qtitle">{q.title || "Untitled quiz"}</div>
            <div className="muted small">{q.questions.length} question{q.questions.length === 1 ? "" : "s"}</div>
          </div>
          <div className="qrow-actions">
            <button className="btn solid sm" onClick={() => onHost(q)}>Host</button>
            <button className="btn ghost sm" onClick={() => setEditingId(q.id)}>Edit</button>
            <button className="btn ghost sm" onClick={() => exportQuiz(q)}>Export</button>
            <button className="btn ghost sm danger" onClick={() => remove(q.id)}>Delete</button>
          </div>
        </div>
      ))}
      <button className="btn solid full" onClick={create}>+ New quiz</button>
    </Shell>
  );
}

// ============================================================ DISPLAY
function Display({ snap, results, quiz, hostKey, send, onLeave }: { snap: Snap; results: Results | null; quiz: Quiz | null; hostKey: string; send: (t: string, p?: any) => void; onLeave: () => void }) {
  const joinUrl = `${location.origin}/?code=${snap.code}`;
  const hostJoinUrl = `${location.origin}/?code=${snap.code}&hk=${hostKey}`;
  const hostJoined = snap.players.some((p) => p.isHost);
  const players = rankPlayers(snap.players);
  const qImage = quiz?.questions?.[snap.qIndex]?.image;

  if (snap.phase === "lobby") {
    return (
      <Shell wide>
        <div className="card center">
          <div className="lbl">{snap.quizTitle}</div>
          <div className="qr"><QRCodeSVG value={joinUrl} size={200} /></div>
          <div className="muted small">scan to join, or go to {location.host}</div>
          <div className="bigcode">{snap.code}</div>
          <div className="chips center">{snap.players.map((p) => <span className={"chip" + (p.bot ? " botchip" : "")} key={p.id}>{p.name}{p.isHost ? " 👑" : ""}{p.bot ? <span className="botmark">bot</span> : ""}</span>)}</div>
          <div className="bar center">
            <button className="btn solid" disabled={snap.players.filter((p) => !p.isHost).length < 1 || snap.qTotal < 1} onClick={() => send("start")}>Start ({snap.qTotal} Qs)</button>
            <button className="btn ghost" onClick={onLeave}>Close</button>
          </div>
          <div className="bar center">
            <button className="btn ghost" disabled={snap.qTotal < 1} onClick={() => send("simulate", { count: 5 })}>▶ Simulate a game</button>
          </div>
          <div className="muted small">{snap.players.filter((p) => !p.isHost).length} joined{snap.players.some((p) => p.isHost) ? " · host 👑" : ""}</div>
          <div className="muted small">No one to play with? <b>Simulate</b> fills the room with bots and plays a full game by itself.</div>
        </div>
        {hostKey && (
          <div className="card center hostpanel">
            <div className="lbl">👑 Run it from your phone</div>
            {hostJoined
              ? <div className="muted small">Host connected — the game can be started and stepped from their phone.</div>
              : <>
                  <div className="hostqr"><QRCodeSVG value={hostJoinUrl} size={110} /></div>
                  <div className="muted small">Host: scan this <b>private</b> code to get Start / Reveal / Next on your phone — you can play along too. Everyone else uses the big code above.</div>
                </>}
          </div>
        )}
      </Shell>
    );
  }

  if (snap.phase === "results" && results) {
    return (
      <Shell wide>
        <div className="card center">
          <Confetti />
          <Trophy />
          <div className="logo small">Results</div>
          <ol className="ranklist">
            {results.leaderboard.map((p, i) => (
              <li className={"rankrow" + (i < 3 ? " top" + i : "")} key={i}>
                <span className="rankpos">{["🥇", "🥈", "🥉"][i] || (i + 1)}</span>
                <span className="rankname">{p.name}</span>
                <span className="rankscore">{p.correct} <span className="rankunit">correct</span></span>
              </li>
            ))}
          </ol>
          <div className="cats">
            {results.categories.map((c) => (
              <div className="cat" key={c.key}>
                <div className="catemoji">{c.emoji}</div>
                <div className="catlabel">{c.label}</div>
                <div className="catwinner">{c.winner}</div>
                <div className="catdetail">{c.detail}</div>
              </div>
            ))}
          </div>
          <div className="bar center">
            <button className="btn solid" onClick={() => send("reset")}>Back to lobby</button>
            <button className="btn ghost" onClick={onLeave}>Close</button>
          </div>
        </div>
      </Shell>
    );
  }

  // question / locked / reveal
  const reveal = snap.phase === "reveal";
  const locked = snap.phase === "locked";
  return (
    <Shell wide>
      <div className="card">
        <div className="row spread">
          <span className="pill">Question {snap.qIndex + 1} / {snap.qTotal}</span>
          <span className="muted small">{snap.simulating && <span className="simpill">◆ Simulation</span>} {snap.answeredCount} / {snap.players.filter((p) => !p.isHost).length} answered</span>
        </div>
        {snap.phase === "question" && <Timer seq={snap.qSeq} secs={snap.timeLimitSec} />}
        {locked && <div className="timesup">⏱ Time’s up — answers locked</div>}
        {qImage && <div className="qimgwrap"><img className="qimg" src={qImage} alt="" /></div>}
        <div className="qbig">{snap.qText}</div>
        <div className="optgrid">
          {snap.qOptions.map((o, i) => {
            const cls = reveal ? (i === snap.revealIndex ? "opt right" : "opt dim") : "opt";
            return <div className={cls + " c" + i} key={i}><span className="optltr">{LETTERS[i]}</span>{o}</div>;
          })}
        </div>
        <div className="bar center">
          {snap.phase === "question" && <button className="btn ghost" onClick={() => send("next")}>End answers →</button>}
          {locked && <button className="btn solid" onClick={() => send("next")}>Reveal answer →</button>}
          {reveal && <button className="btn solid" onClick={() => send("next")}>{snap.qIndex + 1 >= snap.qTotal ? "See results →" : "Next question →"}</button>}
          {snap.simulating && <button className="btn ghost" onClick={() => send("reset")}>■ Stop sim</button>}
        </div>
      </div>
      {reveal && ((snap.qIndex + 1) % 3 === 0 || snap.qIndex + 1 >= snap.qTotal) && (
        <LeaderboardCard players={players} />
      )}
    </Shell>
  );
}

// After each question: a spotlighted leader, a joke, then the ranked board.
function LeaderboardCard({ players }: { players: PlayerSnap[] }) {
  const [joke] = useState(() => {
    const leader = players[0], second = players[1];
    const tie = !!(leader && second && leader.correctCount === second.correctCount
      && avgCorrectMs(leader) === avgCorrectMs(second) && leader.correctCount > 0);
    return leaderQuip(leader && leader.correctCount > 0 ? leader.name : "", tie);
  });
  const leader = players[0];
  return (
    <div className="card lbcard">
      <div className="lbl">🏆 Leaderboard</div>
      {leader && leader.correctCount > 0 && (
        <div className="leadspot">
          <CrownMark />
          <div className="leadwho">
            <div className="leadname">{leader.name}</div>
            <div className="leadstat">{leader.correctCount} correct{avgCorrectMs(leader) !== Infinity ? ` · ${(avgCorrectMs(leader) / 1000).toFixed(1)}s avg` : ""}</div>
          </div>
        </div>
      )}
      <div className="jokebubble">“{joke}”</div>
      <div className="lblist">
        {players.slice(0, 8).map((p, i) => (
          <div className={"lbrow" + (i === 0 ? " lead" : "")} key={p.id} style={{ animationDelay: (i * 0.05).toFixed(2) + "s" }}>
            <span className="lbrank">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
            <span className="lbname">{p.name}{p.lastCorrect ? <span className="tickgood"> ✓</span> : <span className="tickbad"> ✗</span>}</span>
            <span className="lbcorrect">{p.correctCount} <span className="lbunit">correct</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================ PLAYER
function Player({ snap, me, results, send, onLeave }: { snap: Snap; me?: PlayerSnap; results: Results | null; send: (t: string, p?: any) => void; onLeave: () => void }) {
  const rank = me ? rankPlayers(snap.players).findIndex((p) => p.id === me.id) + 1 : 0;
  const nPlayers = snap.players.filter((p) => !p.isHost).length;
  const board = rankPlayers(snap.players);

  // The host runs the game and doesn't compete — show them game status, not answer buttons.
  if (me?.isHost) {
    return (
      <Shell>
        <div className="row spread">
          <span className="pill">{snap.code}</span>
          <span className="muted small">👑 {me.name} · hosting</span>
        </div>
        <HostBar snap={snap} send={send} />
        {snap.phase === "lobby" && <div className="card center muted">You're the host 👑 — start the game when everyone's on the big screen. You steer; you don't play.</div>}
        {(snap.phase === "question" || snap.phase === "locked") && (
          <div className="card center">
            <div className="lbl">Question {snap.qIndex + 1} / {snap.qTotal}</div>
            <div className="qmid">{snap.qText}</div>
            <div className="muted mt">{snap.answeredCount} / {nPlayers} answered{snap.phase === "locked" ? " · locked" : ""}</div>
          </div>
        )}
        {snap.phase === "reveal" && (
          <div className="card center">
            <div className="big good">Answer: {snap.qOptions[snap.revealIndex]}</div>
            {board[0] && board[0].correctCount > 0 && <div className="muted mt">🏆 Leading: <b>{board[0].name}</b> ({board[0].correctCount} correct)</div>}
          </div>
        )}
        {snap.phase === "results" && <div className="card center"><div className="big">That's a wrap! 🎉</div><div className="muted">The big screen has the final results.</div><button className="btn ghost mt" onClick={onLeave}>Leave</button></div>}
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="row spread">
        <span className="pill">{snap.code}</span>
        <span className="muted small">{me?.name} · {me?.correctCount ?? 0} correct</span>
      </div>

      {snap.phase === "lobby" && (
        <div className="card center muted">You’re in! Watch the big screen — the host will start soon.</div>
      )}

      {snap.phase === "question" && me && (
        me.answered
          ? <div className="card center"><div className="big">Locked in ✓</div><div className="muted">Waiting for the others…</div></div>
          : <div className="answers">
              {snap.qOptions.map((o, i) => (
                <button className={"abtn c" + i} key={i} onClick={() => send("answer", { index: i })}>
                  <span className="optltr">{LETTERS[i]}</span>{o}
                </button>
              ))}
            </div>
      )}

      {snap.phase === "locked" && me && (
        <div className="card center">
          <div className="big">{me.answered ? "Locked in ✓" : "Time’s up!"}</div>
          <div className="muted">Watch the big screen for the answer…</div>
        </div>
      )}

      {snap.phase === "reveal" && me && (
        <div className="card center">
          {me.lastCorrect
            ? <><div className="big good">Correct! +{me.lastDelta}</div>{me.streak > 1 && <div className="muted">🔥 {me.streak} in a row</div>}</>
            : <div className="big bad">{me.answered ? "Wrong" : "Too slow!"}</div>}
          <div className="muted mt">You’re #{rank} of {nPlayers} · {me.correctCount} correct</div>
        </div>
      )}

      {snap.phase === "results" && (
        <div className="card center">
          <div className="big">You finished #{rank} of {nPlayers}</div>
          <div className="muted">{me?.correctCount ?? 0} correct · {me?.score ?? 0} points</div>
          {results && results.categories.filter((c) => c.winner === me?.name).map((c) => (
            <div className="ribbon" key={c.key}>{c.emoji} {c.label}!</div>
          ))}
          <button className="btn ghost mt" onClick={onLeave}>Leave</button>
        </div>
      )}
    </Shell>
  );
}

// Host controls on the phone: mirrors the display's buttons for each phase.
function HostBar({ snap, send }: { snap: Snap; send: (t: string, p?: any) => void }) {
  return (
    <div className="hostbar">
      <span className="hostbadge">👑 Host controls</span>
      {snap.phase === "lobby" && <button className="btn solid sm" disabled={snap.players.filter((p) => !p.isHost).length < 1 || snap.qTotal < 1} onClick={() => send("start")}>Start ({snap.qTotal} Qs)</button>}
      {snap.phase === "question" && <button className="btn ghost sm" onClick={() => send("next")}>End answers →</button>}
      {snap.phase === "locked" && <button className="btn solid sm" onClick={() => send("next")}>Reveal answer →</button>}
      {snap.phase === "reveal" && <button className="btn solid sm" onClick={() => send("next")}>{snap.qIndex + 1 >= snap.qTotal ? "See results →" : "Next question →"}</button>}
      {snap.phase === "results" && <button className="btn ghost sm" onClick={() => send("reset")}>Back to lobby</button>}
    </div>
  );
}

// ============================================================ shared
function Timer({ seq, secs }: { seq: number; secs: number }) {
  const [left, setLeft] = useState(secs);
  useEffect(() => {
    setLeft(secs);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const rem = Math.max(0, secs - (Date.now() - t0) / 1000);
      setLeft(rem);
      if (rem <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [seq, secs]);
  const pct = Math.max(0, Math.min(100, (left / secs) * 100));
  const color = pct > 50 ? "var(--good)" : pct > 22 ? "var(--a2)" : "var(--bad)";
  const low = left <= 5;
  return <div className={"timer" + (low ? " low" : "")}><div className="timerbar" style={{ width: pct + "%", backgroundColor: color }} /><span className="timernum">{Math.ceil(left)}</span></div>;
}

function Confetti() {
  const colors = ["var(--punch)", "var(--gold)", "var(--zap)", "var(--good)", "var(--a1)", "var(--a2)"];
  const shapes = ["", "c", "s"]; // rectangle, circle, streamer
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 32 }, (_, i) => (
        <i key={i} className={shapes[i % 3]} style={{ left: Math.random() * 100 + "%", background: colors[i % colors.length], animationDelay: (Math.random() * 3).toFixed(2) + "s", animationDuration: (2.5 + Math.random() * 2.5).toFixed(2) + "s" }} />
      ))}
    </div>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className="bg"><Ambiance /><StringLights /><div className={"wrap" + (wide ? " wide" : "")}>{children}</div></div>;
}
