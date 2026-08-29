import Link from "next/link";
import type { Story } from "@/lib/types";

// "On the wire, right now" — the real published feed, rendered as a dense
// intelligence wire. Every row is a real story (→ /xeber/{slug}) with its real
// KEV / region / CVE / source signal. This is the homepage's proof that the
// product is live data, not a template.
function sourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Row({ s, en }: { s: Story; en: boolean }) {
  const time = s.publishedAt.slice(11, 16); // HH:MM (UTC, deterministic)
  const src = sourceName(s.sourceUrl);
  const cve = s.cveIds[0];
  return (
    <Link
      href={`/xeber/${s.slug}`}
      className="group grid grid-cols-[auto_1fr] items-start gap-3.5 border-b border-hairline py-[15px]"
    >
      <span className="whitespace-nowrap pt-0.5 font-mono text-[length:var(--t-micro)] tabular-nums text-[#79838F]">{time}</span>
      <span>
        <span className="block text-[0.98rem] font-medium leading-snug text-[#EDF1F6] transition-colors group-hover:text-white">
          {en ? s.titleEn : s.titleAz}
        </span>
        <span className="mt-[7px] flex flex-wrap items-center gap-[7px]">
          {s.kev && <Flag className="border-[rgba(255,90,77,0.45)] text-[#FF5A4D]">KEV</Flag>}
          {s.region && <Flag className="border-[rgba(111,211,230,0.4)] text-[#6FD3E6]">{en ? "Region" : "Region"}</Flag>}
          {cve && <Flag className="border-white/[0.15] text-[#79838F]">{cve}</Flag>}
          {!cve && s.severity === "critical" && <Flag className="border-[rgba(255,90,77,0.4)] text-[#FF5A4D]">Critical</Flag>}
          {src && <Flag className="border-hairline text-[#79838F]">{src}</Flag>}
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

export function TheWire({ stories, en }: { stories: Story[]; en: boolean }) {
  const rows = stories.slice(0, 12);
  return (
    <section id="wire" className="mx-auto w-full max-w-[75rem] px-[var(--sp-gutter)] py-[clamp(46px,7vw,82px)]">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
        <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold tracking-[-0.02em] text-[#EDF1F6]">
          {en ? "On the wire, right now" : "Xəttin üstündə, indi"}
        </h2>
        <div className="font-mono text-[length:var(--t-micro)] text-[#79838F]">
          {en ? "Every line is a queryable object · sources " : "Hər sətir sorğulana bilən obyektdir · mənbələr "}
          <b className="font-normal text-[#9AA6B4]">NVD · CISA KEV · MITRE ATT&amp;CK · ransomware.live · abuse.ch</b>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-[clamp(24px,4vw,56px)] md:grid-cols-2">
        {rows.map((s) => (
          <Row key={s.id} s={s} en={en} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3.5">
        <Link href="/" className="inline-flex items-center gap-2 rounded-[3px] border border-white/[0.15] bg-[rgba(11,13,19,0.55)] px-4 py-2 font-display text-[length:var(--t-meta)] text-[#EDF1F6] transition-colors hover:border-[#4b5563]">
          {en ? "Open the full feed" : "Tam lenti aç"} →
        </Link>
        <span className="font-mono text-[length:var(--t-micro)] text-[#79838F]">
          {en ? "Bilingual (AZ / EN) · grounded against the source, never fabricated" : "İkidilli (AZ / EN) · mənbəyə qarşı yoxlanılır, uydurulmur"}
        </span>
      </div>
    </section>
  );
}
