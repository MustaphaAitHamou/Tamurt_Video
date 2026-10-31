import { ImageResponse } from "next/og";

import { MARK_DIAMOND, MARK_INNER, MARK_PLAY } from "@/components/brand/logo-paths";

export const alt = "Tamurt Vidéo — le cinéma, les séries et les voix du monde amazigh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 75% 20%, #5a0d18 0%, #0b0b0e 55%)",
          color: "#f5f5f7",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff4d5e" />
              <stop offset="1" stopColor="#b01428" />
            </linearGradient>
          </defs>
          <path d={MARK_DIAMOND} fill="url(#g)" />
          <path d={MARK_INNER} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1.6} />
          <path d={MARK_PLAY} fill="#ffffff" />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: "24px", marginTop: "40px" }}>
          <span style={{ fontSize: 110, fontWeight: 800, letterSpacing: "12px" }}>TAMURT</span>
          <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: "8px", color: "#e3263a" }}>VIDÉO</span>
        </div>
        <span style={{ fontSize: 36, marginTop: "24px", color: "#c4c4cc" }}>
          Le cinéma, les séries et les voix d&apos;Algérie, de Kabylie et du monde amazigh.
        </span>
      </div>
    ),
    size,
  );
}
