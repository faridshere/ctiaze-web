import type { CpeMatch, VersionVerdict } from "./types";

// Version comparison and NVD range evaluation, lifted from the shelved
// stacknix matcher (lib/_disabled/stacknix.ts), where it was acid-tested:
// log4j 2.14.1 → CVE-2021-44228 in range, 2.17.1 not. NVD's own
// virtualMatchString does NOT filter by version, so ranges are always
// evaluated here, locally.

/**
 * Compare two version strings segment by segment (digits numerically, letters
 * lexically). Returns null when the two cannot be ordered honestly, e.g. a
 * digit segment against a letter segment ("8.2p1" vs "8.2.1").
 */
export function cmpVersion(a: string, b: string): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/^v/, "").match(/\d+|[a-z]+/g) ?? [];
  const A = norm(a);
  const B = norm(b);
  if (!A.length || !B.length) return null;
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i];
    const y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const dx = parseInt(x, 10);
      const dy = parseInt(y, 10);
      if (dx !== dy) return dx < dy ? -1 : 1;
    } else if (xn !== yn) return null;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export type RangeResult = { verdict: VersionVerdict; detail: string | null; fixedIn: string | null };

const hasBounds = (m: CpeMatch) =>
  !!(m.versionStartIncluding || m.versionStartExcluding || m.versionEndIncluding || m.versionEndExcluding);

/** The CPE's own version field (index 5 of cpe:2.3:part:vendor:product:version:…). */
function cpeVersion(criteria: string): string | null {
  const v = criteria.split(":")[5];
  return v && v !== "*" && v !== "-" ? v.replace(/\\/g, "") : null;
}

/**
 * Evaluate a version against the cpeMatch rows of ONE CVE for ONE product.
 * The fix we name is the nearest versionEndExcluding above the caller's
 * version, never a "fix" at or below it (a downgrade remediates nothing).
 */
export function evalRanges(version: string | null, matches: CpeMatch[]): RangeResult {
  const vulnerable = matches.filter((m) => m.vulnerable !== false);
  if (!vulnerable.length) return { verdict: "not-checked", detail: null, fixedIn: null };
  if (!version) return { verdict: "no-version", detail: null, fixedIn: null };

  let fixAbove: string | null = null;
  for (const m of vulnerable) {
    const end = m.versionEndExcluding;
    if (end && (cmpVersion(end, version) ?? -1) > 0 && (!fixAbove || (cmpVersion(end, fixAbove) ?? 1) < 0)) fixAbove = end;
  }

  let ambiguous = false;
  let sawRule = false;
  for (const m of vulnerable) {
    if (hasBounds(m)) {
      sawRule = true;
      const checks: [string | undefined, (c: number) => boolean][] = [
        [m.versionStartIncluding, (c) => c >= 0],
        [m.versionStartExcluding, (c) => c > 0],
        [m.versionEndIncluding, (c) => c <= 0],
        [m.versionEndExcluding, (c) => c < 0],
      ];
      let inside = true;
      let unknown = false;
      for (const [bound, ok] of checks) {
        if (!bound) continue;
        const c = cmpVersion(version, bound);
        if (c === null) {
          unknown = true;
          break;
        }
        if (!ok(c)) {
          inside = false;
          break;
        }
      }
      if (unknown) {
        ambiguous = true;
        continue;
      }
      if (inside) {
        const lo = m.versionStartIncluding ? `[${m.versionStartIncluding}` : m.versionStartExcluding ? `(${m.versionStartExcluding}` : "(−∞";
        const hi = m.versionEndExcluding ? `${m.versionEndExcluding})` : m.versionEndIncluding ? `${m.versionEndIncluding}]` : "∞)";
        // An inclusive end names the last bad release, not the fix; the
        // nearest fix of some other range may be another branch entirely.
        const fixedIn = m.versionEndExcluding ?? (m.versionEndIncluding ? null : fixAbove);
        return { verdict: "in-range", detail: `${version} ∈ ${lo}, ${hi}`, fixedIn };
      }
    } else {
      const exact = cpeVersion(m.criteria);
      if (!exact) {
        // A wildcard version with no bounds: NVD sometimes means "every
        // release", sometimes "not analysed yet". Neither is a confirmation.
        ambiguous = true;
        continue;
      }
      sawRule = true;
      const c = cmpVersion(version, exact);
      if (c === 0) return { verdict: "in-range", detail: `${version} = ${exact} (listed version)`, fixedIn: fixAbove };
      if (c === null) ambiguous = true;
    }
  }
  if (ambiguous) return { verdict: "ambiguous", detail: "NVD bounds missing or not comparable with this version", fixedIn: fixAbove };
  return { verdict: sawRule ? "not-affected" : "not-checked", detail: null, fixedIn: null };
}
