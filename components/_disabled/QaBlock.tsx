import type { Qa } from "@/lib/_disabled/qa";

// Build the FAQPage structured-data object from the same resolved pairs the
// visible block renders — this is what makes the page eligible for Google's FAQ
// rich result. Emit it through jsonLdSafe (see lib/format) alongside the page's
// existing JSON-LD.
export function faqPageJsonLd(items: Qa[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/**
 * Accessible FAQ built on native <details>/<summary>: keyboard- and
 * screen-reader-friendly with zero client JS, and the answer text is in the DOM
 * (crawlable, reader-mode friendly) even collapsed. ink-signal card styling to
 * match ActorPlaybook; reveals with the site's data-sc motion.
 */
export function QaBlock({ items, en }: { items: Qa[]; en: boolean }) {
  if (!items.length) return null;

  return (
    <section data-sc className="mt-10">
      <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
        {en ? "FAQ" : "Tez-tez verilən suallar"}
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        <span className="font-normal text-ink-muted">{items.length}</span>
      </h2>
      <div className="mt-4 space-y-3">
        {items.map((it, i) => (
          <details
            key={i}
            className="group border border-hairline border-l-2 border-l-brand/60 bg-surface-raised"
            style={{ borderRadius: "var(--radius-chip)" }}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 text-[14px] font-semibold text-ink-primary [&::-webkit-details-marker]:hidden">
              <span>{it.q}</span>
              <span
                aria-hidden
                className="mt-0.5 shrink-0 font-mono text-base leading-none text-brand transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-4 pb-4 text-[14px] leading-relaxed text-ink-secondary">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
