import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Tamurt Vidéo — le cinéma, les séries et les voix du monde amazigh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Logo de la DA Tamurt Services (version pour fond sombre), lu une fois au chargement du module.
const logoData = await readFile(join(process.cwd(), "public/brand/logo-sombre.svg"), "base64");
const logoSrc = `data:image/svg+xml;base64,${logoData}`;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "64px 80px",
        background: "radial-gradient(circle at 75% 20%, #4a0a14 0%, #0f0f10 55%)",
        color: "#f5f5f5",
      }}
    >
      <img src={logoSrc} width={460} height={339} alt="" />
      <span style={{ fontSize: 32, marginTop: "28px", color: "#b0b0b8", maxWidth: "980px" }}>
        Le cinéma, les séries et les voix d&apos;Algérie, de Kabylie et du monde amazigh.
      </span>
    </div>,
    size,
  );
}
