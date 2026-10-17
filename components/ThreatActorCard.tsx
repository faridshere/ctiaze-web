"use client";

import Link from "next/link";
import { ACTOR_TYPE_LABEL, mitreUrl } from "@/lib/actors";
import type { Actor } from "@/lib/data/actors";
import type { Locale } from "@/lib/locale";

const TYPE_LABEL_EN: Record<string, string> = {
  state: "State-sponsored", ransomware: "Ransomware",
  cybercrime: "Financial crime", hacktivist: "Hacktivist",
};

// The curated country is stored in Azerbaijani; render it in English for EN readers.
const COUNTRY_EN: Record<string, string> = {
  "Rusiya": "Russia", "Çin": "China", "İran": "Iran", "Şimali Koreya": "North Korea",
};

// The adversaries a dispatch names, as ruled rows inside the intel inset: the
// name in the headline face (pressed harder on hover, as on the roster), the
// type and the assessed origin as a label, the aliases in mono, the MITRE
// ATT&CK group as an underlined link. Wording is the dossier's: "assessed
// origin", never "from". The curated `knownFor` text is written in
// Azerbaijani, so the English page prints the sourced fields only; the AZ
// tools under components/_disabled still get the prose.
// `locale` replaces the old useLocale() context read — the live site always
// passes the default "en"; components/_disabled's Azerbaijani tools can still
// pass "az" explicitly.
// `headed` prints the block's own sub-head; the intel inset passes false when
// this is the only block under its section label, so one head is not stacked
// on another saying the same thing.
export function ThreatActorCard({ actors, locale = "en", headed = true }: { actors: Actor[]; locale?: Locale; headed?: boolean }) {
  const en = locale === "en";
  if (actors.length === 0) return null;
  return (
    <div className="mb-8">
      {headed && (
        <div className="flex items-baseline justify-between gap-3 pt-4">
          <h3 className="label text-ink-3">
            {en ? "Adversary" : "Təhdid aktoru"}
            {actors.length > 1 ? ` · ${actors.length}` : ""}
          </h3>
          <span className="label text-ink-3">{en ? "named in this dispatch" : "bu dispaçda adı çəkilir"}</span>
        </div>
      )}
      <ol className={headed ? "mt-1 border-t border-ink" : ""}>
        {actors.map((a) => {
          const url = mitreUrl(a);
          const origin = a.country ? (en ? COUNTRY_EN[a.country] ?? a.country : a.country) : null;
          const aliases = a.aliases.filter((x) => x !== a.name).slice(0, 6);
          return (
            <li key={a.id} className="row py-3">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Link href={`/actors/${a.id}`} className="min-w-0">
                  <span className="pressed text-[22px] leading-tight text-ink sm:text-[24px]">{a.name}</span>
                </Link>
                <span className="label text-ink-3">
                  {en ? TYPE_LABEL_EN[a.type] ?? a.type : ACTOR_TYPE_LABEL[a.type]}
                  {origin ? ` · ${en ? "assessed origin" : "ehtimal olunan mənşə"} ${origin}` : ""}
                </span>
              </div>
              {aliases.length > 0 && (
                <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">
                  {en ? "aliases" : "digər adlar"} · {aliases.join(" · ")}
                </p>
              )}
              {!en && <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{a.knownFor}</p>}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="label ulink mt-2 inline-block text-ink-3 hover:text-ink">
                  MITRE ATT&amp;CK · {a.mitre} ↗
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
