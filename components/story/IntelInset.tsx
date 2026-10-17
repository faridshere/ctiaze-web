import { ThreatActorCard } from "@/components/ThreatActorCard";
import { IocPanel } from "@/components/IocPanel";
import { extractIocs, type IocType } from "@/lib/ioc";
import { detectActors, specificPivots } from "@/lib/actors";
import { lookupThreatFox, iocsByMalware, type TfKind } from "@/lib/threatfox";
import { RuledSection } from "./Ruled";

// Streamed loading state for the Suspense boundary in page.tsx — the article
// text commits immediately; this fills in once the ThreatFox lookups resolve.
export function IntelFallback() {
  return (
    <RuledSection label="Indicators" meta="checking abuse.ch ThreatFox">
      <p role="status" aria-busy="true" className="label py-4 text-ink-3">
        Checking indicators against ThreatFox…
      </p>
    </RuledSection>
  );
}

// lib/ioc's domain regex accepts any "word.word" token, so a config key quoted
// in a summary ("cors.origins", "service.publicurl") came out as a defanged
// "domain" — invented indicator data on a page that promises nothing invented.
// Before anything prints as a domain or an email here, its last label must be
// a real top-level domain: every two-letter country code, plus the generic
// and sponsored TLDs an indicator is ever likely to use. A name that fails
// the check is dropped, and if nothing survives the inset prints nothing.
// (lib/* is outside this page's files; the check lives here until it moves.)
const GENERIC_TLDS = new Set(
  (
    "com net org info biz edu gov mil int arpa name pro mobi asia tel travel jobs cat coop museum aero post xxx " +
    "io co app dev xyz top site online tech store shop club cloud live news blog email link click download zip mov run work " +
    "wiki host space website win bid trade party review date stream racing loan men cricket science accountant faith gdn ooo icu buzz vip fun " +
    "life world today art design agency company group network systems solutions services digital software center support help care tools zone " +
    "one page studio media video games game team bar cafe pub rest money finance capital bank cash credit cards exchange market trading " +
    "auto car cars casa house homes land estate rent city town guru ninja expert academy school college university education training courses institute " +
    "foundation ltd llc inc limited gmbh lol wtf sucks sex adult cam pics photo photos pictures gallery press report reviews tips guide directory " +
    "rocks cool wow best plus bio fit fitness health clinic dental doctor hospital pharmacy law legal attorney lawyer tax partners ventures holdings " +
    "enterprises industries international global earth solar energy green eco farm garden kitchen recipes coffee wine beer bike moto boats fly flights " +
    "cruises vacations holiday tours hotel hotels rentals apartments build builders construction contractors engineering consulting management marketing " +
    "promo sale deals discount cheap black red blue pink gold silver diamonds jewelry watch shoes clothing fashion style beauty hair skin salon spa " +
    "dog pet pets horse fish bet poker casino bingo lotto church bible christmas wedding events tickets theater film movie music band radio show " +
    "dance fans fan football soccer golf tennis hockey basketball baseball ski surf gay sexy tube chat social community forum how faq works direct " +
    "express delivery shipping cargo logistics taxi limo bus security protection safety shield guard cyber hacker codes code computer data database " +
    "technology electronics mobile phone call sms fax mail web hosting domains server storage backup upload audio voice graphics charity gives giving " +
    "ngo ong mba degree pizza money moe rip sh ms quest monster lat ink ist istanbul moscow london paris berlin tokyo nyc vegas miami africa asia " +
    "cymru wales scot eus gal bzh alsace corsica paris quebec rio sydney melbourne boston chicago okinawa ryukyu nagoya yokohama osaka kyoto " +
    "bond markets autos homes insure lease loans mortgage pay fund vote voting voto earth"
  ).split(/\s+/)
);

function realTld(name: string): boolean {
  const tld = name.toLowerCase().split(".").pop() ?? "";
  return /^[a-z]{2}$/.test(tld) || GENERIC_TLDS.has(tld);
}

// The extracted indicators that may print: domains and emails only with a
// real top-level domain; hashes, IPs, wallets and defanged URLs as extracted.
export function validIndicators(extracted: ReturnType<typeof extractIocs>): ReturnType<typeof extractIocs> {
  return extracted.filter((i) => {
    if (i.type === "domain") return realTld(i.value);
    if (i.type === "email") return realTld(i.value.split("@").pop() ?? "");
    return true;
  });
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
// Set as ONE ruled section with ONE label line — "Indicators · 2", or
// "Adversary" when the dispatch names one, or "Intel inset" when it carries
// both — and the live, cross-checked data under it. The sub-blocks print no
// heads of their own unless two of them share the section.
export async function IntelInset({
  extracted,
  actors,
  pivots,
}: {
  extracted: ReturnType<typeof extractIocs>;
  actors: ReturnType<typeof detectActors>;
  pivots: ReturnType<typeof specificPivots>;
}) {
  const indicators = validIndicators(extracted);

  // Enrich the story's OWN indicators: cross-check each against the live ThreatFox
  // feed so a defender learns which of this article's IOCs are known-malicious and
  // behind what family — enrichment tied to the news, not a generic category dump.
  const repChecks = await Promise.all(
    indicators.map(async (i) => {
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
  const enrichedExtracted = indicators.map((i) => ({
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

  const hasIocs = enrichedExtracted.length > 0 || familyIocs.length > 0;
  const hasActors = actors.length > 0;
  if (!hasIocs && !hasActors) return null;

  const iocCount = enrichedExtracted.length + familyIocs.length;
  const label = hasActors && hasIocs ? "Intel inset" : hasActors ? (actors.length > 1 ? `Adversaries · ${actors.length}` : "Adversary") : `Indicators · ${iocCount}`;
  const meta = hasIocs ? "defanged · cross-checked abuse.ch ThreatFox" : "named in this dispatch";

  return (
    <RuledSection label={label} meta={meta}>
      {hasActors && <ThreatActorCard actors={actors} headed={hasIocs} />}
      {hasIocs && <IocPanel extracted={enrichedExtracted} familyName={familyResult.family} familyIocs={familyIocs} headed={hasActors} />}
    </RuledSection>
  );
}
