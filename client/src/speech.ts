// Browser narration. Only the display device calls this.
let chosen: SpeechSynthesisVoice | null = null;
let keep: any = null;

function synth(): SpeechSynthesis | null {
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}

export function speechAvailable(): boolean { return !!synth(); }
export function voiceCount(): number { const s = synth(); return s ? s.getVoices().length : 0; }
export function speechStatus(): "unsupported" | "no-voices" | "ok" {
  if (!synth()) return "unsupported";
  return voiceCount() > 0 ? "ok" : "no-voices";
}

function pickFrom(vs: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!vs.length) return null;
  const en = vs.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : vs;
  const prefs = ["daniel", "arthur", "google uk english male", "microsoft guy", "microsoft david", "george", "male"];
  for (const k of prefs) { const m = pool.find((v) => v.name.toLowerCase().includes(k)); if (m) return m; }
  return pool[0];
}
function loadVoices() {
  const s = synth(); if (!s) return;
  const vs = s.getVoices();
  if (vs.length && !chosen) chosen = pickFrom(vs);
}
if (synth()) {
  loadVoices();
  try { window.speechSynthesis.onvoiceschanged = () => { chosen = null; loadVoices(); }; } catch {}
}

// Call from a user gesture (opening the display) to unlock audio on strict browsers.
export function primeSpeech() {
  const s = synth(); if (!s) return;
  try {
    s.resume();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    s.speak(u);
  } catch {}
  loadVoices();
}

// Some engines choke on long utterances (or cut off ~15s in), so narrate sentence by sentence.
function chunk(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 200 && buf) { out.push(buf.trim()); buf = p; }
    else buf += p;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function speak(text: string) {
  const s = synth(); if (!s || !text) return;
  s.cancel();
  if (!chosen) loadVoices();
  const pieces = chunk(text);
  setTimeout(() => {
    for (const piece of pieces) {
      const u = new SpeechSynthesisUtterance(piece);
      if (chosen) u.voice = chosen;
      u.rate = 0.9; u.pitch = 0.85; u.volume = 1;
      u.onend = maybeStopKeep; u.onerror = maybeStopKeep;
      s.speak(u);
    }
    startKeep();
  }, 60);
}

export function speakTest() {
  primeSpeech();
  speak("Welcome to Midnight Mafia. If you can hear this, narration is working on this screen.");
}

export function stopSpeaking() { const s = synth(); if (s) s.cancel(); stopKeep(); }

function maybeStopKeep() { const s = synth(); if (s && !s.speaking && !s.pending) stopKeep(); }
function startKeep() {
  stopKeep();
  keep = setInterval(() => {
    const s = synth();
    if (s && s.speaking) { s.pause(); s.resume(); } else stopKeep();
  }, 12000);
}
function stopKeep() { if (keep) { clearInterval(keep); keep = null; } }
