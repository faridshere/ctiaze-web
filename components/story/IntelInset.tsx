import { Panel } from "@/components/site/Panel";
import { ThreatActorCard } from "@/components/ThreatActorCard";
import { IocPanel } from "@/components/IocPanel";
import { extractIocs, type IocType } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { lookupThreatFox, iocsByMalware, type TfKind } from "@/lib/threatfox";

// Streamed loading state for the Suspense boundary in page.tsx — the article
// text commits immediately; this fills in once the ThreatFox lookups resolve.
export function IntelFallback() {
  return (
    <section className="darkroom mt-10 rounded-[var(--radius-panel)] border border-hairline bg-surface-raised p-5 sm:p-6" aria-busy="true">
      <p role="status" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        <span className="text-accent-good">●</span> loading threat intel…
      </p>
    </section>
  );
}

function tfKindOf(t: IocType): TfKind | null {
  if (t === "ipv4") return "ip";
  if (t === "domain") return "domain";
  if (t === "url") return "url";
  if (t === "sha256" || t === "sha1" || t === "md5") return "hash";
  return null;
}

// Server component so its awaits stream independently of the article body: the
// ThreatFox lookups here can take seconds on a cold index, and the article text
// must never wait on them (see the Suspense boundary around this in page.tsx).
// The cyan limb line marks this as the one panel in the section that carries
// live, cross-checked data rather than the story's own text.
export async function IntelInset({
  extracted,
  actors,
  pivots,
}: {
  extracted: ReturnType<typeof extractIocs>;
  actors: ReturnType<typeof detectActors>;
  pivots: ReturnType<typeof specificPivots>;
}) {
  // Enrich the story's OWN indicators: cross-check each against the live ThreatFox
  // feed so a defender learns which of this article's IOCs are known-malicious and
  // behind what family — enrichment tied to the news, not a generic category dump.
  const repChecks = await Promise.all(
    extracted.map(async (i) => {
      const k = tfKindOf(i.type);
      if (!k) return null;
      const hits = await lookupThreatFox(i.value, k).catch(() => []);
      return hits.length
        ? {
            key: `${i.type}:${i.value.toLowerCase()}`,
            rep: { malware: hits[0].malware, threatType: hits[0].threatType, confidence: hits[0].confidence },
          }
        : null;
    })
  );
  const repMap = new Map(repChecks.filter((x): x is NonNullable<typeof x> => x !== null).map((x) => [x.key, x.rep]));
  const enrichedExtracted = extracted.map((i) => ({
    ...i,
    rep: repMap.get(`${i.type}:${i.value.toLowerCase()}`) ?? null,
  }));

  // The named threat's live infrastructure, from the reliable keyless ThreatFox
  // export filtered by family (server-rendered — no client loading/empty states).
  const familyResult = pivots.length
    ? await iocsByMalware(pivots, 20).catch(() => ({ family: "", hits: [] }))
    : { family: "", hits: [] };
  const familyIocs = familyResult.hits.map((h) => ({
    kind: h.kind,
    ioc: h.ioc,
    malware: h.malware,
    threatType: h.threatType,
    confidence: h.confidence,
    firstSeen: h.firstSeen ?? null,
    reference: h.reference ?? null,
    port: h.port ?? null,
  }));
  const hasIntel = extracted.length > 0 || actors.length > 0 || familyIocs.length > 0;
  if (!hasIntel) return null;

  return (
    <Panel limb className="darkroom mt-10 p-5 sm:p-6">
      {actors.length > 0 && (
        <>
          <ThreatActorCard actors={actors} />
          <div className="my-6 h-px w-full bg-hairline" />
        </>
      )}
      <IocPanel extracted={enrichedExtracted} familyName={familyResult.family} familyIocs={familyIocs} />
    </Panel>
  );
}
