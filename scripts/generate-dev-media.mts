/**
 * Génère des médias de test HLS adaptatifs (360p + 720p) dans dev-media/.
 * Contenu entièrement synthétique, créé localement : aucun droit tiers en jeu.
 * Ces fichiers ne sont servis qu'à travers /api/dev-stream, après contrôle d'un jeton signé.
 *
 * Fonctionne sous Windows, macOS et Linux (nécessite ffmpeg dans le PATH).
 * Variables : DEV_MEDIA_DIR (défaut : dev-media), DEV_MEDIA_DURATION_SCALE (défaut : 1 ; 0.2 en CI).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = process.env.DEV_MEDIA_DIR ?? "dev-media";
const out = path.resolve(root, outDir);
const scale = Number(process.env.DEV_MEDIA_DURATION_SCALE ?? "1") || 1;

const probe = spawnSync("ffmpeg", ["-hide_banner", "-version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  console.error(
    "ffmpeg est requis pour générer les médias de test et doit être accessible dans le PATH.",
  );
  console.error("  Windows : winget install Gyan.FFmpeg (puis rouvrir le terminal)");
  console.error("  macOS   : brew install ffmpeg");
  console.error("  Linux   : sudo apt-get install ffmpeg");
  process.exit(1);
}

/** Police système copiée à côté des médias : chemin relatif sans lettre de lecteur (aucun échappement Windows). */
function resolveFontOption() {
  const candidates = [
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
  ];
  const found = candidates.find((file) => existsSync(file));
  if (!found) return "font=Sans";
  const target = path.join(out, `.font${path.extname(found)}`);
  copyFileSync(found, target);
  return `fontfile=${path.relative(root, target).split(path.sep).join("/")}`;
}

let lastError = "";

function ffmpeg(args: string[]) {
  return spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function makeAsset(
  input: {
    id: string;
    label: string;
    baseDuration: number;
    c0: string;
    c1: string;
    frequency: number;
  },
  fontOption: string | null,
) {
  const duration = Math.max(12, Math.floor(input.baseDuration * scale));
  const dir = path.join(out, input.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, "360p"), { recursive: true });
  mkdirSync(path.join(dir, "720p"), { recursive: true });
  const relativeDir = path.relative(root, dir).split(path.sep).join("/");

  // Texte incrusté si une police est disponible ; sinon dégradé seul (toutes les versions de ffmpeg).
  const text = fontOption
    ? [
        `drawtext=${fontOption}:text='TAMURT VIDÉO':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-70`,
        `drawtext=${fontOption}:text='${input.label}':fontcolor=white@0.9:fontsize=34:x=(w-text_w)/2:y=(h/2)+10`,
        `drawtext=${fontOption}:text='Média de test synthétique – %{pts\\:hms}':fontcolor=white@0.65:fontsize=26:x=(w-text_w)/2:y=h-90`,
      ].join(",") + ","
    : "";

  const result = ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `gradients=s=1280x720:c0=${input.c0}:c1=${input.c1}:x0=0:y0=0:x1=1280:y1=720:speed=0.006:duration=${duration}:rate=25`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${input.frequency}:sample_rate=48000:duration=${duration}`,
    "-filter_complex",
    `[0:v]${text}split=2[s0][s1];[s0]scale=-2:360[v360];[s1]null[v720]`,
    "-map",
    "[v360]",
    "-map",
    "1:a",
    "-map",
    "[v720]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "main",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "50",
    "-keyint_min",
    "50",
    "-sc_threshold",
    "0",
    "-b:v:0",
    "350k",
    "-maxrate:v:0",
    "420k",
    "-bufsize:v:0",
    "700k",
    "-b:v:1",
    "1100k",
    "-maxrate:v:1",
    "1300k",
    "-bufsize:v:1",
    "2200k",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-ac",
    "2",
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    `${relativeDir}/%v/seg_%03d.ts`,
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    "v:0,a:0,name:360p v:1,a:1,name:720p",
    `${relativeDir}/%v/index.m3u8`,
  ]);
  if (result.status !== 0) {
    lastError = result.stderr?.trim() || result.error?.message || "erreur inconnue";
    return null;
  }
  writeFileSync(
    path.join(dir, "info.json"),
    JSON.stringify({ id: input.id, duration, qualities: ["360p", "720p"] }),
  );
  return duration;
}

const assets = [
  {
    id: "demo-feature",
    label: "Film de démonstration",
    baseDuration: 120,
    c0: "0x1a0306",
    c1: "0x8a1224",
    frequency: 196,
  },
  {
    id: "demo-episode",
    label: "Épisode de démonstration",
    baseDuration: 90,
    c0: "0x050d1f",
    c1: "0x1e40af",
    frequency: 247,
  },
  {
    id: "demo-documentary",
    label: "Documentaire de démonstration",
    baseDuration: 90,
    c0: "0x1f1205",
    c1: "0xb45309",
    frequency: 220,
  },
  {
    id: "demo-trailer",
    label: "Bande-annonce de démonstration",
    baseDuration: 30,
    c0: "0x14051f",
    c1: "0xc9a227",
    frequency: 294,
  },
];

mkdirSync(out, { recursive: true });
let fontOption: string | null = resolveFontOption();
for (const asset of assets) {
  let duration = makeAsset(asset, fontOption);
  if (duration === null && fontOption) {
    console.warn(
      `Texte incrusté impossible avec cette version de ffmpeg : ${asset.id} est généré sans texte.`,
    );
    fontOption = null;
    duration = makeAsset(asset, null);
  }
  if (duration === null) {
    console.error(`Échec de la génération de ${asset.id} : ${lastError}`);
    process.exit(1);
  }
  console.log(`→ ${asset.id} (${duration} s)`);
}
console.log(`Médias de test générés dans ${outDir}/`);
