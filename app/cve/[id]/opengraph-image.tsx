import { ImageResponse } from "next/og";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getCveIntel, type CvePriority } from "@/lib/cveintel-page";
import { cveBadges, type CveBadge } from "@/lib/cveintel";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "ctiaze — CVE izahı";

// Branded share card for /cve/[id] (the CVE explainer pages). A shared link used
// to fall back to the generic site card; this surfaces the CVE's KEV / EPSS / CWE
// triage at a glance for better click-through. Structure mirrors the actor/story
// cards (lib/og.tsx): wordmark / headline / footer, Archivo subset to the exact
// card text, honest fallback when the CVE has no explainer doc. Colours are the
// live "ink & signal" DARK register from app/globals.css (--d-*) — the same
// register .ops pages like /cve force — written as literal hex because
// satori/ImageResponse can't resolve the design-token var()s.

// --- live "ink & signal" DARK register, copied from app/globals.css (--d-*) ---
const BG = "#0a0b0d"; // --d-surface (cool near-black ink)
const INK = "#f2efe9"; // --d-ink-primary
const INK2 = "#a7a9b0"; // --d-ink-secondary
const DIM = "#82868f"; // --d-ink-muted
const SIGNAL = "#ff5a1f"; // --d-brand (signal orange — interaction accent)
const CRIT = "#ff4d5e"; // --d-accent-critical (KEV)
const WARN = "#e0b94a"; // --d-accent-warning
const GOOD = "#6cc98a"; // --d-accent-good (grounded)
const HAIR = "#23262e"; // --d-hairline
const CHIP_R = 2; // --radius-chip (the only radius in the system)

// Archivo, subset to the exact card text via Google's CSS `text=` param so the
// Azerbaijani ə (U+0259) glyph is guaranteed and the download stays tiny. If the
// fetch fails the card still renders (system font). Same approach as lib/og.tsx.
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

// EPSS → display %, identical to the /cve page's helper.
function pct(epss: number | null): string | null {
  if (epss == null) return null;
  const p = epss * 100;
  return `${p.toFixed(p < 1 ? 2 : 0)}%`;
}

// One line of the AZ explainer: collapse whitespace, cut on a word boundary,
// never mid-word, add an ellipsis only when actually truncated.
function oneLine(s: string, max = 104): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.]+$/, "") + "…";
}

// AZ label for the engine's non-KEV triage tag (mirrors the /cve page wording).
const PRIORITY_AZ: Record<Exclude<CvePriority, "kev">, string> = {
  exploited: "istismar bildirilib",
  high: "yüksək prioritet",
  standard: "standart prioritet",
};

type Chip = { text: string; fg: string; bg?: string; border?: string };

async function renderCard(opts: {
  eyebrow: string;
  headline: string;
  suffix: string; // wordmark suffix, e.g. "· Threat Intel"
  chips: Chip[];
  lead: string | null;
  grounded: boolean;
}) {
  const { eyebrow, headline, suffix, chips, lead, grounded } = opts;
  const allText = `ctiaze ${suffix} ${eyebrow} ${headline} ${chips.map((c) => c.text).join(" ")} ${lead ?? ""} əsaslandırılıb ctiaze.tech`;
  const [bold, semi] = await Promise.all([loadFont(allText, 700), loadFont(allText, 600)]);
  const fonts = [
    bold && { name: "Archivo", data: bold, weight: 700 as const, style: "normal" as const },
    semi && { name: "Archivo", data: semi, weight: 600 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 700 | 600; style: "normal" }[];

  const headlineSize = headline.length > 17 ? 66 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", background: BG, color: INK,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "64px 72px", fontFamily: "Archivo, sans-serif",
          backgroundImage: "radial-gradient(1100px 520px at 85% -12%, rgba(255,90,31,0.12), transparent)",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${SIGNAL}`, display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>ctiaze</div>
          <div style={{ marginLeft: 8, fontSize: 20, color: DIM, letterSpacing: 4, textTransform: "uppercase" }}>{suffix}</div>
        </div>

        {/* headline block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {eyebrow ? (
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: SIGNAL }}>
              {eyebrow}
            </div>
          ) : null}
          <div style={{ fontSize: headlineSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2, maxWidth: 1056 }}>
            {headline}
          </div>
          {chips.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, fontSize: 24 }}>
              {chips.map((c) => (
                <div
                  key={c.text}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "6px 13px", borderRadius: CHIP_R, fontWeight: 600, letterSpacing: 0.5,
                    color: c.fg,
                    background: c.bg ?? "transparent",
                    border: `1px solid ${c.border ?? "transparent"}`,
                  }}
                >
                  {c.text}
                </div>
              ))}
            </div>
          ) : null}
          {lead ? (
            <div style={{ fontSize: 26, lineHeight: 1.35, color: INK2, maxWidth: 1056 }}>{lead}</div>
          ) : null}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${HAIR}`, paddingTop: 26 }}>
          {grounded ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: GOOD }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOOD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>əsaslandırılıb</span>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ fontSize: 22, color: DIM }}>ctiaze.tech</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getCveIntel(id).catch(() => null);

  // Unknown / malformed id, or the DB was unreachable → generic ctiaze card,
  // never a crash and never a fabricated triage (mirrors the sibling handlers).
  if (!doc) {
    return renderCard({
      eyebrow: "",
      headline: "ctiaze",
      suffix: "· CTI",
      chips: [],
      lead: "Azərbaycan kiber-təhlükə kəşfiyyatı",
      grounded: false,
    });
  }

  // Live authority badges (CISA KEV set + FIRST EPSS) — same helper as /cve.
  const badge: CveBadge | undefined = (
    await cveBadges([doc.id]).catch(() => new Map<string, CveBadge>())
  ).get(doc.id);
  const isKev = Boolean(badge?.kev) || doc.priority === "kev";
  const ep = pct(badge?.epss ?? null);
  const prio = doc.priority && doc.priority !== "kev" ? doc.priority : null;

  const chips: Chip[] = [];
  if (isKev) chips.push({ text: "KEV", fg: BG, bg: CRIT });
  if (ep) chips.push({ text: `EPSS ${ep}`, fg: INK2, border: INK2 });
  if (prio === "exploited") chips.push({ text: PRIORITY_AZ.exploited, fg: WARN, border: WARN });
  else if (prio === "high") chips.push({ text: PRIORITY_AZ.high, fg: DIM, border: HAIR });
  if (doc.cwe) {
    const name =
      doc.cwe.name && doc.cwe.name.length > 40 ? doc.cwe.name.slice(0, 39).trimEnd() + "…" : doc.cwe.name;
    chips.push({ text: name ? `${doc.cwe.id} · ${name}` : doc.cwe.id, fg: INK2, border: HAIR });
  }

  const lead = doc.az || doc.en;

  return renderCard({
    eyebrow: "CVE",
    headline: doc.id,
    suffix: "· Threat Intel",
    chips,
    lead: lead ? oneLine(lead) : null,
    grounded: true,
  });
}
