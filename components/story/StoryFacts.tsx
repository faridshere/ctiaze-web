import Link from "next/link";
import type { KevRow } from "@/lib/cveintel";
import { categoryName } from "@/lib/taxonomy";
import type { Story } from "@/lib/types";

// The data box: the structured facts of the dispatch on the deeper stock, in
// a 1px ink box, as a definition list. Every row is a field the pipeline,
// CISA or FIRST stated; a field nobody stated prints no row at all. Figures,
// ids, codes and dates are set in mono; words (a severity, a category, a
// gloss) in Archivo, since mono is for figures. Labels are ink-2, not ink-3:
// ink-3 on the deeper stock measures 4.06:1 in the day edition, under AA.
// Sits at the right of the story on a desk, under the deck on a phone.
function epssText(e: number): string {
  const pct = e * 100;
  return `${pct.toFixed(pct >= 10 ? 0 : pct >= 1 ? 1 : 2)}%`;
}

function utcStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

// A figure inside a prose value.
function Fig({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`num font-mono text-[12.5px] text-ink ${className}`}>{children}</span>;
}

// A date never breaks at its hyphen: "added 2026-08-31" is one unit, and the
// line may break only at the middle dots between units.
function Unit({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

export function StoryFacts({
  story,
  kevRows,
  hasSource,
  host,
  code,
}: {
  story: Story;
  /** CISA's row for each of the story's CVEs that is on KEV (dates, ransomware use) */
  kevRows: Map<string, KevRow>;
  hasSource: boolean;
  host: string;
  code: string;
}) {
  const rows: { k: string; v: React.ReactNode }[] = [];
  const cves = story.cveIds.map((c) => c.toUpperCase());

  if (cves.length > 0) {
    rows.push({
      k: cves.length === 1 ? "CVE" : `CVE · ${cves.length}`,
      v: (
        <span className="flex flex-col gap-0.5">
          {cves.map((c) => (
            <Link key={c} href={`/cve/${c}`} className="ulink hover:text-ink">
              <Fig>{c}</Fig>
            </Link>
          ))}
        </span>
      ),
    });
  }
  if (story.cvss != null) rows.push({ k: "CVSS", v: <Fig>{story.cvss.toFixed(1)}</Fig> });
  if (story.epss != null)
    rows.push({
      k: "EPSS",
      v: (
        <>
          <Fig>{epssText(story.epss)}</Fig> · 30-day exploit probability
        </>
      ),
    });
  if (story.severity) rows.push({ k: "Severity", v: story.severity });

  // KEV: the pipeline's flag is the fact; CISA's own dates ride along when the
  // catalogue has the row. A story with CVEs that CISA has not listed says so.
  const kevHits = cves.map((c) => [c, kevRows.get(c)] as const).filter((x): x is readonly [string, KevRow] => !!x[1]);
  if (story.kev || kevHits.length > 0) {
    rows.push({
      k: "KEV",
      v: (
        <span className="flex flex-col gap-0.5">
          <span className="text-stamp">Actively exploited</span>
          {kevHits.map(([c, k]) => (
            <span key={c} className="text-ink-2">
              {kevHits.length > 1 && (
                <>
                  <Fig>{c}</Fig>
                  {" · "}
                </>
              )}
              {k.dateAdded && (
                <Unit>
                  added <Fig>{k.dateAdded}</Fig>
                </Unit>
              )}
              {k.dateAdded && k.dueDate ? " · " : ""}
              {k.dueDate && (
                <Unit>
                  due <Fig>{k.dueDate}</Fig>
                </Unit>
              )}
              {k.ransomware ? " · known ransomware use" : ""}
            </span>
          ))}
        </span>
      ),
    });
  } else if (cves.length > 0) {
    rows.push({ k: "KEV", v: <span className="text-ink-3">not listed</span> });
  }

  rows.push({ k: "Category", v: categoryName(story.category, "en") });
  if (story.region)
    rows.push({
      k: "Region",
      v: (
        <>
          <Fig>AZ</Fig> · Azerbaijan
        </>
      ),
    });
  if (hasSource) {
    rows.push({
      k: "Source",
      v: (
        <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="ulink hover:text-ink" aria-label={`Source: ${host}`}>
          <Fig>{code}</Fig> · <Fig>{host}</Fig> ↗
        </a>
      ),
    });
  }
  if (story.altSources.length > 0)
    rows.push({
      k: "Also carried",
      v: (
        <>
          <Fig>{story.altSources.length}</Fig> outlet{story.altSources.length === 1 ? "" : "s"}
        </>
      ),
    });
  rows.push({ k: "Filed", v: <Fig>{utcStamp(story.publishedAt)}</Fig> });
  if (story.azExposure && story.azExposure.globalCount !== null) {
    rows.push({
      k: "Exposed",
      v: (
        <>
          <Fig>~{story.azExposure.globalCount.toLocaleString("en-US")}</Fig> {story.azExposure.product} worldwide · Shodan
        </>
      ),
    });
  }

  return (
    <aside className="ink-box bg-paper-deep p-5" aria-label="Facts on file">
      <div className="rule-b flex items-baseline justify-between gap-3 pb-2">
        <h2 className="label text-ink">Facts on file</h2>
        <span className="label text-ink-2">as stated</span>
      </div>
      <dl className="divide-y divide-rule-soft">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[6.5rem_1fr] gap-x-3 py-2.5">
            <dt className="label pt-0.5 text-ink-2">{r.k}</dt>
            <dd className="min-w-0 break-words text-[14px] leading-snug text-ink-2">{r.v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
