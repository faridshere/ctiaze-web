import { DOSSIER_SECTION, SectionHead } from "./ActorHeader";

const MAX_REFS = 10;
const MAX_PATH = 56;

function parts(href: string): { host: string; path: string } | null {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    let path = `${u.pathname}${u.search}`.replace(/\/$/, "");
    if (path === "" || path === "/") path = "";
    if (path.length > MAX_PATH) path = path.slice(0, MAX_PATH - 1) + "…";
    return { host, path };
  } catch {
    return null;
  }
}

// The dossier's citation list — every URL a source (MISP galaxy,
// ransomware.live, MITRE) attached to this actor, set as numbered footnotes
// in mono so a reader sees where the facts came from without a wall of raw URLs.
export function ActorRefs({ refs }: { refs: string[] }) {
  const valid = (refs ?? []).filter((r) => /^https?:\/\//i.test(r));
  if (valid.length === 0) return null;
  const shown = valid.slice(0, MAX_REFS);
  const rest = valid.length - shown.length;

  return (
    <section className={DOSSIER_SECTION} aria-labelledby="refs-head">
      <SectionHead id="refs-head" aside={`${valid.length} source${valid.length === 1 ? "" : "s"}`}>
        References
      </SectionHead>
      <ol className="pt-2">
        {shown.map((href, i) => {
          const p = parts(href);
          if (!p) return null;
          return (
            // One nowrap line per footnote, cut with an ellipsis at the column's
            // edge: a URL never breaks inside a word, and the arrow keeps its own cell.
            <li key={`${href}-${i}`} className="grid grid-cols-[3ch_minmax(0,max-content)_auto] gap-x-2 border-b border-rule-soft py-1.5 font-mono text-[12px] leading-relaxed">
              <span className="num text-ink-3">{i + 1}.</span>
              <a href={href} target="_blank" rel="noopener noreferrer" className="group min-w-0 truncate text-ink-2 hover:text-ink" title={href}>
                <span className="ulink text-ink">{p.host}</span>
                {p.path && <span className="text-ink-3 group-hover:text-ink-2">{p.path}</span>}
              </a>
              <span aria-hidden className="text-ink-3">↗</span>
            </li>
          );
        })}
        {rest > 0 && <li className="num py-1.5 font-mono text-[12px] text-ink-3">+{rest} more in the JSON record</li>}
      </ol>
    </section>
  );
}
