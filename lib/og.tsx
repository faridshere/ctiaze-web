import { ImageResponse } from "next/og";

// Shared OpenGraph/Twitter card generator (1200×630), set like a clipping of
// the paper (v4 "Late Edition", 2026-10-16): the day edition's newsprint, the
// nameplate rules, the headline in Hepta Slab, a condensed Archivo label line,
// the KEV stamp when the story is actively exploited, and the colophon rule.
// Uses next/og (built into Next 16, no dependency, no paid service). Fonts are
// subset to the exact card text via Google's CSS `text=` param, so the file
// stays tiny and any glyph the text needs is present; if the fetch fails the
// card still renders in a system face.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The day edition's tokens, literal (satori cannot resolve var()); keep in
// lockstep with app/globals.css.
const PAPER = "#f4f0e6";
const DEEP = "#eae4d6";
const INK = "#15130f";
const INK2 = "#4a463e";
const INK3 = "#726d62";
const RULE_SOFT = "#d3ccbb";
const BRAND = "#ff5a1f";
const STAMP = "#c8102e";

async function loadFont(family: string, text: string, weight: number, extra = ""): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${extra}wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
    const src = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (!src) return null;
    return await (await fetch(src)).arrayBuffer();
  } catch {
    return null;
  }
}

type Meta = {
  category?: string;
  cve?: string;
  kev?: boolean;
  critical?: boolean;
  verified?: boolean;
  /** a label for the top line, e.g. "Adversary dossier" */
  section?: string;
};

export async function ogCard(title: string, tagline: string, meta: Meta = {}) {
  const shown = title.length > 140 ? title.slice(0, 137) + "…" : title;
  const label = [meta.kev ? "Actively exploited" : meta.critical ? "Critical" : null, meta.cve ?? null, meta.category ?? null]
    .filter(Boolean)
    .join("  ·  ");
  const section = meta.section ?? (meta.cve ? "Dispatch" : "Global cyber-threat intelligence");
  // Labels print uppercase, so the subset carries both cases plus the glyphs the chrome uses.
  const labelBase = `${label} ${section} ${tagline} skopnix.com Grounded to source. Nothing invented. Actively exploited KEV 0123456789 ·-,.()`;
  const labelText = `${labelBase}${labelBase.toUpperCase()}`;
  // The wordmark keeps its own face: "skopnix" is Schibsted Grotesk 700 on every surface.
  const [slab, cond, mark] = await Promise.all([
    loadFont("Hepta Slab", shown, 700),
    loadFont("Archivo", labelText, 600),
    loadFont("Schibsted Grotesk", "skopnix", 700),
  ]);
  const fonts = [
    slab && { name: "Hepta Slab", data: slab, weight: 700 as const, style: "normal" as const },
    cond && { name: "Archivo", data: cond, weight: 600 as const, style: "normal" as const },
    mark && { name: "Schibsted Grotesk", data: mark, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 700 | 600; style: "normal" }[];

  const size = shown.length > 110 ? 46 : shown.length > 70 ? 56 : shown.length > 40 ? 66 : 78;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          color: INK,
          display: "flex",
          flexDirection: "column",
          padding: "44px 64px 40px",
          fontFamily: "Archivo, sans-serif",
        }}
      >
        {/* nameplate: 2px rule, the mark and wordmark, the section label, 1px rule */}
        <div style={{ display: "flex", borderTop: `3px solid ${INK}`, width: "100%" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="36" height="36" viewBox="0 0 32 32">
              <path d="M16 15.5 L16 7" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
              <path d="M16 15.5 L8 22" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
              <path d="M16 15.5 L24 22" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
              <circle cx={16} cy={15.5} r={3.4} fill={INK} />
              <circle cx={8} cy={22} r={3.6} fill={INK} />
              <circle cx={24} cy={22} r={3.6} fill={INK} />
              <circle cx={16} cy={7} r={3.8} fill={BRAND} />
            </svg>
            <div style={{ display: "flex", fontFamily: "Schibsted Grotesk, Archivo, sans-serif", fontSize: 34, fontWeight: 700, letterSpacing: -0.7 }}>
              <span>skop</span>
              <span style={{ color: BRAND }}>nix</span>
            </div>
          </div>
          <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: INK3 }}>{section}</div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${INK}`, width: "100%" }} />

        {/* the clipping */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, paddingTop: 28, paddingBottom: 20 }}>
          {label && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
              {meta.kev && (
                <div
                  style={{
                    fontSize: 18,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: STAMP,
                    border: `2px solid ${STAMP}`,
                    padding: "6px 10px 4px",
                  }}
                >
                  Actively exploited
                </div>
              )}
              <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: meta.kev || meta.critical ? STAMP : INK2 }}>
                {[meta.cve ?? null, meta.category ?? null].filter(Boolean).join("  ·  ")}
              </div>
            </div>
          )}
          <div
            style={{
              fontFamily: "Hepta Slab, serif",
              fontSize: size,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -1,
              maxWidth: 1060,
              color: INK,
            }}
          >
            {shown}
          </div>
          {!label && (
            <div style={{ marginTop: 22, fontSize: 24, color: INK2, maxWidth: 900, lineHeight: 1.35 }}>{tagline}</div>
          )}
        </div>

        {/* colophon rule */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `${meta.kev ? "3px" : "1px"} solid ${meta.kev ? STAMP : INK}`,
            paddingTop: 18,
            fontSize: 19,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: INK3,
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <span>{meta.verified ? "Grounded to source" : "Nothing invented"}</span>
            {meta.cve && <span style={{ color: INK2 }}>{meta.cve}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: BRAND, display: "flex" }} />
            <span style={{ color: INK }}>skopnix.com</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 10, height: 6, background: DEEP, border: `1px solid ${RULE_SOFT}` }} />
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
