import { unstable_cache } from "next/cache";

// Primary-source analyst reports (Mandiant, Unit42, CrowdStrike, iDefense …)
// indexed from the public APTnotes/data project. We attach outbound LINKS to a
// dossier where the actor's name/alias appears in a report title — we never
// re-host the PDFs. Cached daily; a fetch failure degrades to no reports.
export type AptReport = { title: string; source: string; url: string; year: string };

const APTNOTES_URL = "https://raw.githubusercontent.com/aptnotes/data/master/APTnotes.json";

const fetchAll = unstable_cache(
  async (): Promise<AptReport[]> => {
    try {
      const r = await fetch(APTNOTES_URL, { signal: AbortSignal.timeout(9000) });
      if (!r.ok) return [];
      const rows: unknown = await r.json();
      if (!Array.isArray(rows)) return [];
      return (rows as Record<string, unknown>[])
        .map((x) => ({
          title: String(x.Title ?? ""),
          source: String(x.Source ?? ""),
          url: String(x.Link ?? ""),
          year: String(x.Year ?? ""),
        }))
        .filter((x) => x.title && /^https?:\/\//.test(x.url));
    } catch {
      return [];
    }
  },
  ["aptnotes-v1"],
  { revalidate: 86400 }
);

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Reports whose title word-matches any of the actor's names/aliases. Aliases must
// be >= 5 chars (a short/ambiguous alias like "APT" would false-match everything).
export async function getActorReports(names: string[], limit = 6): Promise<AptReport[]> {
  const aliases = [...new Set(names.map((n) => (n || "").trim()).filter((n) => n.length >= 5))];
  if (aliases.length === 0) return [];
  const all = await fetchAll();
  if (all.length === 0) return [];
  let re: RegExp;
  try {
    re = new RegExp(`\\b(${aliases.map(esc).join("|")})\\b`, "i");
  } catch {
    return [];
  }
  const hits = all.filter((r) => re.test(r.title));
  hits.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
  const seen = new Set<string>();
  const out: AptReport[] = [];
  for (const h of hits) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
