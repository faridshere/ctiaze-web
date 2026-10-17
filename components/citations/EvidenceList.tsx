import Link from "next/link";
import { relationLabel, type Evidence } from "@/lib/citations";

// The quotes behind one cited actor-to-CVE link, newest first. Every entry is a
// verbatim quote with its source link under it: lib/citations.ts drops any row
// missing either, so this never prints a link without evidence or a claim
// without a source. A quote that does not itself name the actor (the engine
// found the name within ~400 characters of it) says "named nearby" in the
// same line, so a reader can weigh it; rankEvidence lists those last.
export function EvidenceList({ evidence, more }: { evidence: Evidence[]; more: number }) {
  if (evidence.length === 0) return null;
  return (
    <ol className="mt-2 space-y-3">
      {evidence.map((e, i) => (
        <li key={`${e.href}-${i}`}>
          <blockquote className="max-w-[64ch] border-l-2 border-rule-soft pl-3 text-[14px] leading-relaxed text-ink-2">
            &ldquo;{e.quote}&rdquo;
          </blockquote>
          <p className="mt-1 pl-3 font-mono text-[11px] leading-snug text-ink-3">
            <span>{relationLabel(e.relation)}</span>
            {!e.inQuote && (
              <span title="The quote does not name the actor; the source names it nearby, within a few sentences.">
                {" · "}
                <span className="text-ink-2">named nearby</span>
              </span>
            )}
            {" · source: "}
            {e.external ? (
              <a className="ulink break-all hover:text-ink" href={e.href} target="_blank" rel="noopener noreferrer" title={e.href}>
                {e.sourceLabel} ↗
              </a>
            ) : (
              <Link className="ulink hover:text-ink" href={e.href}>
                {e.sourceLabel}
              </Link>
            )}
            {e.date ? <span className="num whitespace-nowrap">{` · ${e.date.slice(0, 10)}`}</span> : null}
          </p>
        </li>
      ))}
      {more > 0 && (
        <li className="pl-3 font-mono text-[11px] text-ink-3">
          + {more} more citation{more === 1 ? "" : "s"} not shown
        </li>
      )}
    </ol>
  );
}
