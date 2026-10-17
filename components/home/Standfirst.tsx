import type { HomeData } from "@/lib/home-data";
import { LINKS } from "@/lib/site";

// The standfirst: what this paper is, in three newspaper columns, each ending
// in a real artefact from the data rather than a claim.
function monthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function Standfirst({ data }: { data: HomeData }) {
  const since = monthYear(data.firstAt);
  const feedTitle = data.lead?.title ?? data.wire[0]?.title ?? null;
  const cols = [
    {
      head: "The wire",
      body: "Every report that matters, read within hours of the source and filed in one line. Actively exploited vulnerabilities are stamped, not buried, and every row links to the outlet that broke it.",
      foot: `${data.week.sources.toLocaleString("en-US")} sources reporting this week`,
    },
    {
      head: "The archive",
      body: "Every dispatch ever published, newest first, each one grounded to the outlet that broke it and to the others that carried it. The edition number on the masthead is the count of this ledger.",
      foot: `${data.total.toLocaleString("en-US")} dispatches${since ? ` · since ${since}` : ""}`,
    },
    {
      head: "The feed",
      body: "The same wire as JSON Feed, RSS and a keyless API, with a STIX bundle for every adversary. Point a reader, a SIEM or an agent at it; nothing here needs an account.",
      foot: null,
      code: feedTitle
        ? `curl -s skopnix.com${LINKS.jsonFeed} | jq -r '.items[0].title'\n${feedTitle}`
        : `curl -s skopnix.com${LINKS.jsonFeed}`,
    },
  ];
  return (
    <section className="sheet pt-[var(--sp-section)]" aria-labelledby="standfirst-head">
      <div className="rule-2" />
      <h2 id="standfirst-head" data-sc className="headline mt-6 max-w-[22ch] text-[clamp(1.75rem,3.6vw,2.9rem)] text-ink">
        The world&apos;s threat reporting, read for you, filed where you can find it.
      </h2>
      <div data-sc="2" className="col-rules mt-8 grid gap-8 md:grid-cols-3 md:gap-6" style={{ "--cols": 3 } as React.CSSProperties}>
        {cols.map((c) => (
          <div key={c.head} className="flex flex-col md:pr-6">
            <h3 className="label rule-b pb-2 text-ink">{c.head}</h3>
            <p className="dropcap mt-4 text-[15.5px] leading-[1.55] text-ink-2">{c.body}</p>
            {c.code ? (
              <pre className="num mt-6 whitespace-pre-wrap border border-rule-soft bg-paper-deep px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                <code>{c.code}</code>
              </pre>
            ) : (
              <p className="num mt-auto pt-6 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-3">{c.foot}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
