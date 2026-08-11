"use client";

import { ACTOR_TYPE_LABEL, mitreUrl } from "@/lib/actors";
import type { Actor } from "@/lib/data/actors";
import { useLocale } from "./locale";

const TYPE_LABEL_EN: Record<string, string> = {
  state: "State-sponsored", ransomware: "Ransomware",
  cybercrime: "Financial crime", hacktivist: "Hacktivist",
};

// The curated country is stored in Azerbaijani; render it in English for EN readers.
const COUNTRY_EN: Record<string, string> = {
  "Rusiya": "Russia", "Çin": "China", "İran": "Iran", "Şimali Koreya": "North Korea",
};

// Rendered inside a dark .ops section on the story page. One card per detected
// group: who they are, how they're attributed, and what they're known for.
export function ThreatActorCard({ actors }: { actors: Actor[] }) {
  const en = useLocale() === "en";
  if (actors.length === 0) return null;
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
        {en ? "Threat actor" : "Təhdid aktoru"}{actors.length > 1 ? ` · ${actors.length}` : ""}
      </h2>
      <div className="mt-4 grid gap-4">
        {actors.map((a) => {
          const url = mitreUrl(a);
          return (
            <div
              key={a.id}
              className="rounded-lg border border-hairline bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-headline text-lg font-semibold text-ink-primary">
                  {a.flag ? `${a.flag} ` : ""}{a.name}
                </span>
                <span className="rounded-full border border-brand/40 bg-brand-wash px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand">
                  {en ? TYPE_LABEL_EN[a.type] ?? a.type : ACTOR_TYPE_LABEL[a.type]}
                </span>
                {a.country && (
                  <span className="font-mono text-[11px] text-ink-muted">
                    {en ? COUNTRY_EN[a.country] ?? a.country : a.country}
                  </span>
                )}
              </div>

              {a.aliases.length > 1 && (
                <p className="mt-2 font-mono text-[11px] text-ink-muted">
                  {en ? "aliases" : "digər adlar"}: {a.aliases.filter((x) => x !== a.name).slice(0, 6).join(" · ")}
                </p>
              )}

              <p className="mt-2.5 text-sm leading-relaxed text-ink-secondary">
                {a.knownFor}
              </p>

              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-brand hover:underline"
                >
                  MITRE ATT&CK · {a.mitre} ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
