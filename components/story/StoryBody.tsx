import type { KevRow } from "@/lib/cveintel";
import { categoryName } from "@/lib/taxonomy";
import type { Story } from "@/lib/types";
import { completeSentences } from "@/lib/format";

// The deck: the dispatch's summary in Archivo at 18-19px on a 64ch measure,
// the way a newspaper sets the standfirst under a headline. The summary is the
// pipeline's own text; some sources arrive with their markdown still in it
// ("## Summary", `code`), which a paper would never print. The heading
// markers (and a bare "Summary"/"Description" head they introduce) are
// dropped, and backtick spans are set in mono. Nothing is added.
const MD_HEAD = /^\s*#{1,6}\s*(?:summary|description|overview|details|impact)?\s*:?\s*/i;

function cleanDeck(raw: string): string {
  return raw
    .replace(MD_HEAD, "")
    .replace(/\n\s*#{1,6}\s+/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

// Split on backtick spans so `cors.origins` prints as code, not as a stray pair
// of quotes. Unbalanced backticks fall through as plain text.
function withCode(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`\n]+`)/g);
  return parts.map((p, i) =>
    p.length > 2 && p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="font-mono text-[0.86em] text-ink">
        {p.slice(1, -1)}
      </code>
    ) : (
      p
    )
  );
}

function Fig({ children }: { children: React.ReactNode }) {
  return <span className="num font-mono text-[0.86em] text-ink">{children}</span>;
}

// When the pipeline filed no summary (some sources are a title and a link),
// the column must still open with words, not a chart: a one-line deck set
// from the facts that exist — the CVEs, which of them CISA lists and the due
// date it set, the category, and where the write-up is. Every clause is a
// stored field; nothing is paraphrased or inferred.
function FactsDeck({
  story,
  kevRows,
  hasSource,
  host,
}: {
  story: Story;
  kevRows: Map<string, KevRow>;
  hasSource: boolean;
  host: string;
}) {
  const cves = story.cveIds.map((c) => c.toUpperCase());
  const kevIds = cves.filter((c) => kevRows.has(c));
  const dues = [...new Set(kevIds.map((c) => kevRows.get(c)?.dueDate).filter((d): d is string => !!d))];
  const clauses: React.ReactNode[] = [];

  if (cves.length > 0) {
    clauses.push(
      <span key="cve">
        {cves.length === 1 ? "One CVE on file: " : `${cves.length} CVEs on file: `}
        {cves.map((c, i) => (
          <span key={c}>
            {i > 0 && (i === cves.length - 1 ? " and " : ", ")}
            <Fig>{c}</Fig>
          </span>
        ))}
        .
      </span>
    );
  }
  if (kevIds.length > 0) {
    clauses.push(
      <span key="kev">
        {kevIds.map((c, i) => (
          <span key={c}>
            {i > 0 && (i === kevIds.length - 1 ? " and " : ", ")}
            <Fig>{c}</Fig>
          </span>
        ))}
        {kevIds.length === 1 ? " is" : " are"} on CISA KEV
        {dues.length === 1 && (
          <>
            , due <Fig>{dues[0]}</Fig>
          </>
        )}
        .
      </span>
    );
  } else if (story.kev) {
    clauses.push(<span key="kev">Listed by CISA as actively exploited.</span>);
  }
  if (story.cvss != null) {
    clauses.push(
      <span key="cvss">
        CVSS <Fig>{story.cvss.toFixed(1)}</Fig>.
      </span>
    );
  }
  clauses.push(<span key="cat">Filed under {categoryName(story.category, "en")}.</span>);
  if (hasSource) {
    clauses.push(
      <span key="src">
        Write-up at{" "}
        <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="ulink text-ink hover:text-ink">
          {host} ↗
        </a>
      </span>
    );
  }

  return (
    <div className="pt-6">
      <p className="deck max-w-[64ch] text-[18px] sm:text-[19px]">
        {clauses.map((c, i) => (
          <span key={i}>
            {i > 0 && " "}
            {c}
          </span>
        ))}
      </p>
      <p className="label mt-3 text-ink-3">No summary from the source · set from the facts on file</p>
    </div>
  );
}

export function StoryBody({
  story,
  kevRows,
  hasSource,
  host,
}: {
  story: Story;
  kevRows: Map<string, KevRow>;
  hasSource: boolean;
  host: string;
}) {
  const text = cleanDeck(completeSentences(story.summaryEn || story.bodyAz));
  if (!text) return <FactsDeck story={story} kevRows={kevRows} hasSource={hasSource} host={host} />;
  return (
    <div className="pt-6">
      <p className="deck max-w-[64ch] whitespace-pre-line text-[18px] sm:text-[19px]">{withCode(text)}</p>
    </div>
  );
}
