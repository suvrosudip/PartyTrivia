import { useEffect, useRef, useState } from "react";
import { Quiz } from "./net";
import { newQuestion } from "./quizzes";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Editor({ quiz, onPersist, onClose, onHost }: {
  quiz: Quiz; onPersist: (q: Quiz) => void | Promise<void>; onClose: () => void; onHost: (q: Quiz) => void;
}) {
  const [q, setQ] = useState<Quiz>(quiz);
  const [saved, setSaved] = useState(true);
  const timer = useRef<any>(null);

  // debounced autosave
  function update(next: Quiz) {
    setQ(next); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { await onPersist(next); setSaved(true); }, 700);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function flush() { if (timer.current) clearTimeout(timer.current); await onPersist(q); setSaved(true); }

  function setTitle(title: string) { update({ ...q, title }); }
  function addQuestion() { update({ ...q, questions: [...q.questions, newQuestion()] }); }
  function removeQuestion(i: number) { update({ ...q, questions: q.questions.filter((_, x) => x !== i) }); }
  function patchQ(i: number, patch: any) {
    update({ ...q, questions: q.questions.map((qq, x) => (x === i ? { ...qq, ...patch } : qq)) });
  }
  function setOption(qi: number, oi: number, val: string) {
    patchQ(qi, { options: q.questions[qi].options.map((o, x) => (x === oi ? val : o)) });
  }
  function addOption(qi: number) {
    const opts = q.questions[qi].options; if (opts.length >= 6) return;
    patchQ(qi, { options: [...opts, ""] });
  }
  function removeOption(qi: number, oi: number) {
    const cur = q.questions[qi]; if (cur.options.length <= 2) return;
    let correct = cur.correct;
    if (oi === correct) correct = 0; else if (oi < correct) correct -= 1;
    patchQ(qi, { options: cur.options.filter((_, x) => x !== oi), correct });
  }

  const ready = q.questions.length > 0 && q.questions.every((x) => x.text.trim() && x.options.filter((o) => o.trim()).length >= 2);

  return (
    <div className="bg"><div className="wrap">
      <div className="row spread">
        <button className="btn ghost sm" onClick={async () => { await flush(); onClose(); }}>← Done</button>
        <div className="lbl">{saved ? "Edit quiz · saved" : "Edit quiz · saving…"}</div>
        <button className="btn solid sm" disabled={!ready} onClick={async () => { await flush(); onHost(q); }}>Host ▶</button>
      </div>

      <input className="inp title" placeholder="Quiz title (e.g. How well do you know the bride?)" value={q.title} onChange={(e) => setTitle(e.target.value)} />

      {q.questions.map((qq, qi) => (
        <div className="card qedit" key={qi}>
          <div className="row spread">
            <span className="pill">Q{qi + 1}</span>
            <button className="btn ghost sm danger" onClick={() => removeQuestion(qi)}>Remove</button>
          </div>
          <textarea className="inp area" placeholder="Question text…" value={qq.text} rows={2}
            onChange={(e) => patchQ(qi, { text: e.target.value })} />
          <div className="muted small mb">Tap the circle to mark the correct answer.</div>
          {qq.options.map((o, oi) => (
            <div className="optedit" key={oi}>
              <button className={"radio" + (qq.correct === oi ? " on" : "")} title="Mark correct"
                onClick={() => patchQ(qi, { correct: oi })}>{qq.correct === oi ? "✓" : LETTERS[oi]}</button>
              <input className="inp" placeholder={`Option ${LETTERS[oi]}`} value={o} onChange={(e) => setOption(qi, oi, e.target.value)} />
              {qq.options.length > 2 && <button className="btn ghost sm" onClick={() => removeOption(qi, oi)}>✕</button>}
            </div>
          ))}
          <div className="row spread mt">
            {qq.options.length < 6 ? <button className="btn ghost sm" onClick={() => addOption(qi)}>+ Option</button> : <span />}
            <label className="muted small">Time
              <select className="seln" value={qq.timeLimitSec} onChange={(e) => patchQ(qi, { timeLimitSec: Number(e.target.value) })}>
                {[10, 15, 20, 30, 45, 60].map((s) => <option key={s} value={s}>{s}s</option>)}
              </select>
            </label>
          </div>
        </div>
      ))}

      <button className="btn solid full" onClick={addQuestion}>+ Add question</button>
      <div className="bar center">
        <button className="btn solid" disabled={!ready} onClick={async () => { await flush(); onHost(q); }}>Host this quiz ▶</button>
      </div>
      {!ready && <div className="muted small center">Each question needs text and at least two filled-in options.</div>}
    </div></div>
  );
}
