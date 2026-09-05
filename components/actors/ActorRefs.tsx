import { Kicker } from "@/components/site/Kicker";

const MAX_REFS = 10;

function hostnameOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// The roster row's own citation list — every URL a source (MISP galaxy,
// ransomware.live, MITRE) attached to this actor, shown by hostname so a
// reader sees where the dossier's facts came from without a wall of raw URLs.
export function ActorRefs({ refs }: { refs: string[] }) {
  const valid = (refs ?? []).filter((r) => /^https?:\/\//i.test(r));
  if (valid.length === 0) return null;
  const shown = valid.slice(0, MAX_REFS);
  const rest = valid.length - shown.length;

  return (
    <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
      <Kicker>References</Kicker>
      <ul className="mt-5 flex flex-wrap gap-2">
        {shown.map((href, i) => {
          const host = hostnameOf(href);
          if (!host) return null;
          return (
            <li key={`${href}-${i}`}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-hairline px-2 py-1 font-mono text-[11px] text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink-primary"
              >
                {host} ↗
              </a>
            </li>
          );
        })}
        {rest > 0 && <li className="inline-flex items-center px-1 font-mono text-[11px] text-ink-muted">+{rest} more</li>}
      </ul>
    </section>
  );
}
