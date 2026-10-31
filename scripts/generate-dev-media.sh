#!/usr/bin/env bash
# Génère des médias de test HLS adaptatifs (360p + 720p) dans dev-media/.
# Contenu entièrement synthétique, créé localement : aucun droit tiers en jeu.
# Ces fichiers ne sont servis qu'à travers /api/dev-stream, après contrôle d'un jeton signé.
#
# Variables : DEV_MEDIA_DIR (défaut : dev-media), DEV_MEDIA_DURATION_SCALE (défaut : 1 ; 0.25 en CI).
set -euo pipefail

OUT="${DEV_MEDIA_DIR:-dev-media}"
SCALE="${DEV_MEDIA_DURATION_SCALE:-1}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg est requis pour générer les médias de test (https://ffmpeg.org)." >&2
  exit 1
fi

FONT_OPT="font=Inter"
if ! fc-list 2>/dev/null | grep -qi "inter"; then
  FONT_OPT="font=Sans"
fi

make_asset() {
  local id="$1" label="$2" base_duration="$3" c0="$4" c1="$5" freq="$6"
  local duration
  duration=$(awk -v d="$base_duration" -v s="$SCALE" 'BEGIN { v = int(d * s); if (v < 12) v = 12; print v }')
  local dir="$OUT/$id"
  rm -rf "$dir"
  mkdir -p "$dir/360p" "$dir/720p"
  echo "→ $id (${duration}s)"

  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "gradients=s=1280x720:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=1280:y1=720:speed=0.006:duration=${duration}:rate=25" \
    -f lavfi -i "sine=frequency=${freq}:sample_rate=48000:duration=${duration}" \
    -filter_complex "[0:v]drawtext=${FONT_OPT}:text='TAMURT VIDÉO':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-70,\
drawtext=${FONT_OPT}:text='${label}':fontcolor=white@0.9:fontsize=34:x=(w-text_w)/2:y=(h/2)+10,\
drawtext=${FONT_OPT}:text='Média de test synthétique – %{pts\\:hms}':fontcolor=white@0.65:fontsize=26:x=(w-text_w)/2:y=h-90,\
split=2[s0][s1];[s0]scale=-2:360[v360];[s1]null[v720]" \
    -map "[v360]" -map 1:a -map "[v720]" -map 1:a \
    -c:v libx264 -preset veryfast -profile:v main -pix_fmt yuv420p \
    -g 50 -keyint_min 50 -sc_threshold 0 \
    -b:v:0 350k -maxrate:v:0 420k -bufsize:v:0 700k \
    -b:v:1 1100k -maxrate:v:1 1300k -bufsize:v:1 2200k \
    -c:a aac -b:a 96k -ac 2 \
    -f hls -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments \
    -hls_segment_filename "${dir}/%v/seg_%03d.ts" \
    -master_pl_name master.m3u8 \
    -var_stream_map "v:0,a:0,name:360p v:1,a:1,name:720p" \
    "${dir}/%v/index.m3u8"

  echo "{\"id\":\"${id}\",\"duration\":${duration},\"qualities\":[\"360p\",\"720p\"]}" > "${dir}/info.json"
}

mkdir -p "$OUT"
make_asset "demo-feature" "Film de démonstration" 120 "0x1a0306" "0x8a1224" 196
make_asset "demo-episode" "Épisode de démonstration" 90 "0x050d1f" "0x1e40af" 247
make_asset "demo-documentary" "Documentaire de démonstration" 90 "0x1f1205" "0xb45309" 220
make_asset "demo-trailer" "Bande-annonce de démonstration" 30 "0x14051f" "0xc9a227" 294

echo "Médias de test générés dans ${OUT}/"
