import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CtaBand } from "@/components/site/CtaBand";
import { Kicker } from "@/components/site/Kicker";
import { Panel } from "@/components/site/Panel";
import { KillChain } from "@/components/actors/KillChain";
import { ActorHeader } from "@/components/actors/ActorHeader";
import { ActorTargets } from "@/components/actors/ActorTargets";
import { ActorArsenal } from "@/components/actors/ActorArsenal";
import { ActorVictims } from "@/components/actors/ActorVictims";
import { ActorWire } from "@/components/actors/ActorWire";
import { ActorReports } from "@/components/actors/ActorReports";
import { ActorSimilar, type SimilarEntry } from "@/components/actors/ActorSimilar";
import { ActorRefs } from "@/components/actors/ActorRefs";
import { getActorByIdCached, splitTargets, type ThreatActor, type Ttp } from "@/lib/threatactors";
import {
  getActorPack,
  getTechniqueRef,
  getTtpProfiles,
  getSoftwareUsage,
  type TechniqueNote,
  type TechniqueRef,
  type TtpProfile,
  type SoftwareUsage,
} from "@/lib/actor-intel";
import { getWireMentions, type WireMentions } from "@/lib/actor-wire";
import { getActorReports, type AptReport } from "@/lib/aptnotes";
import { jsonLdSafe } from "@/lib/format";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;
export const dynamicParams = true;
// Render on demand and cache (ISR) rather than as a per-request function — there
// are too many of these to prerender at build, but caching them keeps crawler
// traffic off Fluid Active CPU.
export async function generateStaticParams() {
  return [];
}

const EMPTY_WIRE: WireMentions = { byActor: {}, recent: [], generatedAt: "" };

// The share/search description: the engine's own analyst brief when we have
// one, the source's own description otherwise — first 200 characters, nothing
// invented to pad it out.
function briefText(a: Pick<ThreatActor, "description_en" | "name">, intel: string | null, max = 200): string {
  const t = (intel || a.description_en || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

function pickNotes(ids: Ttp[], ref: TechniqueRef): Record<string, TechniqueNote> {
  const out: Record<string, TechniqueNote> = {};
  for (const t of ids) {
    const id = t.id.toUpperCase();
    if (ref[id]) out[id] = ref[id];
  }
  return out;
}

// Real overlap with a similar actor — shared ATT&CK technique ids and shared
// malware/tool ids — so "similar" means something a defender can act on, not
// just a nearby point in embedding space.
function sharedCounts(a: ThreatActor, other: ThreatActor | null): { techniques: number; tools: number } {
  if (!other) return { techniques: 0, tools: 0 };
  const aTech = new Set((a.techniques ?? []).map((t) => t.id));
  const bTech = new Set((other.techniques ?? []).map((t) => t.id));
  const techniques = [...aTech].filter((id) => bTech.has(id)).length;
  const aSoft = new Set([...(a.malware ?? []), ...(a.tools ?? [])].map((s) => s.id).filter((x): x is string => !!x));
  const bSoft = new Set(
    [...(other.malware ?? []), ...(other.tools ?? [])].map((s) => s.id).filter((x): x is string => !!x)
  );
  const tools = [...aSoft].filter((id) => bSoft.has(id)).length;
  return { techniques, tools };
}

function actorArticleLd(a: ThreatActor, description: string) {
  const url = absoluteUrl(`/actors/${a._id}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${a.name} — threat actor dossier`,
    about: { "@type": "Thing", name: a.name, alternateName: (a.aliases || []).filter((x) => x !== a.name).slice(0, 8) },
    ...(description ? { description } : {}),
    url,
    mainEntityOfPage: url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    ...(a.last_refreshed ? { dateModified: new Date(a.last_refreshed).toISOString() } : {}),
  };
}

function breadcrumbLd(name: string, id: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Adversaries", item: absoluteUrl("/actors") },
      { "@type": "ListItem", position: 3, name, item: absoluteUrl(`/actors/${id}`) },
    ],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getActorByIdCached(slug);
  // Real 404 for an unknown actor slug (not a 200 soft-404 that crawlers index).
  // getActorByIdCached is cache()-wrapped, so the page body's identical call is free.
  if (!a) notFound();
  const pack = await getActorPack(a._id).catch(() => null);
  const description = briefText(a, pack?.intel ?? null) || `Threat-actor dossier for ${a.name}.`;
  const title = `${a.name} — threat actor dossier`;
  const url = absoluteUrl(`/actors/${a._id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
  };
}

export default async function ActorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActorByIdCached(slug);
  if (!a) notFound();

  // Every source is fetched in parallel and degrades to an empty fallback on
  // its own — one slow/failed collection (e.g. a cold APTnotes fetch) can
  // never take the rest of the dossier down.
  const [pack, techniqueRef, ttpProfiles, softwareUsage, wire, reports] = await Promise.all([
    getActorPack(a._id).catch(() => null),
    getTechniqueRef().catch((): TechniqueRef => ({})),
    getTtpProfiles().catch((): TtpProfile[] => []),
    getSoftwareUsage().catch((): SoftwareUsage => ({})),
    getWireMentions().catch((): WireMentions => EMPTY_WIRE),
    getActorReports([a.name, ...(a.aliases || [])]).catch((): AptReport[] => []),
  ]);

  const similarRaw = (pack?.similar ?? []).slice(0, 5);
  const similarActors = await Promise.all(
    similarRaw.map((s) => getActorByIdCached(s.id).catch((): ThreatActor | null => null))
  );
  const similarItems: SimilarEntry[] = similarRaw.map((s, i) => {
    const other = similarActors[i];
    const { techniques, tools } = sharedCounts(a, other);
    return {
      id: s.id,
      name: s.name,
      score: s.score,
      sigil: other ? { _id: other._id, type: other.type, techniques: other.techniques } : { _id: s.id, type: "unknown" },
      sharedTechniques: techniques,
      sharedTools: tools,
    };
  });

  const mentions = wire.byActor[a._id] ?? [];
  const { placed, other } = splitTargets(a);
  const techniques = a.techniques ?? [];

  // Analyst brief: the engine's grounded write-up when we have one, the
  // source's own description otherwise — never both under the same label,
  // and the "engine-written" footnote only when the text really is engine-written.
  const intel = pack?.intel?.trim() || null;
  const description = a.description_en?.trim() || null;
  const primaryText = intel ?? description;
  const showSourcesState = !!intel && !!description && intel !== description;

  const jsonLdDescription = briefText(a, intel);
  const jsonLd = actorArticleLd(a, jsonLdDescription);
  const breadcrumb = breadcrumbLd(a.name, a._id);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumb) }} />
      <SiteHeader />
      <main id="main">
        <ActorHeader actor={a} mentions={mentions} />

        {primaryText && (
          <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <Panel limb className="p-6 sm:p-8">
              <Kicker>Analyst brief</Kicker>
              <div className="mt-4 max-w-[64ch] space-y-4 text-[15px] leading-relaxed text-ink-secondary">
                {primaryText.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p.trim()}</p>
                ))}
              </div>
              {intel && (
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  engine-written, grounded to the sources below
                </p>
              )}
            </Panel>
          </section>
        )}

        {showSourcesState && description && (
          <section className="mx-auto mt-10 w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <Kicker>What the sources state</Kicker>
            <div className="mt-4 max-w-[64ch] space-y-4 text-[15px] leading-relaxed text-ink-secondary">
              {description.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </section>
        )}

        <ActorTargets origin={a.origin_country?.toUpperCase() ?? null} placed={placed} other={other} sectors={a.targets_sectors ?? []} />

        {techniques.length > 0 && (
          <section className="mx-auto mt-[var(--sp-section)] w-full max-w-[80rem] px-[var(--sp-gutter)]">
            <Kicker>Kill chain</Kicker>
            <div className="mt-5">
              <KillChain techniques={techniques} notes={pickNotes(techniques, techniqueRef)} profiles={ttpProfiles} />
            </div>
          </section>
        )}

        <ActorArsenal malware={a.malware ?? []} tools={a.tools ?? []} usage={softwareUsage} />
        <ActorVictims actor={a} />
        <ActorWire mentions={mentions} />
        <ActorReports reports={reports} />
        <ActorSimilar items={similarItems} />
        <ActorRefs refs={a.refs ?? []} />

        <div className="mt-[var(--sp-section)]">
          <CtaBand
            source="actor:inline"
            heading={`Track ${a.name} on the wire.`}
            blurb="Free early access when the API and MCP server open — every dispatch that names them, as it lands. One email when it's ready."
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
