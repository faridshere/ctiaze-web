import type { Story } from "./types";
import type { Locale } from "./locale";

// Web parity with the Telegram post: the same deterministic urgency header, EPSS
// read-out, "~N exposed in Azerbaijan" line, and a "what to do" list — all pure
// functions of pipeline-stamped fields (mirrors cti/publish.py). No LLM, no
// invented facts, so the honesty rule holds exactly as it does channel-side.
const EPSS_RED = 0.7;   // matches publish.py _EPSS_RED
const EPSS_HIGH = 0.5;  // matches models.EPSS_HIGH

export type Urgency = { text: string; tone: "critical" | "warning" };

function approxExposure(n: number): number {
  if (n >= 1000) return Math.round(n / 100) * 100;
  if (n >= 100) return Math.round(n / 10) * 10;
  return n;
}
function exposureCount(s: Story): string {
  return approxExposure(s.azExposure!.count).toLocaleString("en-US");
}

// Precedence mirrors publish.urgency_header: spike > KEV > hot EPSS > severity.
// Returns null for a routine story (the page chrome already conveys the category).
export function urgencyHeader(s: Story, locale: Locale): Urgency | null {
  const en = locale === "en";
  if (s.kind === "exposure_spike")
    return { text: en ? "Exposure spike — sharp rise" : "Exposure spike — kəskin artım", tone: "critical" };
  if (s.kev)
    return { text: en ? "Active exploitation (KEV)" : "Aktiv istismar (KEV)", tone: "critical" };
  if (s.epss !== null && s.epss >= EPSS_RED)
    return {
      text: en ? `Very high exploit likelihood (EPSS ${Math.round(s.epss * 100)}%)`
               : `İstismar ehtimalı çox yüksək (EPSS ${Math.round(s.epss * 100)}%)`,
      tone: "critical",
    };
  if (s.sevRank >= 3) {
    const label = s.sevRank >= 4
      ? (en ? "Critical vulnerability" : "Kritik vulnerability")
      : (en ? "High-risk vulnerability" : "Yüksək riskli vulnerability");
    return { text: s.cvss ? `${label} — CVSS ${s.cvss}` : label, tone: "warning" };
  }
  return null;
}

// A compact EPSS chip for the feed/story, only when the score is actually alarming.
export function epssBadge(s: Story): string | null {
  return s.epss !== null && s.epss >= EPSS_HIGH ? `EPSS ${Math.round(s.epss * 100)}%` : null;
}

export function exposureLine(s: Story, locale: Locale): string | null {
  if (!s.azExposure) return null;
  const tail = s.azExposure.asOf ? ` (${s.azExposure.asOf})` : "";
  return locale === "en"
    ? `Shodan: ~${exposureCount(s)} ${s.azExposure.product} exposed in Azerbaijan${tail}`
    : `Shodan: Azərbaycanda ~${exposureCount(s)} ${s.azExposure.product} görünür${tail}`;
}

// Deterministic "Nə etməli / What to do" — the action the Telegram reader gets
// scannable in prose, made an explicit checklist. Every line is a pure function of
// a stored flag; nothing is inferred.
export function storyActions(s: Story, locale: Locale): string[] {
  const en = locale === "en";
  const out: string[] = [];
  if (s.kev)
    out.push(en ? "On CISA KEV — actively exploited. Patch immediately."
                : "CISA KEV siyahısındadır — aktiv istismar olunur. Dərhal patch et.");
  else if (s.epss !== null && s.epss >= EPSS_HIGH)
    out.push(en ? "High exploit likelihood — prioritize patching this."
                : "İstismar ehtimalı yüksək — patch-i prioritetləşdir.");
  else if (s.sevRank >= 4)
    out.push(en ? "Critical severity — schedule an urgent patch."
                : "Kritik ciddilik — təcili patch planlaşdır.");
  if (s.azExposure)
    out.push(en ? `~${exposureCount(s)} ${s.azExposure.product} are exposed in Azerbaijan — check your own version.`
                : `Azərbaycanda ~${exposureCount(s)} ${s.azExposure.product} açıqdır — öz versiyanı yoxla.`);
  return out;
}
