// Narration manager: prefers server-side ElevenLabs audio (works on TV browsers),
// and falls back to the browser's built-in speech engine when TTS isn't configured.
import { speak, stopSpeaking, primeSpeech, speechStatus } from "./speech";

const ENDPOINT = ((import.meta as any).env.VITE_SERVER_URL || "http://localhost:2567").replace(/\/+$/, "");
const SILENT = "data:audio/wav;base64,UklGRuQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YcADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

let audio: HTMLAudioElement | null = null;
let useServer = false;
let probed = false;

function el(): HTMLAudioElement {
  if (!audio) { audio = new Audio(); audio.preload = "auto"; }
  return audio;
}

// Probe once whether the server can synthesize narration.
export async function initNarration(): Promise<boolean> {
  try {
    const r = await fetch(`${ENDPOINT}/api/tts-status`);
    const j = await r.json();
    useServer = !!j.enabled;
  } catch { useServer = false; }
  probed = true;
  return useServer;
}
export function narrationReady() { return probed; }
export function narrationMode(): "server" | "browser" { return useServer ? "server" : "browser"; }

// Call from a user gesture (opening the display) to unlock both audio paths.
export function primeNarration() {
  primeSpeech();
  try {
    const a = el();
    a.src = SILENT;
    a.play()?.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  } catch {}
}

export function narrate(text: string) {
  if (!text) return;
  if (useServer) {
    const a = el();
    a.onerror = () => { useServer = false; speak(text); }; // mid-game fallback
    a.src = `${ENDPOINT}/api/tts?text=${encodeURIComponent(text)}`;
    a.play()?.catch(() => speak(text)); // autoplay blocked / network → fallback
  } else {
    speak(text);
  }
}

export function testNarration() {
  primeNarration();
  narrate("Welcome to Midnight Mafia. If you can hear this, narration is working on this screen.");
}

export function stopNarration() {
  if (audio) { try { audio.pause(); } catch {} }
  stopSpeaking();
}

// Re-export so callers can decide whether to warn about no browser voice.
export { speechStatus };
