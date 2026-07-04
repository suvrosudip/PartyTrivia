import { useEffect, useRef, useState } from "react";

// Looping background game-show theme. Browsers block autoplay with sound until
// the user interacts, so we (a) try to play immediately, and (b) also kick it off
// on the first pointer/key/touch anywhere. A floating button toggles mute, and the
// choice is remembered across sessions.
export function BackgroundMusic() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("pt-music") === "off"; } catch { return false; }
  });

  useEffect(() => {
    const a = new Audio("/theme.mp3");
    a.loop = true;
    a.volume = 0.22;         // gentle — it sits under the game, not over it
    a.preload = "auto";
    ref.current = a;

    const tryPlay = () => { if (!a.muted) a.play().catch(() => {}); };
    a.muted = muted;
    tryPlay();

    // Fallback: start (or resume) on the very first user interaction.
    const kick = () => { tryPlay(); cleanup(); };
    const cleanup = () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      window.removeEventListener("touchstart", kick);
    };
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    window.addEventListener("touchstart", kick, { once: true });

    return () => { cleanup(); a.pause(); ref.current = null; };
  }, []);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.muted = muted;
    if (!muted) a.play().catch(() => {});
    try { localStorage.setItem("pt-music", muted ? "off" : "on"); } catch {}
  }, [muted]);

  return (
    <button
      className="musictoggle"
      onClick={() => setMuted((m) => !m)}
      title={muted ? "Turn music on" : "Turn music off"}
      aria-label={muted ? "Turn music on" : "Turn music off"}
    >
      {muted ? "🔇" : "🎵"}
    </button>
  );
}
