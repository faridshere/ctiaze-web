import { CountUp } from "./CountUp";
import type { DoStats } from "@/lib/dostats";

/**
 * The watch-desk hero — "ink & signal" signature band on the home feed.
 * Editorial and compact: a two-line typographic assembly (CSS line-lift),
 * one honest stat strip (live DB numbers via CountUp), and the Threat Radar
 * feature card with a correctly-pivoted sweeping mini-radar. Server component;
 * the only client bits are CountUp spans.
 */
export function WatchDesk({
  en,
  archive,
  stats,
}: {
  en: boolean;
  archive: number;
  stats: DoStats;
}) {
  const line1 = en ? "WHO IS TARGETING" : "KİM SƏNİ";
  const line2 = en ? "YOU — AND HOW TO STOP THEM." : "HƏDƏF ALIR — VƏ NECƏ DAYANDIRMALI.";
  const sub = en
    ? "Automated Azerbaijani threat intelligence: AI-curated, checked against source, published around the clock."
    : "Avtomatlaşdırılmış Azərbaycan təhdid kəşfiyyatı: AI ilə seçilir, mənbəyə qarşı yoxlanılır, gecə-gündüz dərc olunur.";

  const strip: { v: number; az: string; enL: string }[] = [
    { v: archive, az: "arxiv xəbər", enL: "archived stories" },
    { v: stats.cveExplainers, az: "CVE izahı · AZ+EN", enL: "CVE explainers · AZ+EN" },
    { v: stats.actors, az: "aktor profili", enL: "actor profiles" },
    { v: stats.glossaryTerms, az: "lüğət termini", enL: "glossary terms" },
  ];

  return (
    <section className="border-b border-hairline">
      <div className="mx-auto grid w-full max-w-[75rem] gap-8 px-[var(--sp-gutter)] pb-9 pt-10 md:grid-cols-[1.25fr_minmax(260px,0.75fr)] md:items-center md:pt-14">
        <div>
          <p className="mb-4 flex items-center gap-2.5 font-mono text-[length:var(--t-micro)] font-medium uppercase tracking-[0.28em] text-brand">
            <span aria-hidden className="h-px w-5 bg-brand" />
            {en ? "AZERBAIJAN THREAT INTELLIGENCE" : "AZƏRBAYCANIN TƏHDİD KƏŞFİYYATI"}
          </p>
          <h1 className="font-headline text-[length:var(--t-display)] font-bold uppercase leading-[1.02] tracking-tight text-ink-primary">
            <span className="hl"><span>{line1}</span></span>
            <span className="hl"><span className="text-brand">{line2}</span></span>
          </h1>
          <p className="mt-4 max-w-[52ch] text-[length:var(--t-body)] leading-relaxed text-ink-secondary">
            {sub}
          </p>
        </div>

        {/* Threat Radar feature card — the door into the deep experience */}
        <a
          href="/radar.html"
          data-sc
          className="sweepable group flex items-center gap-4 border border-hairline bg-surface-raised p-4 transition-colors hover:border-brand/40"
          style={{ borderRadius: "var(--radius-chip)" }}
        >
          <svg viewBox="0 0 96 96" className="size-20 shrink-0" aria-hidden focusable="false">
            <circle cx="48" cy="48" r="45" fill="none" stroke="#23262e" strokeWidth="1.5" />
            <circle cx="48" cy="48" r="30" fill="none" stroke="#23262e" strokeWidth="1" />
            <circle cx="48" cy="48" r="15" fill="none" stroke="#23262e" strokeWidth="1" />
            <line x1="48" y1="3" x2="48" y2="93" stroke="#181a20" strokeWidth="1" />
            <line x1="3" y1="48" x2="93" y2="48" stroke="#181a20" strokeWidth="1" />
            <g className="rsweep">
              <path d="M48 48 L48 4 A44 44 0 0 1 76 13.6 Z" fill="rgba(255,90,31,0.16)" />
              <line x1="48" y1="48" x2="48" y2="4" stroke="#ff5a1f" strokeWidth="1.5" />
            </g>
            <circle cx="67" cy="32" r="2.4" fill="#ff4d5e" />
            <circle cx="32" cy="60" r="2" fill="#57b6a6" />
            <circle cx="60" cy="70" r="1.8" fill="#ff5a1f" />
            <circle cx="48" cy="48" r="2.2" fill="#ff5a1f" />
          </svg>
          <span className="min-w-0">
            <span className="block font-headline text-base font-bold uppercase tracking-wide text-ink-primary">
              {en ? "Threat Radar" : "Təhdid Radarı"}
            </span>
            <span className="mt-0.5 block text-[length:var(--t-meta)] leading-snug text-ink-secondary">
              {en
                ? "Pick your sector — see who targets you, their kill-chain, your defenses."
                : "Sektorunu seç — səni kim hədəf alır, hücum zənciri, müdafiən."}
            </span>
            <span className="mt-1.5 block font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted transition-colors group-hover:text-brand">
              {stats.actors > 0
                ? en
                  ? `${stats.actors} groups tracked →`
                  : `${stats.actors} qrup izlənir →`
                : en
                  ? "Open the console →"
                  : "Konsolu aç →"}
            </span>
          </span>
        </a>
      </div>

      {/* Honest stat strip — every figure straight from the database */}
      <div className="border-t border-hairline">
        <dl className="mx-auto grid w-full max-w-[75rem] grid-cols-2 divide-x divide-hairline px-[var(--sp-gutter)] sm:grid-cols-4">
          {strip.map((s, i) => (
            <div key={s.az} data-sc={i > 1 ? "2" : undefined} className="flex flex-col py-4 pl-4 first:pl-0 sm:py-5">
              <dt className="order-2 mt-1 font-mono text-[length:var(--t-micro)] uppercase tracking-widest text-ink-muted">
                {en ? s.enL : s.az}
              </dt>
              <dd className="order-1 font-headline text-2xl font-bold text-ink-primary sm:text-[1.75rem]">
                {s.v > 0 ? <CountUp value={s.v} /> : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
