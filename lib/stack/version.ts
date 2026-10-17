import type { CpeMatch, VersionVerdict } from "./types";
import { splitCpe } from "./ids";

// Version comparison and NVD range evaluation, lifted from the shelved
// stacknix matcher (lib/_disabled/stacknix.ts), where it was acid-tested:
// log4j 2.14.1 → CVE-2021-44228 in range, 2.17.1 not. NVD's own
// virtualMatchString does NOT filter by version, so ranges are always
// evaluated here, locally.

// Pre-release words, in release order; each sorts before the release itself
// ("2.15.0-rc1" < "2.15.0"). Bare "a"/"b" are not here: OpenSSL's 1.1.1a is a
// post-release letter, and so is OpenSSH's "p1".
const PRE: Record<string, number> = { dev: 0, snapshot: 0, alpha: 1, beta: 2, milestone: 3, pre: 4, preview: 4, rc: 5, cr: 5 };
// Words that name the release itself ("2.17.0.Final", "1.0-GA").
const RELEASE = new Set(["final", "ga", "release"]);

/** What the rest of a version says once the other side has run out: 0 = nothing more, 1 = later, -1 = earlier (pre-release). */
function tail(segs: string[], from: number): number {
  for (let i = from; i < segs.length; i++) {
    const s = segs[i];
    if (/^\d+$/.test(s)) {
      if (parseInt(s, 10) !== 0) return 1;
    } else if (s in PRE) return -1;
    else if (!RELEASE.has(s)) return 1;
  }
  return 0;
}

/**
 * Compare two version strings segment by segment (digits numerically, letters
 * lexically). Missing segments count as 0 ("2.17" = "2.17.0"), and a
 * pre-release sorts before its release ("2.15.0-rc1" < "2.15.0"). Returns null
 * when the two cannot be ordered honestly, e.g. a digit segment against a
 * letter segment ("8.2p1" vs "8.2.1").
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
    if (x === undefined) return 0 - tail(B, i) || 0;
    if (y === undefined) return tail(A, i);
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const dx = parseInt(x, 10);
      const dy = parseInt(y, 10);
      if (dx !== dy) return dx < dy ? -1 : 1;
    } else if (xn !== yn) {
      // "2.15.0-rc1" vs "2.15.0.1": the pre-release comes first. A
      // post-release letter against a digit ("8.2p1" vs "8.2.1") has no order.
      const letter = xn ? y : x;
      if (!(letter in PRE)) return null;
      return xn ? 1 : -1;
    } else if (x !== y) {
      const px = PRE[x];
      const py = PRE[y];
      if (px !== undefined || py !== undefined) {
        if (px === undefined) return 1;
        if (py === undefined) return -1;
        if (px !== py) return px < py ? -1 : 1;
      } else return x < y ? -1 : 1;
    }
  }
  return 0;
}

export type RangeResult = { verdict: VersionVerdict; detail: string | null; fixedIn: string | null };

const hasBounds = (m: CpeMatch) =>
  !!(m.versionStartIncluding || m.versionStartExcluding || m.versionEndIncluding || m.versionEndExcluding);

/**
 * The CPE's own version and update fields (indexes 5 and 6 of
 * cpe:2.3:part:vendor:product:version:update:…). NVD files OpenSSH 7.2p2 as
 * 7.2:p2 and log4j 2.0-beta9 as 2.0:beta9, so the two are only meaningful
 * together. update: null = any ("*"), "" = none ("-").
 */
function cpeExact(criteria: string): { version: string; update: string | null } | null {
  const f = splitCpe(criteria);
  const v = f[5];
  if (!v || v === "*" || v === "-") return null;
  const u = f[6];
  return { version: v, update: !u || u === "*" ? null : u === "-" ? "" : u };
}

/** Compare a caller's version with one listed CPE version+update. */
function cmpExact(version: string, exact: { version: string; update: string | null }): number | null {
  if (exact.update) return cmpVersion(version, `${exact.version}-${exact.update}`);
  const c = cmpVersion(version, exact.version);
  if (c === 0 || exact.update === "") return c;
  // Any update of a plain numeric version: "7.2p2" is one of 7.2's updates.
  const base = version.match(/^v?\d+(?:\.\d+)*/)?.[0];
  if (base && base !== version && /^\d+(?:\.\d+)*$/.test(exact.version) && cmpVersion(base, exact.version) === 0) return 0;
  return c;
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
      const exact = cpeExact(m.criteria);
      if (!exact) {
        // A wildcard version with no bounds: NVD sometimes means "every
        // release", sometimes "not analysed yet". Neither is a confirmation.
        ambiguous = true;
        continue;
      }
      sawRule = true;
      const c = cmpExact(version, exact);
      const listed = exact.update ? `${exact.version} ${exact.update}` : exact.version;
      if (c === 0) return { verdict: "in-range", detail: `${version} = ${listed} (listed version)`, fixedIn: fixAbove };
      if (c === null) ambiguous = true;
    }
  }
  if (ambiguous) return { verdict: "ambiguous", detail: "NVD bounds missing or not comparable with this version", fixedIn: fixAbove };
  return { verdict: sawRule ? "not-affected" : "not-checked", detail: null, fixedIn: null };
}
