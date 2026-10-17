import Link from "next/link";
import type { LeadStory } from "@/lib/home-data";
import { categoryName } from "@/lib/taxonomy";
import { completeSentences, stripBoilerplate } from "@/lib/format";
import { RelativeTime } from "./RelativeTime";

// The front-page lead: the newest actively-exploited story, set like a
// newspaper's splash. Everything printed here is a field the pipeline or CISA
// stated; a missing field prints nothing rather than a placeholder. The whole
// front page is set in UTC, like the datelines of a wire, and says so once.
function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// The splash size follows the headline's length: a six-word title is set
// like a front page, a sixty-word advisory title is set like a sub-head.
function headlineSize(title: string): string {
  const n = title.length;
  if (n <= 48) return "text-[clamp(2.2rem,6.2vw,5.75rem)]";
  if (n <= 90) return "text-[clamp(1.9rem,4.6vw,4.2rem)]";
  if (n <= 140) return "text-[clamp(1.6rem,3.4vw,3rem)]";
  return "text-[clamp(1.35rem,2.6vw,2.3rem)]";
}

// A CVE id is the one token a reader copies; it never breaks at its hyphens.
// Sources sometimes print "(ProFTPD ProFTPD)" (vendor and product the same
// word); the splash prints the word once.
export function tidyHeadline(title: string): string {
  return title
    .replace(/\((\w[\w .-]*?) \1\)/g, "($1)")
    .replace(/CVE-\d{4}-\d+/g, (m) => m.replaceAll("-", "‑"));
}

// `as`: the front page's h1 is the stack check's positioning line, so the
// lead is set as an h2 there; the splash looks the same either way.
export function Lead({ lead, as: Heading = "h1" }: { lead: LeadStory; as?: "h1" | "h2" }) {
  const cve = lead.cveIds[0] ?? null;
  // The summary is the engine's own text; a feed that only echoes its source
  // ("submitted by …", "[link] [comments]") prints nothing rather than noise.
  // The engine stores a fixed-length summary, so the deck ends at its last
  // complete sentence rather than mid-word.
  const summaryRaw = completeSentences(stripBoilerplate(lead.summary));
  const summary = summaryRaw.length >= 40 && !/^submitted by/i.test(summaryRaw) ? summaryRaw : "";

  const dateline: React.ReactNode[] = [];
  if (lead.sourceUrl) {
    dateline.push(
      <a key="src" href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="ulink hover:text-ink">
        Source {lead.sourceCode} ↗
      </a>
    );
  }
  if (lead.cvss != null) dateline.push(<span key="cvss">CVSS {lead.cvss.toFixed(1)}</span>);
  if (lead.epss != null) dateline.push(<span key="epss">EPSS {(lead.epss * 100).toFixed(lead.epss >= 0.1 ? 0 : 1)}%</span>);
  if (lead.kevAdded) dateline.push(<span key="added">KEV added {shortDate(lead.kevAdded)}</span>);
  if (lead.kevDue) dateline.push(<span key="due">Due {shortDate(lead.kevDue)}</span>);
  if (lead.ransomware) dateline.push(<span key="rw">Known ransomware use</span>);

  return (
    <article className="relative" data-lead>
      {/* One eyebrow: the filed time, the id, the category, and the stamp on the same line. */}
      <p className="label fade-up flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-3">
        <span className="num normal-case tracking-normal">Filed {hhmm(lead.at)} UTC</span>
        <span className="normal-case tracking-normal">
          · <RelativeTime iso={lead.at} />
        </span>
        {cve && <span>· {cve}</span>}
        <span>· {categoryName(lead.category, "en")}</span>
        {lead.kev && <span className="stamp">Actively exploited</span>}
      </p>

      <Heading className={`headline mt-5 text-ink ${headlineSize(lead.title)}`}>
        <span className="hl">
          <span>
            <Link href={`/news/${lead.slug}`} className="transition-colors hover:text-ink-2">
              {tidyHeadline(lead.title)}
            </Link>
          </span>
        </span>
      </Heading>

      {summary && (
        <p className="deck fade-up mt-6 max-w-[58ch]" style={{ animationDelay: "0.5s" }}>
          {summary}
        </p>
      )}

      {dateline.length > 0 && (
        <p className="fade-up mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-3" style={{ animationDelay: "0.6s" }}>
          {dateline}
        </p>
      )}
    </article>
  );
}
