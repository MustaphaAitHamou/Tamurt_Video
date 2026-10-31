/**
 * Génère les affiches (2:3) et bannières (16:9) originales des œuvres fictives
 * de démonstration : paysages stylisés et motifs géométriques amazighs, rendus
 * de façon déterministe (même entrée, même image). Aucune image tierce.
 * Sortie : public/demo/titles/<slug>/{poster,backdrop}.webp
 * Usage : pnpm demo:art
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { DEMO_TITLES, type DemoTitle, type Scene } from "./demo/catalog.mts";

const root = path.resolve(import.meta.dirname, "..");

function rng(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function wrap(text: string, maxChars: number) {
  const words = text.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Frise de losanges et chevrons (poteries et tissages kabyles). */
function motifBand(y: number, width: number, color: string, opacity: number, size = 26) {
  let d = "";
  for (let x = -size; x < width + size; x += size * 2) {
    d += `M${x} ${y} l${size} ${-size * 0.6} l${size} ${size * 0.6} l${-size} ${size * 0.6} z `;
  }
  let chevrons = "";
  for (let x = -size; x < width + size; x += size) {
    chevrons += `M${x} ${y + size * 1.1} l${size / 2} ${-size / 3} l${size / 2} ${size / 3} `;
  }
  return `<g opacity="${opacity}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2"/><path d="${chevrons}" fill="none" stroke="${color}" stroke-width="2"/></g>`;
}

function scene(kind: Scene, w: number, h: number, palette: [string, string, string], random: () => number) {
  const [dark, mid, light] = palette;
  const horizon = h * (0.55 + random() * 0.1);
  switch (kind) {
    case "mountains": {
      const layers = [0, 1, 2].map((layer) => {
        let d = `M0 ${h} L0 ${horizon + layer * 40}`;
        const peaks = 5 + layer * 2;
        for (let i = 0; i <= peaks; i++) {
          const x = (w / peaks) * i;
          const y = horizon - 160 + layer * 70 + random() * 120 - (i % 2 === 0 ? 90 : 0);
          d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        d += ` L${w} ${h} Z`;
        const fill = layer === 0 ? mid : layer === 1 ? dark : "#000";
        return `<path d="${d}" fill="${fill}" opacity="${0.55 + layer * 0.2}"/>`;
      });
      return `<circle cx="${w * 0.72}" cy="${horizon - 260}" r="${w * 0.09}" fill="${light}" opacity="0.85"/>${layers.join("")}`;
    }
    case "sea": {
      let waves = "";
      for (let i = 0; i < 9; i++) {
        const y = horizon + i * ((h - horizon) / 9);
        let d = `M0 ${y}`;
        for (let x = 0; x <= w; x += 80) d += ` q40 ${-10 - random() * 8} 80 0`;
        waves += `<path d="${d}" fill="none" stroke="${light}" stroke-opacity="${0.12 + i * 0.05}" stroke-width="3"/>`;
      }
      return `<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${mid}" opacity="0.6"/><circle cx="${w * 0.5}" cy="${horizon}" r="${w * 0.16}" fill="${light}" opacity="0.8"/>${waves}`;
    }
    case "desert": {
      let dunes = "";
      for (let i = 0; i < 4; i++) {
        const y = horizon + i * 70;
        dunes += `<path d="M0 ${y} C ${w * 0.25} ${y - 120 + random() * 60}, ${w * 0.55} ${y + 90}, ${w} ${y - 40 + random() * 50} L${w} ${h} L0 ${h} Z" fill="${i % 2 ? dark : mid}" opacity="${0.5 + i * 0.15}"/>`;
      }
      return `<circle cx="${w * 0.3}" cy="${horizon - 140}" r="${w * 0.12}" fill="${light}" opacity="0.9"/>${dunes}`;
    }
    case "city": {
      let blocks = "";
      let x = 0;
      while (x < w) {
        const bw = 40 + random() * 90;
        const bh = 80 + random() * (h * 0.35);
        blocks += `<rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${random() > 0.5 ? dark : "#000"}" opacity="0.9"/>`;
        for (let wy = h - bh + 18; wy < h - 20; wy += 34) {
          if (random() > 0.55) blocks += `<rect x="${(x + 10).toFixed(1)}" y="${wy.toFixed(1)}" width="10" height="14" fill="${light}" opacity="0.7"/>`;
        }
        x += bw + 4;
      }
      return `<circle cx="${w * 0.78}" cy="${h * 0.22}" r="${w * 0.07}" fill="${light}" opacity="0.8"/>${blocks}`;
    }
    case "olive": {
      let trees = "";
      for (let i = 0; i < 7; i++) {
        const cx = (w / 7) * i + random() * 40;
        const cy = horizon + 40 + random() * 60;
        const r = 50 + random() * 40;
        trees += `<rect x="${cx - 6}" y="${cy}" width="12" height="${h - cy}" fill="#000" opacity="0.7"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${mid}" opacity="0.75"/><circle cx="${cx + r * 0.4}" cy="${cy - r * 0.3}" r="${r * 0.6}" fill="${light}" opacity="0.25"/>`;
      }
      return `<rect y="${horizon + 80}" width="${w}" height="${h}" fill="${dark}"/>${trees}`;
    }
    case "night": {
      let stars = "";
      for (let i = 0; i < 90; i++) {
        stars += `<circle cx="${(random() * w).toFixed(1)}" cy="${(random() * horizon).toFixed(1)}" r="${(random() * 1.8 + 0.4).toFixed(2)}" fill="#fff" opacity="${(0.3 + random() * 0.6).toFixed(2)}"/>`;
      }
      return `${stars}<circle cx="${w * 0.2}" cy="${h * 0.2}" r="${w * 0.05}" fill="${light}" opacity="0.9"/><path d="M0 ${horizon} Q ${w * 0.5} ${horizon - 120} ${w} ${horizon} L${w} ${h} L0 ${h} Z" fill="#000" opacity="0.85"/>`;
    }
    default: {
      let diamonds = "";
      const step = 120;
      for (let y = -step; y < h + step; y += step) {
        for (let x = -step; x < w + step; x += step) {
          const s = 30 + random() * 40;
          diamonds += `<path d="M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z" fill="none" stroke="${random() > 0.5 ? light : mid}" stroke-opacity="0.35" stroke-width="3"/>`;
        }
      }
      return diamonds;
    }
  }
}

function svg(title: DemoTitle, w: number, h: number, withText: boolean) {
  const random = rng(`${title.slug}-${w}x${h}`);
  const [dark, mid, light] = title.palette;
  const lines = wrap(title.title, w > h ? 22 : 12);
  const longest = Math.max(...lines.map((line) => line.length));
  // Largeur moyenne d'une capitale grasse ≈ 0,66 × corps : le titre tient dans 88 % de la largeur.
  const fontSize = Math.min(w > h ? 92 : 74, Math.floor((w * 0.88) / (longest * 0.66)));
  const textBlock = withText
    ? `<g font-family="Inter Display, Inter, DejaVu Sans, sans-serif" fill="#fff" text-anchor="middle">
        <text x="${w / 2}" y="70" font-size="22" font-weight="700" letter-spacing="8" opacity="0.85">TAMURT VIDÉO</text>
        ${lines
          .map(
            (line, i) =>
              `<text x="${w / 2}" y="${h - 210 - (lines.length - 1 - i) * (fontSize * 1.02)}" font-size="${fontSize}" font-weight="900" letter-spacing="1">${escapeXml(line)}</text>`,
          )
          .join("")}
        <text x="${w / 2}" y="${h - 150}" font-size="22" font-weight="500" opacity="0.8">${escapeXml(title.tagline)}</text>
        <text x="${w / 2}" y="${h - 70}" font-size="18" font-weight="700" letter-spacing="6" opacity="0.6">ŒUVRE FICTIVE · DÉMO</text>
      </g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.65" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0" stop-color="${light}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${light}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${scene(title.scene, w, h, title.palette, random)}
  ${motifBand(h * (w > h ? 0.12 : 0.11), w, light, 0.18)}
  <rect width="${w}" height="${h}" fill="url(#shade)"/>
  ${textBlock}
</svg>`;
}

for (const title of DEMO_TITLES) {
  const dir = path.join(root, "public/demo/titles", title.slug);
  await mkdir(dir, { recursive: true });
  await sharp(Buffer.from(svg(title, 600, 900, true))).webp({ quality: 82 }).toFile(path.join(dir, "poster.webp"));
  await sharp(Buffer.from(svg(title, 1600, 900, false))).webp({ quality: 80 }).toFile(path.join(dir, "backdrop.webp"));
}
console.info(`${DEMO_TITLES.length} visuels de démonstration générés.`);
