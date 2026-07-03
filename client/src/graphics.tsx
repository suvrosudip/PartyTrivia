// Crisp inline-SVG graphics for the party-game theme. All scale-free.

export function Ambiance() {
  return (
    <div className="ambiance" aria-hidden="true">
      <span className="orb orb1" /><span className="orb orb2" /><span className="orb orb3" /><span className="orb orb4" />
    </div>
  );
}

// Crown used to spotlight the current leader.
export function CrownMark() {
  return (
    <svg className="crownmark" viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe9a6" /><stop offset="1" stopColor="#f5a623" /></linearGradient>
      </defs>
      <path d="M6 44 L10 16 L22 30 L32 10 L42 30 L54 16 L58 44 Z" fill="url(#cr-g)" stroke="#c9800f" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="6" y="44" width="52" height="7" rx="3" fill="#e2930f" />
      <circle cx="32" cy="10" r="4" fill="#fff4cf" stroke="#c9800f" strokeWidth="1.2" />
      <circle cx="10" cy="16" r="3.4" fill="#fff4cf" stroke="#c9800f" strokeWidth="1.2" />
      <circle cx="54" cy="16" r="3.4" fill="#fff4cf" stroke="#c9800f" strokeWidth="1.2" />
      <circle cx="20" cy="41" r="2.4" fill="#ff5aa0" /><circle cx="32" cy="41" r="2.4" fill="#3d7bff" /><circle cx="44" cy="41" r="2.4" fill="#16c784" />
    </svg>
  );
}

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={"sparkle " + className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 1l2.4 6.4L21 10l-6.6 2.6L12 19l-2.4-6.4L3 10l6.6-1.6z" fill="currentColor" />
    </svg>
  );
}

export function HeroScene() {
  return (
    <svg className="heroscene" viewBox="0 0 200 180" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bl-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7eb3" /><stop offset="1" stopColor="#ff3d7f" /></linearGradient>
        <linearGradient id="bl-violet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a98bff" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="bl-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ffb01f" /></linearGradient>
        <radialGradient id="bl-glow" cx="50%" cy="42%" r="60%"><stop offset="0" stopColor="#ffd36b" stopOpacity=".5" /><stop offset="1" stopColor="#ffd36b" stopOpacity="0" /></radialGradient>
      </defs>
      {/* soft glow behind the centre balloon */}
      <ellipse cx="100" cy="60" rx="70" ry="60" fill="url(#bl-glow)" />
      {/* strings */}
      <path d="M62 98q-6 26 6 54" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
      <path d="M138 98q8 24-4 54" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
      <path d="M100 106q2 28 0 52" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" fill="none" />
      {/* side balloons */}
      <g className="float-a">
        <ellipse cx="62" cy="66" rx="30" ry="36" fill="url(#bl-pink)" />
        <ellipse cx="52" cy="54" rx="7" ry="11" fill="#fff" opacity=".4" />
        <path d="M58 101l8 0-4 7z" fill="#ff3d7f" />
      </g>
      <g className="float-b">
        <ellipse cx="138" cy="66" rx="30" ry="36" fill="url(#bl-violet)" />
        <ellipse cx="128" cy="54" rx="7" ry="11" fill="#fff" opacity=".4" />
        <path d="M134 101l8 0-4 7z" fill="#7c3aed" />
      </g>
      {/* center balloon with the "?" */}
      <g className="float-c">
        <ellipse cx="100" cy="60" rx="37" ry="43" fill="url(#bl-gold)" />
        <ellipse cx="88" cy="46" rx="8" ry="13" fill="#fff" opacity=".45" />
        <path d="M95 101l10 0-5 8z" fill="#ffb01f" />
        <text x="100" y="76" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="44" fill="#5a3d00">?</text>
      </g>
      {/* confetti + sparkles */}
      <circle cx="22" cy="32" r="4" fill="#16c784" /><rect x="176" y="28" width="8" height="8" rx="2" fill="#3d7bff" transform="rotate(20 180 32)" />
      <circle cx="186" cy="94" r="3.5" fill="#ff5aa0" /><rect x="14" y="94" width="7" height="7" rx="2" fill="#ffc83a" transform="rotate(-15 17 97)" />
      <path d="M30 122l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff" />
      <path d="M168 128l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" fill="#ffe08a" />
    </svg>
  );
}

export function StringLights() {
  const colors = ["var(--gold)", "var(--punch)", "var(--zap)", "var(--good)", "var(--a1)"];
  return (
    <div className="lights" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span className="bulb" key={i} style={{ ["--c" as any]: colors[i % colors.length], animationDelay: (i * 0.18).toFixed(2) + "s" }} />
      ))}
    </div>
  );
}

export function HeroMark() {
  return (
    <svg className="heromark" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="hm-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3d7f" /><stop offset="1" stopColor="#8b5cff" />
        </linearGradient>
      </defs>
      {/* confetti burst behind the card */}
      <circle cx="22" cy="34" r="4" fill="#ffc83a" />
      <rect x="92" y="20" width="8" height="8" rx="2" fill="#16c784" transform="rotate(20 96 24)" />
      <circle cx="100" cy="64" r="3.5" fill="#3d7bff" />
      <rect x="14" y="74" width="7" height="7" rx="2" fill="#ff5aa0" transform="rotate(-15 17 77)" />
      <path d="M98 92l2.2 4.6 5 .6-3.7 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.5 5-.6z" fill="#ffc83a" />
      {/* trivia card */}
      <g transform="rotate(-8 60 62)">
        <rect x="38" y="30" width="44" height="60" rx="12" fill="url(#hm-card)" />
        <rect x="38" y="30" width="44" height="60" rx="12" fill="#fff" opacity="0.08" />
        <text x="60" y="74" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="42" fill="#fff">?</text>
      </g>
      {/* sparkle */}
      <path d="M86 36l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff" />
    </svg>
  );
}

export function Trophy() {
  return (
    <svg className="trophy" viewBox="0 0 110 110" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ffb01f" />
        </linearGradient>
        <radialGradient id="tr-glow" cx="50%" cy="40%" r="55%"><stop offset="0" stopColor="#ffe08a" stopOpacity=".55" /><stop offset="1" stopColor="#ffe08a" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="55" cy="48" r="42" fill="url(#tr-glow)" />
      {/* laurels */}
      <path d="M22 40q-8 14 4 30" stroke="#8fd6a8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M88 40q8 14-4 30" stroke="#8fd6a8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g fill="#7cc999">
        <ellipse cx="20" cy="46" rx="4" ry="2.4" transform="rotate(-40 20 46)" /><ellipse cx="20" cy="58" rx="4" ry="2.4" transform="rotate(-20 20 58)" /><ellipse cx="24" cy="68" rx="4" ry="2.4" transform="rotate(10 24 68)" />
        <ellipse cx="90" cy="46" rx="4" ry="2.4" transform="rotate(40 90 46)" /><ellipse cx="90" cy="58" rx="4" ry="2.4" transform="rotate(20 90 58)" /><ellipse cx="86" cy="68" rx="4" ry="2.4" transform="rotate(-10 86 68)" />
      </g>
      {/* cup */}
      <path d="M35 20h40v10c0 13-9 22-20 22S35 43 35 30z" fill="url(#tr-g)" stroke="#e2930f" strokeWidth="1.5" />
      <path d="M35 24H25c0 10 6 15 12 16M75 24h10c0 10-6 15-12 16" stroke="#ffb01f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="51" y="50" width="8" height="12" fill="#ffb01f" />
      <path d="M41 62h28l-3 8H44z" fill="url(#tr-g)" />
      <rect x="37" y="70" width="36" height="8" rx="3" fill="#e89412" />
      <path d="M55 26l1.8 4.4 4.7.4-3.6 3 1.1 4.6L55 40l-4 2.4 1.1-4.6-3.6-3 4.7-.4z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

// Winners' podium used on the results screen.
export function Podium() {
  return (
    <svg className="podiumart" viewBox="0 0 180 110" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pd-1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ffb01f" /></linearGradient>
        <linearGradient id="pd-2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6e9f2" /><stop offset="1" stopColor="#b9c0d4" /></linearGradient>
        <linearGradient id="pd-3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2b58a" /><stop offset="1" stopColor="#cd7f4e" /></linearGradient>
      </defs>
      {/* 2nd */}
      <rect x="14" y="52" width="44" height="54" rx="5" fill="url(#pd-2)" /><text x="36" y="86" textAnchor="middle" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="22" fill="#7c8296">2</text>
      {/* 1st */}
      <rect x="66" y="30" width="48" height="76" rx="5" fill="url(#pd-1)" /><text x="90" y="70" textAnchor="middle" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="26" fill="#8a5a09">1</text>
      {/* 3rd */}
      <rect x="122" y="64" width="44" height="42" rx="5" fill="url(#pd-3)" /><text x="144" y="92" textAnchor="middle" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="20" fill="#8a4f28">3</text>
      {/* star over 1st */}
      <path d="M90 12l2.6 6 6.4.6-4.8 4.3 1.4 6.3L90 32l-5.6 3.5 1.4-6.3-4.8-4.3 6.4-.6z" fill="#fff" opacity=".95" />
    </svg>
  );
}

export function EmptyArt() {
  return (
    <svg className="emptyart" viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <rect x="34" y="26" width="92" height="68" rx="12" fill="none" stroke="#d9cdec" strokeWidth="3" strokeDasharray="7 7" />
      <circle cx="80" cy="60" r="17" fill="none" stroke="#8b5cff" strokeWidth="3" />
      <path d="M80 52v16M72 60h16" stroke="#8b5cff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="20" r="3.5" fill="#ffc83a" />
      <rect x="120" y="16" width="7" height="7" rx="2" fill="#ff3d7f" transform="rotate(20 123 19)" />
      <circle cx="132" cy="98" r="3" fill="#16c784" />
    </svg>
  );
}
