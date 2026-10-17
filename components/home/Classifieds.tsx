import { LINKS } from "@/lib/site";

// The classifieds: the four ways to follow the wire, each a real route that
// works today, boxed in a double rule. No email form here; that is a
// classified of its own beside the wire.
const ADS = [
  { head: "Telegram", line: "Every dispatch, the moment it is published.", code: "t.me/skopnix", href: LINKS.telegram, ext: true },
  { head: "RSS", line: "For your reader. Add ?kev=1 for only what is actively exploited.", code: LINKS.rss, href: LINKS.rss, ext: false },
  { head: "JSON Feed", line: "The wire as JSON Feed 1.1, with KEV and CVE ids on every item.", code: LINKS.jsonFeed, href: LINKS.jsonFeed, ext: false },
  { head: "STIX", line: "A STIX 2.1 bundle per adversary dossier, for your tooling.", code: "/actors/{slug}/stix.json", href: "/actors", ext: false },
];

export function Classifieds() {
  return (
    <section className="sheet pt-[var(--sp-section)]" aria-labelledby="follow-head">
      <h2 id="follow-head" data-sc className="headline max-w-[20ch] text-[clamp(1.6rem,3vw,2.4rem)] text-ink">
        Grounded to source. Nothing invented.
      </h2>
      <div data-sc="2" className="double-box mt-6 p-[3px]">
        <div className="cells grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {ADS.map((a) => (
            <a
              key={a.head}
              href={a.href}
              target={a.ext ? "_blank" : undefined}
              rel={a.ext ? "noopener noreferrer" : undefined}
              className="group flex flex-col gap-2 p-5 transition-colors hover:bg-paper-deep"
            >
              <span className="label text-ink">
                {a.head} {a.ext ? "↗" : "→"}
              </span>
              <span className="text-[14px] leading-snug text-ink-2">{a.line}</span>
              <code className="num mt-auto pt-3 font-mono text-[11.5px] text-ink-3 [overflow-wrap:anywhere] group-hover:text-ink">{a.code}</code>
            </a>
          ))}
        </div>
      </div>
      <p className="label mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-3">
        <a href={LINKS.api} className="ulink hover:text-ink">
          API docs
        </a>
        <a href={LINKS.llms} className="ulink hover:text-ink">
          llms.txt
        </a>
        <span>No key. No account. No tracking.</span>
      </p>
    </section>
  );
}
