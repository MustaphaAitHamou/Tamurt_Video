/**
 * Génère les fichiers de l'identité visuelle à partir des tracés de
 * src/components/brand/logo-paths.ts :
 *   public/brand/tamurt-video-logo.svg      logotype complet (fond transparent)
 *   public/brand/tamurt-video-mark.svg      emblème seul
 *   src/app/icon.svg                        favicon vectoriel
 *   src/app/apple-icon.png                  icône 180×180
 *   public/brand/tamurt-video-logo-preview.png  aperçu sur fond sombre
 * Usage : pnpm brand:generate
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
  LETTERS_TAMURT,
  LETTERS_VIDEO,
  MARK_DIAMOND,
  MARK_INNER,
  MARK_PLAY,
  layoutLetters,
} from "../src/components/brand/logo-paths.ts";

const root = path.resolve(import.meta.dirname, "..");
const RED_TOP = "#ff4d5e";
const RED_BOTTOM = "#b01428";

const gradient = `<defs><linearGradient id="tv-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${RED_TOP}"/><stop offset="1" stop-color="${RED_BOTTOM}"/></linearGradient></defs>`;
const markGroup = `<path d="${MARK_DIAMOND}" fill="url(#tv-red)"/><path d="${MARK_INNER}" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.6"/><path d="${MARK_PLAY}" fill="#ffffff"/>`;

function logoSvg(options: { background?: string; scale?: number }) {
  const t = layoutLetters(LETTERS_TAMURT);
  const v = layoutLetters(LETTERS_VIDEO, 6);
  const scaleV = 0.42;
  const gap = 18;
  const width = 64 + gap + t.width + 14 + v.width * scaleV;
  const s = options.scale ?? 1;
  const letters = (placed: { d: string; x: number }[]) =>
    placed.map((p) => `<path transform="translate(${p.x} 0)" d="${p.d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(width * s).toFixed(0)}" height="${64 * s}" viewBox="0 0 ${width.toFixed(2)} 64" role="img" aria-label="Tamurt Vidéo">
<title>Tamurt Vidéo</title>${gradient}
${options.background ? `<rect width="100%" height="100%" fill="${options.background}"/>` : ""}
${markGroup}
<g transform="translate(${64 + gap} 12)" fill="#f5f5f7" fill-rule="evenodd">${letters(t.placed)}</g>
<g transform="translate(${(64 + gap + t.width + 14).toFixed(2)} ${(12 + 40 - 40 * scaleV).toFixed(2)}) scale(${scaleV})" fill="#e3263a" fill-rule="evenodd">${letters(v.placed)}</g>
</svg>
`;
}

function markSvg(size?: number, background?: string) {
  const dims = size ? ` width="${size}" height="${size}"` : "";
  const bg = background ? `<rect width="64" height="64" rx="14" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg"${dims} viewBox="0 0 64 64" role="img" aria-label="Tamurt Vidéo"><title>Tamurt Vidéo</title>${gradient}${bg}${markGroup}</svg>
`;
}

await mkdir(path.join(root, "public/brand"), { recursive: true });
await writeFile(path.join(root, "public/brand/tamurt-video-logo.svg"), logoSvg({}));
await writeFile(path.join(root, "public/brand/tamurt-video-mark.svg"), markSvg());
await writeFile(path.join(root, "src/app/icon.svg"), markSvg());
await sharp(Buffer.from(markSvg(180, "#0b0b0e"))).png().toFile(path.join(root, "src/app/apple-icon.png"));
await sharp(Buffer.from(markSvg(512, "#0b0b0e"))).png().toFile(path.join(root, "public/brand/icon-512.png"));
await sharp(Buffer.from(markSvg(192, "#0b0b0e"))).png().toFile(path.join(root, "public/brand/icon-192.png"));
await sharp(Buffer.from(logoSvg({ background: "#0b0b0e", scale: 4 })))
  .png()
  .toFile(path.join(root, "public/brand/tamurt-video-logo-preview.png"));
console.info("Identité visuelle générée.");
