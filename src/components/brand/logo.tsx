import { useId } from "react";

import { cn } from "@/lib/utils";
import {
  LETTERS_TAMURT,
  LETTERS_VIDEO,
  MARK_DIAMOND,
  MARK_INNER,
  MARK_PLAY,
  layoutLetters,
} from "@/components/brand/logo-paths";

const tamurt = layoutLetters(LETTERS_TAMURT);
const video = layoutLetters(LETTERS_VIDEO, 6);
const VIDEO_SCALE = 0.42;
const MARK_GAP = 18;
const FULL_WIDTH = 64 + MARK_GAP + tamurt.width + 14 + video.width * VIDEO_SCALE;

function MarkShapes({ gradientId }: { gradientId: string }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d5e" />
          <stop offset="1" stopColor="#b01428" />
        </linearGradient>
      </defs>
      <path d={MARK_DIAMOND} fill={`url(#${gradientId})`} />
      <path d={MARK_INNER} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={1.6} />
      <path d={MARK_PLAY} fill="#fff" />
    </>
  );
}

/** Emblème seul (losange et triangle de lecture). */
export function LogoMark({
  className,
  title = "Tamurt Vidéo",
}: {
  className?: string;
  title?: string;
}) {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("size-8 shrink-0", className)}
    >
      <MarkShapes gradientId={gradientId} />
    </svg>
  );
}

/** Logotype complet, vectoriel et indépendant des polices chargées. */
export function Logo({
  className,
  title = "Tamurt Vidéo",
}: {
  className?: string;
  title?: string;
}) {
  const gradientId = useId();
  return (
    <svg
      viewBox={`0 -2 ${FULL_WIDTH.toFixed(2)} 68`}
      role="img"
      aria-label={title}
      className={cn("h-8 w-auto shrink-0", className)}
    >
      <MarkShapes gradientId={gradientId} />
      <g transform={`translate(${64 + MARK_GAP} 12)`} fill="currentColor" fillRule="evenodd">
        {tamurt.placed.map((letter, index) => (
          <path key={index} transform={`translate(${letter.x} 0)`} d={letter.d} />
        ))}
      </g>
      <g
        transform={`translate(${(64 + MARK_GAP + tamurt.width + 14).toFixed(2)} ${(52 - 40 * VIDEO_SCALE).toFixed(2)}) scale(${VIDEO_SCALE})`}
        fill="var(--primary)"
        fillRule="evenodd"
      >
        {video.placed.map((letter, index) => (
          <path key={index} transform={`translate(${letter.x} 0)`} d={letter.d} />
        ))}
      </g>
    </svg>
  );
}
