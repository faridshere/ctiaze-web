import { ImageResponse } from "next/og";

// Shared OpenGraph/Twitter card generator (1200×630) on the skopnix "Ops-Black"
// brand surface. Uses next/og (built into Next 16 — no dependency, no paid
// service). Fonts are subset to the exact card text via Google's CSS `text=`
// param, which guarantees the Azerbaijani ə (U+0259) glyph is present and keeps
// the download tiny; if the fetch fails the card still renders (system font).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// "Ink & signal" palette — kept in lockstep with app/globals.css --d-* tokens so
// the share cards match the page a click lands on (satori can't resolve var(),
// so these are the literal token values).
const BG = "#0a0b0d";
const INK = "#f2efe9";
const DIM = "#a7a9b0";
const BRAND = "#ff5a1f";
const CRIT = "#ff4d5e";
const LINE = "rgba(255,255,255,0.09)";

async function loadFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}&text=${encodeURIComponent(text)}`;
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
};

export async function ogCard(title: string, tagline: string, meta: Meta = {}) {
  const allText = `${title}${tagline}skopnix — global cyber-threat intelligence KEV CVE ${meta.cve ?? ""} ${meta.category ?? ""}`;
  const [bold, semi] = await Promise.all([loadFont(allText, 700), loadFont(allText, 600)]);
  const fonts = [
    bold && { name: "Archivo", data: bold, weight: 700 as const, style: "normal" as const },
    semi && { name: "Archivo", data: semi, weight: 600 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 700 | 600; style: "normal" }[];

  const tag = meta.kev ? "KEV · aktiv istismar" : meta.critical ? "kritik" : meta.category;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", background: BG, color: INK,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "64px 72px", fontFamily: "Archivo, sans-serif",
          backgroundImage: `radial-gradient(1100px 500px at 85% -10%, rgba(255,90,31,0.10), transparent)`,
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${BRAND}`, display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>skopnix</div>
          <div style={{ marginLeft: 8, fontSize: 20, color: DIM, letterSpacing: 4, textTransform: "uppercase" }}>
            {meta.cve ? "· Threat Intel" : "· CTI"}
          </div>
        </div>

        {/* title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {tag && (
            <div
              style={{
                fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase",
                color: meta.kev || meta.critical ? CRIT : BRAND,
              }}
            >
              {tag}
            </div>
          )}
          <div style={{ fontSize: title.length > 90 ? 52 : 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, maxWidth: 1000 }}>
            {title.length > 150 ? title.slice(0, 147) + "…" : title}
          </div>
        </div>

        {/* footer row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${LINE}`, paddingTop: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 24, color: DIM }}>
            {meta.cve && <div style={{ color: CRIT, fontWeight: 600 }}>{meta.cve}</div>}
            {meta.verified && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, color: BRAND }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>əsaslandırılıb</span>
              </div>
            )}
            {!meta.cve && !meta.verified && <div>{tagline}</div>}
          </div>
          <div style={{ fontSize: 22, color: DIM }}>ctiaze.tech</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
