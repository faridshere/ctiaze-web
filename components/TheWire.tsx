import Link from "next/link";

// The lean wire row — exactly the fields the wire renders, nothing else. The
// homepage maps full stories down to this before caching, so article bodies
// never ride the RSC payload.
export type WireItem = {
  id: string; slug: string; titleEn: string; titleAz: string;
  kev: boolean; severity: string | null; cveIds: string[]; publishedAt: string;
};

// "On the wire, right now" — the real published feed, rendered as a dense
// intelligence wire. Every row is a real story (→ /news/{slug}) with its KEV /
// CVE signal. The homepage's proof that this is live data, not a template.

function relTime(iso: string, en: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}${en ? "m" : "d"}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}${en ? "h" : "s"}`;
  return `${Math.round(h / 24)}${en ? "d" : "g"}`;
}

function Row({ s, en, i }: { s: WireItem; en: boolean; i: number }) {
  const time = relTime(s.publishedAt, en); // server-rendered, revalidates with the page
  const cve = s.cveIds[0];
  return (
    <Link
      href={`/news/${s.slug}`}
      data-sc
      style={{ transitionDelay: `${Math.min(i * 45, 400)}ms` }}
      className="group grid grid-cols-[auto_1fr] items-start gap-3.5 border-b border-hairline py-[15px]"
    >
      <span className="whitespace-nowrap pt-0.5 font-mono text-[length:var(--t-micro)] tabular-nums text-[#79838F]">{time}</span>
      <span>
        <span className="block text-[0.98rem] font-medium leading-snug text-[#EDF1F6] transition-colors group-hover:text-white">
          {en ? s.titleEn : s.titleAz}
        </span>
        <span className="mt-[7px] flex flex-wrap items-center gap-[7px]">
          {s.kev && <Flag className="border-[rgba(255,90,77,0.45)] text-[#FF5A4D]">KEV</Flag>}
          {cve && <Flag className="border-white/[0.15] text-[#79838F]">{cve}</Flag>}
          {!cve && s.severity === "critical" && <Flag className="border-[rgba(255,90,77,0.4)] text-[#FF5A4D]">Critical</Flag>}
        </span>
      </span>
    </Link>
  );
}

function Flag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-[2px] border px-[0.42rem] py-[0.14rem] font-mono text-[0.63rem] uppercase tracking-[0.05em] ${className}`}>
      {children}
    </span>
  );
}

export function TheWire({ stories, en }: { stories: WireItem[]; en: boolean }) {
  const rows = stories.slice(0, 12);
  return (
    <section id="wire" className="mx-auto w-full max-w-[75rem] px-[var(--sp-gutter)] py-[clamp(46px,7vw,82px)]">
      <div data-sc className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold tracking-[-0.02em] text-[#EDF1F6]">
          {en ? "On the wire, right now" : "Xəttin üstündə, indi"}
        </h2>
        <div className="font-mono text-[length:var(--t-micro)] text-[#79838F]">
          {en ? "the last few hours" : "son bir neçə saat"}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-[clamp(24px,4vw,56px)] md:grid-cols-2">
        {rows.map((s, i) => (
          <Row key={s.id} s={s} en={en} i={i} />
        ))}
      </div>
      <div data-sc className="mt-6 flex flex-wrap items-center gap-3.5">
        <Link href="/news" className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.15] bg-[rgba(11,13,19,0.55)] px-4 py-2 font-display text-[length:var(--t-meta)] text-[#EDF1F6] transition-colors hover:border-[#4b5563]">
          {en ? "Open the full feed" : "Tam lenti aç"} →
        </Link>
        <span className="font-mono text-[length:var(--t-micro)] text-[#79838F]">
          {en ? "grounded — nothing fabricated" : "yoxlanılıb — heç nə uydurulmayıb"}
        </span>
      </div>
    </section>
  );
}
