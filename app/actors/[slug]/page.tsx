import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CtaBand } from "@/components/site/CtaBand";
import { KillChain } from "@/components/actors/KillChain";
import { ActorHeader, DOSSIER_SECTION, SectionHead } from "@/components/actors/ActorHeader";
import { ActorTargets } from "@/components/actors/ActorTargets";
import { ActorArsenal } from "@/components/actors/ActorArsenal";
import { ActorVictims } from "@/components/actors/ActorVictims";
import { ActorWire } from "@/components/actors/ActorWire";
import { ActorReports } from "@/components/actors/ActorReports";
import { ActorPulse } from "@/components/actors/ActorPulse";
import { ActorCves } from "@/components/actors/ActorCves";
import { ActorExports } from "@/components/actors/ActorExports";
import { ActorSimilar, type SimilarEntry } from "@/components/actors/ActorSimilar";
import { ActorRefs } from "@/components/actors/ActorRefs";
import { getActorByIdCached, isThinDossier, splitTargets, type ThreatActor, type Ttp } from "@/lib/threatactors";
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
import { getCitationsForActor } from "@/lib/citations-db";
import { storyIdsNeedingSlugs, type CveActorCitationDoc } from "@/lib/citations";
import { getStorySlugsByIds } from "@/lib/stories";
import { paragraphs, jsonLdSafe } from "@/lib/format";
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
  const wire = await getWireMentions().catch(() => null);
  const thin = isThinDossier(a, wire?.byActor[a._id]?.length ?? 0);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
    // No techniques and never on our wire: reachable, but not for the index
    // (and out of the sitemap, lib/threatactors.ts getSitemapActors).
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

// Fixed when this lambda/build warmed rather than read per component: an
// hourly-cached page that computed Date.now() twice could print two different
// "ago" values in the same render (the pattern OnTheWire already uses).
const RENDER_EPOCH = Date.now();

export default async function ActorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActorByIdCached(slug);
  if (!a) notFound();

  // Every source is fetched in parallel and degrades to an empty fallback on
  // its own — one slow/failed collection (e.g. a cold APTnotes fetch) can
  // never take the rest of the dossier down.
  // getCitationsForActor reads every alias id of this actor (nobelium,
  // unc2452 … for apt29); getStorySlugsByIds resolves each quoted dispatch to
  // its full slug, so a dossier quote never links a 12-char prefix.
  const [pack, techniqueRef, ttpProfiles, softwareUsage, wire, reports, citations, storySlugs] = await Promise.all([
    getActorPack(a._id).catch(() => null),
    getTechniqueRef().catch((): TechniqueRef => ({})),
    getTtpProfiles().catch((): TtpProfile[] => []),
    getSoftwareUsage().catch((): SoftwareUsage => ({})),
    getWireMentions().catch((): WireMentions => EMPTY_WIRE),
    getActorReports([a.name, ...(a.aliases || [])]).catch((): AptReport[] => []),
    getCitationsForActor(a._id).catch((): CveActorCitationDoc[] => []),
    getStorySlugsByIds(storyIdsNeedingSlugs(a.cves)).catch(() => new Map<string, string>()),
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
  const sourceWord = (a.sources && a.sources.length ? a.sources : a.source ? [a.source] : []).join(" + ") || undefined;

  const jsonLdDescription = briefText(a, intel);
  const jsonLd = actorArticleLd(a, jsonLdDescription);
  const breadcrumb = breadcrumbLd(a.name, a._id);

  return (
    // overflow-x-clip (not hidden: sticky parts still stick) is a backstop so a
    // strip that overruns a phone's width can never make the page scroll sideways.
    <div className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumb) }} />
      <SiteHeader section="Section B · Adversaries · Dossier" />
      <main id="main">
        <ActorHeader actor={a} mentions={mentions} />

        <ActorPulse activity={a.activity_30d} changes={a.changes} renderedAt={RENDER_EPOCH} />

        {primaryText && (
          <section className={DOSSIER_SECTION} aria-labelledby="brief-head">
            <SectionHead id="brief-head" aside={sourceWord}>
              Analyst brief
            </SectionHead>
            <div className="prose-paper space-y-4 pt-5">
              {paragraphs(primaryText).filter((p) => p.trim().length > 1).map((p, i) => (
                <p key={i} className={i === 0 && /^\p{L}/u.test(p) ? "dropcap" : ""}>
                  {p}
                </p>
              ))}
            </div>
            {intel && <p className="label mt-5 text-ink-3">engine-written, grounded to the sources below</p>}
          </section>
        )}

        {showSourcesState && description && (
          <section className={DOSSIER_SECTION} aria-labelledby="sources-head">
            <SectionHead id="sources-head" aside={sourceWord}>
              What the sources state
            </SectionHead>
            <div className="prose-paper space-y-4 pt-5 text-[15px]">
              {paragraphs(description).filter((p) => p.trim().length > 1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        <ActorTargets origin={a.origin_country?.toUpperCase() ?? null} placed={placed} other={other} sectors={a.targets_sectors ?? []} />

        {techniques.length > 0 && (
          <section className={DOSSIER_SECTION} aria-labelledby="killchain-head">
            <SectionHead id="killchain-head" aside="MITRE ATT&CK Enterprise · tap a technique">
              Kill chain
            </SectionHead>
            <div className="pt-4">
              <KillChain techniques={techniques} notes={pickNotes(techniques, techniqueRef)} profiles={ttpProfiles} />
            </div>
          </section>
        )}

        <ActorArsenal malware={a.malware ?? []} tools={a.tools ?? []} usage={softwareUsage} />
        <ActorCves cves={a.cves ?? []} citations={citations} storySlugs={storySlugs} actorName={a.name} />
        <ActorVictims actor={a} />
        <ActorWire mentions={mentions} />
        <ActorReports reports={reports} />
        <ActorSimilar items={similarItems} />
        <ActorExports id={a._id} techniqueCount={techniques.length} />
        <ActorRefs refs={a.refs ?? []} />

        <div className="mt-14 sm:mt-16">
          <CtaBand
            source="actor:inline"
            heading={`Track ${a.name} on the wire.`}
            blurb="This dossier is already data: the keyless actor API and a STIX 2.1 bundle. Mentions on the wire reach Telegram and RSS as they land."
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
