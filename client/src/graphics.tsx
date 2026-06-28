// Crisp inline-SVG graphics for the party-game theme. All scale-free.

export function Ambiance() {
  return (
    <div className="ambiance" aria-hidden="true">
      <span className="orb orb1" /><span className="orb orb2" /><span className="orb orb3" /><span className="orb orb4" />
    </div>
  );
}

export function HeroScene() {
  return (
    <svg className="heroscene" viewBox="0 0 200 170" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bl-pink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7eb3" /><stop offset="1" stopColor="#ff3d7f" /></linearGradient>
        <linearGradient id="bl-violet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a98bff" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="bl-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ffb01f" /></linearGradient>
      </defs>
      {/* strings */}
      <path d="M62 96q-6 26 6 52" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
      <path d="M138 96q8 24-4 52" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.6" fill="none" />
      <path d="M100 104q2 28 0 50" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" fill="none" />
      {/* side balloons */}
      <g className="float-a">
        <ellipse cx="62" cy="64" rx="30" ry="36" fill="url(#bl-pink)" />
        <ellipse cx="52" cy="52" rx="7" ry="11" fill="#fff" opacity=".4" />
        <path d="M58 99l8 0-4 7z" fill="#ff3d7f" />
      </g>
      <g className="float-b">
        <ellipse cx="138" cy="64" rx="30" ry="36" fill="url(#bl-violet)" />
        <ellipse cx="128" cy="52" rx="7" ry="11" fill="#fff" opacity=".4" />
        <path d="M134 99l8 0-4 7z" fill="#7c3aed" />
      </g>
      {/* center balloon with the "?" */}
      <g className="float-c">
        <ellipse cx="100" cy="58" rx="36" ry="42" fill="url(#bl-gold)" />
        <ellipse cx="88" cy="44" rx="8" ry="13" fill="#fff" opacity=".45" />
        <path d="M95 99l10 0-5 8z" fill="#ffb01f" />
        <text x="100" y="74" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="44" fill="#5a3d00">?</text>
      </g>
      {/* confetti */}
      <circle cx="22" cy="30" r="4" fill="#16c784" /><rect x="176" y="26" width="8" height="8" rx="2" fill="#3d7bff" transform="rotate(20 180 30)" />
      <circle cx="186" cy="92" r="3.5" fill="#ff5aa0" /><rect x="14" y="92" width="7" height="7" rx="2" fill="#ffc83a" transform="rotate(-15 17 95)" />
      <path d="M30 120l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff" />
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
    <svg className="trophy" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ffb01f" />
        </linearGradient>
      </defs>
      <path d="M28 16h40v10c0 13-9 22-20 22S28 39 28 26z" fill="url(#tr-g)" />
      <path d="M28 20H18c0 10 6 15 12 16M68 20h10c0 10-6 15-12 16" stroke="#ffb01f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="44" y="46" width="8" height="12" fill="#ffb01f" />
      <path d="M34 58h28l-3 8H37z" fill="url(#tr-g)" />
      <rect x="30" y="66" width="36" height="7" rx="3" fill="#e89412" />
      <path d="M48 24l1.8 4.4 4.7.4-3.6 3 1.1 4.6L48 38l-4 2.4 1.1-4.6-3.6-3 4.7-.4z" fill="#fff" opacity="0.85" />
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
