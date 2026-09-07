import type { Story } from "./types";
import type { Locale } from "./locale";

// Web parity with the Telegram post: the same deterministic urgency header, EPSS
// read-out, "~N exposed worldwide" line, and a "what to do" list — all pure
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
function globalCount(s: Story): string {
  return approxExposure(s.azExposure!.globalCount!).toLocaleString("en-US");
}

const EN_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The engine stamps `as_of` in Azerbaijani ("03 sen"), which must never reach an
// English reader. Prefer the locale-neutral ISO date and format it here; fall
// back to the raw stamp only for the Azerbaijani surface.
function asOfLabel(s: Story, en: boolean, iso = s.azExposure!.asOfIso): string {
  if (en) {
    if (!iso) return ""; // no ISO date on an older doc — omit rather than print "sen"
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return "";
    // Formatted by hand rather than via toLocaleDateString: en-GB renders
    // September as "Sept" and en-US puts the month first, so the label would
    // drift with the runtime's ICU data. This is stable everywhere.
    return `${String(d.getUTCDate()).padStart(2, "0")} ${EN_MON[d.getUTCMonth()]}`;
  }
  return s.azExposure!.asOf;
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
      text: en ? `Very high exploit likelihood (EPSS ${epssPct(s.epss)})`
               : `İstismar ehtimalı çox yüksək (EPSS ${epssPct(s.epss)})`,
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

// A compact EPSS chip, only when the score is actually alarming.
//
// EPSS and KEV answer different questions and routinely disagree: EPSS PREDICTS
// the probability of exploitation in the next 30 days, KEV RECORDS exploitation
// that has already been observed. Showing "EPSS 2%" beside a KEV badge reads to a
// non-specialist as "2% risk" on a vulnerability that is being exploited right
// now — the opposite of the truth. When KEV is set it is the stronger, observed
// signal, so the prediction is suppressed rather than shown alongside it.
// 0.996 rendered as "100%" claims a certainty FIRST never published; show a
// decimal once rounding would hide the difference from 1.
export function epssPct(e: number): string {
  const pct = e * 100;
  return pct >= 99.5 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

export function epssBadge(s: Story): string | null {
  if (s.kev) return null;
  return s.epss !== null && s.epss >= EPSS_HIGH ? `EPSS ${epssPct(s.epss)}` : null;
}

// Plain-language gloss for the signals, so a reader who does not work in vuln
// management can still act. Rendered as a footnote under the signal block.
export function signalExplainer(s: Story): string | null {
  if (s.kev)
    return "CISA KEV means this flaw has been seen exploited in real attacks — not predicted, observed. Treat it as urgent regardless of its score.";
  if (s.epss !== null && s.epss >= EPSS_HIGH)
    return `EPSS estimates the chance this flaw is exploited somewhere in the next 30 days (${epssPct(s.epss)}). It is a forecast, not a report of an attack.`;
  return null;
}

export function exposureLine(s: Story, locale: Locale): string | null {
  if (!s.azExposure) return null;
  const en = locale === "en";
  const label = asOfLabel(s, en);
  const tail = label ? ` (${label})` : "";
  if (en) {
    // Worldwide leads, because that is the story for a global readership. When no
    // worldwide figure was measured we still publish the Azerbaijan number, but
    // labelled as the regional sample it is — some telemetry beats none, and the
    // one thing we must never do is pass an AZ-only count off as worldwide.
    if (s.azExposure.globalCount === null) {
      if (s.azExposure.count <= 0) return null;
      return `Shodan: ~${exposureCount(s)} ${s.azExposure.product} exposed in Azerbaijan — regional sample only${tail}`;
    }
    const gTail = asOfLabel(s, true, s.azExposure.globalAsOfIso);
    return `Shodan: ~${globalCount(s)} ${s.azExposure.product} exposed worldwide${gTail ? ` (${gTail})` : ""}`;
  }
  if (s.azExposure.count <= 0) return null;
  return `Shodan: Azərbaycanda ~${exposureCount(s)} ${s.azExposure.product} görünür${tail}`;
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
  if (s.azExposure) {
    if (en) {
      if (s.azExposure.globalCount !== null)
        out.push(`~${globalCount(s)} ${s.azExposure.product} are exposed worldwide — check your own version.`);
      else if (s.azExposure.count > 0)
        out.push(`~${exposureCount(s)} ${s.azExposure.product} are exposed in Azerbaijan (regional sample) — check your own version.`);
    } else if (s.azExposure.count > 0) {
      out.push(`Azərbaycanda ~${exposureCount(s)} ${s.azExposure.product} açıqdır — öz versiyanı yoxla.`);
    }
  }
  return out;
}
