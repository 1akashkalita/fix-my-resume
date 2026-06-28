import { ImageResponse } from "next/og";

// Required so the image is baked at build time under `output: export`.
export const dynamic = "force-static";

export const alt = "Fix My Resume — an honest, in-browser resume score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static social-card image, generated at build time (the app is a static export).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#E7EAEE",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#3A2DD0",
              color: "#fff",
              fontSize: 40,
              fontStyle: "italic",
            }}
          >
            F
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 22,
              fontSize: 26,
              letterSpacing: "2px",
              color: "#5E6772",
              fontFamily: "monospace",
            }}
          >
            PRIVATE · IN-BROWSER · FREE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, color: "#15181D", lineHeight: 1.05 }}>
            Fix My&nbsp;<span style={{ fontStyle: "italic" }}>Resume</span>
          </div>
          <div style={{ fontSize: 34, color: "#5E6772", marginTop: 18, maxWidth: 900 }}>
            An explainable, fairness-constrained resume score — plus a coach and trend tracking,
            running entirely in your browser.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: "#15663F" }}>
            <div
              style={{ width: 14, height: 14, borderRadius: 999, background: "#2F7A57", marginRight: 12 }}
            />
            100% private — nothing is uploaded
          </div>
          <div style={{ fontSize: 26, color: "#2A1FA8", fontFamily: "monospace" }}>fixmyresume.dev</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
