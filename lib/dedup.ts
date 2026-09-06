// ---------------------------------------------------------------------------
// Cross-source clustering.
//
// The wire ingests ~66 outlets, and a single event gets written up by several of
// them within hours: on one page of the archive Sality appeared 3×, SonicWall
// SMA1000 3×, one indictment 3×. To a reader that reads as a broken feed; to an
// analyst it means a third of the page is the same day's news wearing different
// mastheads.
//
// Deliberately NOT semantic embeddings. This is a pure token-overlap over
// normalized titles inside a time window: cheap, deterministic, unit-testable,
// and explainable — which matters on a site whose whole claim is that nothing is
// invented. It groups; it never deletes. Every clustered item keeps its own page.
// ---------------------------------------------------------------------------

// Words that carry no distinguishing signal in security headlines. Without this,
// "attackers exploit" alone drags unrelated stories together.
const STOP = new Set([
  "the","a","an","of","in","on","for","to","and","or","with","by","from","as","at",
  "is","are","was","were","be","been","new","now","after","over","into","its","it",
  "that","this","has","have","had","says","said","report","reports","reported",
  "attack","attacks","attackers","hackers","flaw","flaws","bug","bugs","issue",
  "vulnerability","vulnerabilities","security","cyber","update","updates",
]);

export function titleTokens(title: string): Set<string> {
  return new Set(
    (title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

/**
 * Overlap coefficient — shared tokens over the SHORTER headline. Jaccard is the
 * obvious choice and it is wrong here: outlets write the same event at very
 * different lengths, and dividing by the union punishes the longer headline for
 * carrying detail. Overlap asks the useful question instead: "is the shorter
 * headline essentially contained in the longer one?"
 */
export function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

export type Clusterable = { id: string; title: string; publishedAt: string; cveIds?: string[] };
export type Cluster<T extends Clusterable> = { lead: T; others: T[] };

const WINDOW_MS = 72 * 3600_000; // outlets pile onto an event for about three days
const THRESHOLD = 0.6;
const MIN_SHARED = 2; // one shared word is a coincidence, not a story

// Two headlines naming the same CVE are the same event — exact, and far safer
// than any text metric. Title overlap is the fallback for the ~85% of stories
// that carry no CVE at all.
function sharesCve(a: Clusterable, b: Clusterable): boolean {
  const A = a.cveIds ?? [];
  const B = b.cveIds ?? [];
  return A.length > 0 && B.length > 0 && A.some((c) => B.includes(c));
}

function sharedTokenCount(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  let n = 0;
  for (const t of ta) if (tb.has(t)) n++;
  return n;
}

/**
 * Group items covering the same event. Input must be newest-first; the newest
 * member leads the cluster, so the wire still reads chronologically.
 */
export function clusterStories<T extends Clusterable>(items: T[], threshold = THRESHOLD): Cluster<T>[] {
  const clusters: Cluster<T>[] = [];
  for (const item of items) {
    const t = Date.parse(item.publishedAt);
    const hit = clusters.find((c) => {
      const lt = Date.parse(c.lead.publishedAt);
      if (Number.isFinite(t) && Number.isFinite(lt) && Math.abs(lt - t) > WINDOW_MS) return false;
      if (sharesCve(c.lead, item)) return true;
      // Tuned for PRECISION, not recall. Merging two unrelated advisories is far
      // worse on this site than leaving a duplicate visible, so headlines that
      // describe the same event in different words (an outlet that never names
      // the malware, say) are deliberately left unclustered.
      return (
        titleSimilarity(c.lead.title, item.title) >= threshold &&
        sharedTokenCount(c.lead.title, item.title) >= MIN_SHARED
      );
    });
    if (hit) hit.others.push(item);
    else clusters.push({ lead: item, others: [] });
  }
  return clusters;
}

/** Stable cluster id for the API, derived from the lead item. */
export function clusterId(lead: Clusterable): string {
  return `skx-cluster-${lead.id.replace(/^(cve:|url:|digest:|spike:)/, "").slice(0, 12).toLowerCase()}`;
}
