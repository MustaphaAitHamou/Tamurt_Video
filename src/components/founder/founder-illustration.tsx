import { cn } from "@/lib/utils";

/*
 * Illustration originale de l'accueil (phase fondatrice) : un écran ouvert sur un village
 * kabyle de nuit, au pied des montagnes, une pellicule ornée de motifs berbères et le yaz ⵣ.
 * Purement décorative. Les animations (classes tv-*) s'arrêtent si l'utilisateur limite les
 * mouvements. Utilisée une fois par page : ids fixes.
 */

const RED = "#e5162f";
const GOLD = "#e8b86a";
const NIGHT = "#0f0f10";

function Yaz({
  x,
  y,
  size,
  color,
  width = 3,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  width?: number;
}) {
  const s = size / 16;
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -8V8M-6 -7C-6 -2 6 -2 6 -7M-6 7C-6 2 6 2 6 7"
      fill="none"
      stroke={color}
      strokeWidth={width / s}
      strokeLinecap="round"
    />
  );
}

function Sparkle({
  x,
  y,
  size,
  color = GOLD,
  delay = 0,
}: {
  x: number;
  y: number;
  size: number;
  color?: string;
  delay?: number;
}) {
  const k = size * 0.2;
  return (
    <path
      className="tv-twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - size}C${x + k} ${y - k} ${x + k} ${y - k} ${x + size} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + size}C${x - k} ${y + k} ${x - k} ${y + k} ${x - size} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - size}Z`}
      fill={color}
    />
  );
}

/** Petite maison kabyle : murs clairs, toit de tuiles, fenêtre éclairée. */
function House({ x, y, w = 26, lit = true }: { x: number; y: number; w?: number; lit?: boolean }) {
  const h = w * 0.62;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M-3 0 ${w / 2} ${-h * 0.62} ${w + 3} 0Z`} fill="#8f1d22" />
      <rect y="0" width={w} height={h} fill="#e9dcc7" />
      <rect
        x={w * 0.18}
        y={h * 0.3}
        width={w * 0.24}
        height={h * 0.34}
        rx="1"
        fill={lit ? GOLD : "#3a3330"}
      />
      <rect x={w * 0.6} y={h * 0.38} width={w * 0.2} height={h * 0.62} fill="#5b3a2a" />
    </g>
  );
}

export function FounderIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 440" aria-hidden className={cn("h-auto w-full", className)}>
      <defs>
        <radialGradient id="tv-halo" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor={RED} stopOpacity="0.4" />
          <stop offset="1" stopColor={RED} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0b16" />
          <stop offset="1" stopColor="#4a0f1b" />
        </linearGradient>
        <clipPath id="tv-screen">
          <rect x="62" y="64" width="396" height="246" rx="16" />
        </clipPath>
        <filter id="tv-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <circle cx="260" cy="200" r="230" fill="url(#tv-halo)" />

      {/* L'écran et sa scène : la nuit sur les montagnes et le village */}
      <g filter="url(#tv-shadow)">
        <rect
          x="56"
          y="58"
          width="408"
          height="258"
          rx="20"
          fill="#1c1c1f"
          stroke="#ffffff"
          strokeOpacity="0.14"
          strokeWidth="2"
        />
      </g>
      <g clipPath="url(#tv-screen)">
        <rect x="62" y="64" width="396" height="246" fill="url(#tv-sky)" />
        <circle cx="384" cy="118" r="22" fill={GOLD} opacity="0.9" />
        <circle cx="394" cy="112" r="20" fill="#1f0c17" />
        {[
          [110, 96, 1.6],
          [160, 124, 1.2],
          [210, 90, 1.4],
          [300, 104, 1.1],
          [440, 150, 1.3],
          [340, 82, 1.5],
        ].map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="#ffffff"
            className="tv-twinkle"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
        {/* Montagnes du Djurdjura, en trois plans */}
        <path
          d="M62 236 120 168 160 204 214 140 268 214 312 170 372 226 420 182 458 214V310H62Z"
          fill="#6b1420"
        />
        <path
          d="M62 262 112 222 168 252 226 206 286 258 344 220 404 260 458 236V310H62Z"
          fill="#3b0c15"
        />
        <path d="M62 310V282C120 260 190 252 260 258C330 264 400 270 458 262V310Z" fill="#21090e" />
        <House x={170} y={250} />
        <House x={204} y={244} w={30} />
        <House x={242} y={252} w={22} lit={false} />
        <House x={300} y={256} w={24} />
        {/* Bande de motifs au bas de l'écran */}
        <path
          d="M62 300 72 292 82 300 92 292 102 300 112 292 122 300 132 292 142 300 152 292 162 300 172 292 182 300 192 292 202 300 212 292 222 300 232 292 242 300 252 292 262 300 272 292 282 300 292 292 302 300 312 292 322 300 332 292 342 300 352 292 362 300 372 292 382 300 392 292 402 300 412 292 422 300 432 292 442 300 452 292 458 297"
          fill="none"
          stroke={GOLD}
          strokeOpacity="0.55"
          strokeWidth="2"
        />
      </g>

      {/* Lecture */}
      <circle
        cx="260"
        cy="176"
        r="40"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        className="tv-pulse"
        style={{ transformOrigin: "260px 176px" }}
      />
      <circle cx="260" cy="176" r="32" fill={RED} />
      <path d="M250 160v32l26-16Z" fill="#ffffff" />

      {/* Pellicule ornée de motifs berbères */}
      <g className="tv-float">
        <g transform="translate(18 318) rotate(-6)">
          <rect width="300" height="64" rx="6" fill={NIGHT} stroke="#ffffff" strokeOpacity="0.18" />
          {Array.from({ length: 15 }, (_, i) => (
            <g key={i} fill="#ffffff" fillOpacity="0.35">
              <rect x={8 + i * 19.4} y="5" width="9" height="7" rx="1.5" />
              <rect x={8 + i * 19.4} y="52" width="9" height="7" rx="1.5" />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${14 + i * 72} 16)`}>
              <rect
                width="62"
                height="32"
                rx="3"
                fill="#1c1c1f"
                stroke={GOLD}
                strokeOpacity="0.5"
              />
              {i === 0 && (
                <path
                  d="M31 6 45 16 31 26 17 16Z M31 11 38 16 31 21 24 16Z"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.6"
                />
              )}
              {i === 1 && (
                <path
                  d="M6 22 14 12 22 22 30 12 38 22 46 12 54 22"
                  fill="none"
                  stroke={RED}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )}
              {i === 2 && <Yaz x={31} y={16} size={20} color={GOLD} width={2.2} />}
              {i === 3 && (
                <path
                  d="M10 8h10v16H10Z M26 8h10v16H26Z M42 8h10v16H42Z"
                  fill={RED}
                  fillOpacity="0.8"
                />
              )}
            </g>
          ))}
        </g>
      </g>

      <Sparkle x={470} y={60} size={11} />
      <Sparkle x={490} y={250} size={7} color="#ffffff" delay={1.1} />
      <Sparkle x={40} y={120} size={8} delay={0.6} />
      <Sparkle x={420} y={360} size={9} color={RED} delay={1.7} />
    </svg>
  );
}
